import { InvoiceStatus } from '@/common/constants/invoice.constant'
import { UserSubscriptionStatus } from '@/common/constants/subscription.constant'
import { addTimeUTC, isUniqueConstraintPrismaError } from '@/shared/helpers'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { Prisma, PrismaClient } from '@prisma/client'
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

  /**
   * One open link per invoice (ADR D1 §2): expires the invoice's PENDING
   * payments that are past their expiry, then inserts the new PENDING payment.
   * Returns null when the invoice still has an open one (the partial unique
   * index "Payment_invoiceId_pending_key" refuses a second): the caller hands
   * that one out instead of creating another PayOS link.
   */
  async reservePendingPayment(data: CreatePaymentType): Promise<PaymentType | null> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.payment.updateMany({
          where: {
            invoiceId: data.invoiceId,
            status: 'PENDING',
            OR: [{ expiredAt: null }, { expiredAt: { lte: new Date() } }]
          },
          data: { status: 'EXPIRED', failureReason: 'Payment link expired' }
        })
        return tx.payment.create({ data })
      })
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) return null
      throw error
    }
  }

  // The PayOS link of a reserved payment could not be created: free the slot
  async failReservedPayment(id: number, failureReason: string): Promise<void> {
    await this.prisma.payment.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'FAILED', failureReason }
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

  withTransaction<T>(callback: (prismaTx: PrismaClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(callback)
  }

  // PENDING -> CANCELLED/FAILED/EXPIRED (never from PAID); false when the
  // payment was not pending (nothing changed)
  async closeIfPending(
    id: number,
    data: { status: 'CANCELLED' | 'FAILED' | 'EXPIRED'; failureReason: string },
    prismaTx: PrismaClient
  ): Promise<boolean> {
    const payment = await prismaTx.payment.updateMany({
      where: { id, status: 'PENDING' },
      data
    })
    return payment.count > 0
  }
}
