import { InvoiceStatus } from '@/common/constants/invoice.constant'
import { UserSubscriptionStatus } from '@/common/constants/subscription.constant'
import {
  walletPurposeType,
  WalletTransactionSourceType,
  WalletTransactionType
} from '@/common/constants/wallet-transaction.constant'
import { walletType } from '@/common/constants/wallet.constant'
import { Prisma } from '@prisma/client'

/**
 * Cancels an invoice that is still PENDING, inside the caller's transaction
 * (ADR D1 §3). Shared by the expiration job and the PayOS cancel callback.
 * Only the call that moves the invoice PENDING -> CANCELLED goes on: its
 * subscription PENDING_PAYMENT -> PAYMENT_FAILED and the PokeCoin discount is
 * given back. A paid invoice, or one another call already cancelled, is left
 * alone, so the coins come back exactly once.
 */
export async function cancelPendingInvoice(
  tx: Prisma.TransactionClient,
  invoiceId: number
): Promise<{ cancelled: boolean; refunded: number }> {
  const { count } = await tx.invoice.updateMany({
    where: { id: invoiceId, status: InvoiceStatus.PENDING },
    data: { status: InvoiceStatus.CANCELLED }
  })
  if (count === 0) return { cancelled: false, refunded: 0 }

  await tx.userSubscription.updateMany({
    where: { invoiceId, status: UserSubscriptionStatus.PENDING_PAYMENT },
    data: { status: UserSubscriptionStatus.PAYMENT_FAILED }
  })

  const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } })
  if (invoice.discountAmount <= 0) return { cancelled: true, refunded: 0 }

  // The coins were taken from this wallet when the invoice was created
  const wallet = await tx.wallet.upsert({
    where: { userId_type: { userId: invoice.userId, type: walletType.POKE_COINS } },
    create: {
      userId: invoice.userId,
      type: walletType.POKE_COINS,
      balance: invoice.discountAmount
    },
    update: { balance: { increment: invoice.discountAmount } }
  })
  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      userId: invoice.userId,
      purpose: walletPurposeType.REFUND,
      referenceId: invoice.id,
      amount: invoice.discountAmount,
      type: WalletTransactionType.INCREASE,
      source: WalletTransactionSourceType.ADMIN_ADJUST,
      description: null,
      createdById: invoice.userId
    }
  })
  return { cancelled: true, refunded: invoice.discountAmount }
}
