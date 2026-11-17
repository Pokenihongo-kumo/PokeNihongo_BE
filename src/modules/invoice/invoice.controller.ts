import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  GetInvoiceDetailResDTO,
  GetInvoiceParamsDTO,
  UpdateInvoiceBodyDTO,
  UpdateInvoiceResDTO
} from './dto/invoice.dto'
import { InvoiceService } from './invoice.service'

@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.invoiceService.list(query, lang)
  }

  @Get(':invoiceId')
  @ZodSerializerDto(GetInvoiceDetailResDTO)
  findById(
    @Param() params: GetInvoiceParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.invoiceService.findById(params.invoiceId, lang)
  }
  // POST /invoice is served by InvoiceCheckoutController (payment module): it
  // creates the invoice, then opens its payment link

  @Put(':invoiceId')
  @ZodSerializerDto(UpdateInvoiceResDTO)
  update(
    @Body() body: UpdateInvoiceBodyDTO,
    @Param() params: GetInvoiceParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.invoiceService.update(
      {
        data: body,
        id: params.invoiceId,
        userId
      },
      lang
    )
  }

  @Delete(':invoiceId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetInvoiceParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.invoiceService.delete(
      {
        id: params.invoiceId,
        userId
      },
      lang
    )
  }
}
