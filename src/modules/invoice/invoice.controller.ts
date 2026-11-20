import { ResponseMessage } from '@/i18n/response-message'
import { InvoiceMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
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
  @ResponseMessage(InvoiceMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.invoiceService.list(query)
  }

  @Get(':invoiceId')
  @ZodSerializerDto(GetInvoiceDetailResDTO)
  @ResponseMessage(InvoiceMessage.GET_LIST_SUCCESS)
  async findById(
    @Param() params: GetInvoiceParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.invoiceService.findById(params.invoiceId)
  }
  // POST /invoice is served by InvoiceCheckoutController (payment module): it
  // creates the invoice, then opens its payment link

  @Put(':invoiceId')
  @ZodSerializerDto(UpdateInvoiceResDTO)
  @ResponseMessage(InvoiceMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateInvoiceBodyDTO,
    @Param() params: GetInvoiceParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.invoiceService.update({
      data: body,
      id: params.invoiceId,
      userId
    })
  }

  @Delete(':invoiceId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(InvoiceMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetInvoiceParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.invoiceService.delete({
      id: params.invoiceId,
      userId
    })
  }
}
