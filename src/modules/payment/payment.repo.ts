import { InvoiceStatus } from '@/common/constants/invoice.constant'
import { UserSubscriptionStatus } from '@/common/constants/subscription.constant'
import { addTimeUTC } from '@/shared/helpers'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { CreatePaymentType, PaymentType } from './entities/payment.model'

@Injectable()
export class PaymentRepo {
  constructor(private prisma: PrismaService) {}
  // Payment CRUD operations
  async createPayment(data: CreatePaymentType): Promise<PaymentType> {
    return this.prisma.payment.create({
      data
    })
  }

  async findPaymentByPayOSOrderId(payosOrderId: string): Promise<PaymentType | null> {
    return this.prisma.payment.findFirst({
      where: {
        payosOrderId,
        deletedAt: null
      }
    })
  }

  async updatePayment(id: number, data: Prisma.PaymentUpdateInput): Promise<PaymentType> {
    return this.prisma.payment.update({
      where: { id },
      data
    })
  }

  async findLatestPendingByInvoice(invoiceId: number): Promise<PaymentType | null> {
    return this.prisma.payment.findFirst({
      where: {
        invoiceId,
        status: 'PENDING',
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * PAID once, plan granted in the same transaction (ADR D1 §1): the payment
   * moves to PAID only from a state that is not already PAID/REFUNDED, its
   * invoice to PAID, and the invoice's subscription is created or activated.
   * Any failure rolls all of it back, so a later callback can grant again.
   * Returns false when another request got there first (nothing granted twice).
   */
  async markInvoicePaidOnce(paymentId: number, invoiceId: number): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.payment.updateMany({
        where: { id: paymentId, status: { notIn: ['PAID', 'REFUNDED'] } },
        data: { status: 'PAID', paidAt: new Date() }
      })
      if (count === 0) return false
      const invoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.PAID },
        include: { subscriptionPlan: true }
      })
      const plan = invoice.subscriptionPlan
      const startDate = addTimeUTC(new Date(), 0)
      const expiresAt =
        plan.type === 'RECURRING' && plan.durationInDays
          ? addTimeUTC(startDate, plan.durationInDays * 24 * 60 * 60 * 1000)
          : null
      const active = { startDate, expiresAt, status: UserSubscriptionStatus.ACTIVE }
      const existing = await tx.userSubscription.findUnique({ where: { invoiceId } })
      if (!existing) {
        await tx.userSubscription.create({
          data: {
            userId: invoice.userId,
            subscriptionPlanId: plan.id,
            invoiceId,
            createdById: invoice.userId,
            ...active
          }
        })
      } else if (existing.status !== UserSubscriptionStatus.ACTIVE) {
        await tx.userSubscription.update({ where: { id: existing.id }, data: active })
      }
      return true
    })
  }

  /**
   * PayOS closed a payment link. In one transaction: the payment moves
   * PENDING -> CANCELLED/FAILED/EXPIRED (never from PAID); its invoice is
   * cancelled only while still PENDING, and its subscription marked
   * PAYMENT_FAILED only while PENDING_PAYMENT. An invoice another link paid
   * (or is paying: markInvoicePaidOnce holds its row) is left alone.
   * Returns false when the payment was not pending (nothing changed).
   */
  async closePendingPayment(
    id: number,
    invoiceId: number,
    data: { status: 'CANCELLED' | 'FAILED' | 'EXPIRED'; failureReason: string }
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.updateMany({
        where: { id, status: 'PENDING' },
        data
      })
      if (payment.count === 0) return false
      const invoice = await tx.invoice.updateMany({
        where: { id: invoiceId, status: InvoiceStatus.PENDING },
        data: { status: InvoiceStatus.CANCELLED }
      })
      if (invoice.count === 1) {
        await tx.userSubscription.updateMany({
          where: { invoiceId, status: 'PENDING_PAYMENT' },
          data: { status: 'PAYMENT_FAILED' }
        })
      }
      return true
    })
  }
}
