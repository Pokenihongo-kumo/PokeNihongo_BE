import { ResponseMessage } from '@/i18n/response-message'
import { ShopPurchaseMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateShopPurchaseBodyDTO,
  CreateShopPurchaseResDTO,
  GetShopPurchaseDetailResDTO,
  GetShopPurchaseListResDTO,
  GetShopPurchaseParamsDTO,
  UpdateShopPurchaseBodyDTO,
  UpdateShopPurchaseResDTO
} from './dto/shop-purchase.dto'
import { ShopPurchaseService } from './shop-purchase.service'

@Controller('shop-purchase')
export class ShopPurchaseController {
  constructor(private readonly shopPurchaseService: ShopPurchaseService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(ShopPurchaseMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.shopPurchaseService.list(query)
  }

  @Get('user')
  @ZodSerializerDto(GetShopPurchaseListResDTO)
  @ResponseMessage(ShopPurchaseMessage.GET_LIST_SUCCESS)
  async getByUser(@ActiveUser('userId') userId: number) {
    return this.shopPurchaseService.getByUser(userId)
  }

  @Get(':shopPurchaseId')
  @ZodSerializerDto(GetShopPurchaseDetailResDTO)
  @ResponseMessage(ShopPurchaseMessage.GET_LIST_SUCCESS)
  async findById(
    @Param() params: GetShopPurchaseParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.shopPurchaseService.findById(params.shopPurchaseId)
  }

  @Post()
  @ZodSerializerDto(CreateShopPurchaseResDTO)
  @ResponseMessage(ShopPurchaseMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreateShopPurchaseBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.shopPurchaseService.create({
      userId,
      data: body
    })
  }

  @Put(':shopPurchaseId')
  @ZodSerializerDto(UpdateShopPurchaseResDTO)
  @ResponseMessage(ShopPurchaseMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateShopPurchaseBodyDTO,
    @Param() params: GetShopPurchaseParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.shopPurchaseService.update({
      data: body,
      id: params.shopPurchaseId,
      userId
    })
  }

  @Delete(':shopPurchaseId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(ShopPurchaseMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetShopPurchaseParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.shopPurchaseService.delete({
      id: params.shopPurchaseId,
      userId
    })
  }
}
