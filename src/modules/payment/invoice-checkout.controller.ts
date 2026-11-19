import { I18nService } from '@/i18n/i18n.service'
import { InvoiceMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { CreateInvoiceBodyDTO } from '@/modules/invoice/dto/invoice.dto'
import { Body, Controller, Post } from '@nestjs/common'
import { PaymentService } from './payment.service'

// POST /invoice (mobile subscription screen): the invoice, then its payment
// link. Served here so the invoice module does not depend on payment (B5);
// the route, body and response are unchanged.
@Controller('invoice')
export class InvoiceCheckoutController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly i18nService: I18nService
  ) {}

  @Post()
  async create(
    @Body() body: CreateInvoiceBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(InvoiceMessage.CREATE_SUCCESS, lang),
      data: await this.paymentService.checkoutNewInvoice({ userId, data: body })
    }
  }
}
