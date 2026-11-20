import { ResponseMessage } from '@/i18n/response-message'
import { InvoiceMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { CreateInvoiceBodyDTO } from '@/modules/invoice/dto/invoice.dto'
import { Body, Controller, Post } from '@nestjs/common'
import { PaymentService } from './payment.service'

// POST /invoice (mobile subscription screen): the invoice, then its payment
// link. Served here so the invoice module does not depend on payment (B5);
// the route, body and response are unchanged.
@Controller('invoice')
export class InvoiceCheckoutController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ResponseMessage(InvoiceMessage.CREATE_SUCCESS)
  async create(@Body() body: CreateInvoiceBodyDTO, @ActiveUser('userId') userId: number) {
    return this.paymentService.checkoutNewInvoice({ userId, data: body })
  }
}
