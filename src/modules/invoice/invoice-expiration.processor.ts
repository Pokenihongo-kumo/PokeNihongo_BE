import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import { Process, Processor } from '@nestjs/bull'
import { Injectable, Logger } from '@nestjs/common'
import { Job } from 'bull'
import { InvoiceService } from './invoice.service'

// An unpaid invoice expires: cancelled and its PokeCoin discount given back,
// in one transaction and only while it is still PENDING (a payment that lands
// meanwhile wins; see InvoiceService.cancelPending)
@Processor(BullQueue.INVOICE_EXPIRATION)
@Injectable()
export class InvoiceExpirationProcessor {
  private readonly logger = new Logger(InvoiceExpirationProcessor.name)
  constructor(private readonly invoiceService: InvoiceService) {}

  @Process(BullAction.EXPIRE_INVOICE)
  async handleExpireInvoice(job: Job<{ invoiceId: number }>) {
    const { invoiceId } = job.data
    try {
      const { cancelled, refunded } = await this.invoiceService.expirePending(invoiceId)
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
