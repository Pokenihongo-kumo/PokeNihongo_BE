import { InvoiceStatus } from '@/common/constants/invoice.constant'
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
   * PAID once: the payment moves to PAID only from a state that is not already
   * PAID/REFUNDED, in the same transaction as its invoice. Returns false when
   * another request got there first, so the caller grants nothing twice.
   */
  async markInvoicePaidOnce(paymentId: number, invoiceId: number): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.payment.updateMany({
        where: { id: paymentId, status: { notIn: ['PAID', 'REFUNDED'] } },
        data: { status: 'PAID', paidAt: new Date() }
      })
      if (count === 0) return false
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.PAID }
      })
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
