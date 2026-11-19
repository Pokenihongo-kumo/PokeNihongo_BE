import { I18nService } from '@/i18n/i18n.service'
import { InvoiceMessage } from '@/i18n/message-keys'
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
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(InvoiceMessage.GET_LIST_SUCCESS, lang),
      data: await this.invoiceService.list(query)
    }
  }

  @Get(':invoiceId')
  @ZodSerializerDto(GetInvoiceDetailResDTO)
  async findById(
    @Param() params: GetInvoiceParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(InvoiceMessage.GET_LIST_SUCCESS, lang),
      data: await this.invoiceService.findById(params.invoiceId)
    }
  }
  // POST /invoice is served by InvoiceCheckoutController (payment module): it
  // creates the invoice, then opens its payment link

  @Put(':invoiceId')
  @ZodSerializerDto(UpdateInvoiceResDTO)
  async update(
    @Body() body: UpdateInvoiceBodyDTO,
    @Param() params: GetInvoiceParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(InvoiceMessage.UPDATE_SUCCESS, lang),
      data: await this.invoiceService.update({
        data: body,
        id: params.invoiceId,
        userId
      })
    }
  }

  @Delete(':invoiceId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetInvoiceParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.invoiceService.delete({
      id: params.invoiceId,
      userId
    })
    return {
      message: this.i18nService.translate(InvoiceMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
