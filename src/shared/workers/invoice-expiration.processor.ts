import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import { cancelPendingInvoice } from '@/modules/invoice/cancel-pending-invoice'
import { PrismaService } from '@/shared/services/prisma.service'
import { Process, Processor } from '@nestjs/bull'
import { Injectable, Logger } from '@nestjs/common'
import { Job } from 'bull'

// An unpaid invoice expires: cancelled and its PokeCoin discount given back,
// in one transaction and only while it is still PENDING (a payment that lands
// meanwhile wins; see cancelPendingInvoice)
@Processor(BullQueue.INVOICE_EXPIRATION)
@Injectable()
export class InvoiceExpirationProcessor {
  private readonly logger = new Logger(InvoiceExpirationProcessor.name)
  constructor(private readonly prisma: PrismaService) {}

  @Process(BullAction.EXPIRE_INVOICE)
  async handleExpireInvoice(job: Job<{ invoiceId: number }>) {
    const { invoiceId } = job.data
    try {
      const { cancelled, refunded } = await this.prisma.$transaction((tx) =>
        cancelPendingInvoice(tx, invoiceId)
      )
      if (!cancelled) return // paid, already cancelled or gone
      if (refunded > 0) {
        this.logger.log(`Refunded ${refunded} PokeCoin for invoice ${invoiceId}`)
      }
      this.logger.log(`Expired invoice ${invoiceId} after timeout.`)
    } catch (err) {
      this.logger.error(`Failed to expire invoice ${invoiceId}: ${err?.message}`)
      throw err
    }
  }
}
