import { ResponseMessage } from '@/i18n/response-message'
import { ShopRarityPriceMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateShopRarityPriceBodyDTO,
  CreateShopRarityPriceResDTO,
  GetShopRarityPriceDetailResDTO,
  GetShopRarityPriceParamsDTO,
  UpdateShopRarityPriceBodyDTO,
  UpdateShopRarityPriceResDTO
} from './dto/shop-rarity-price.dto'
import { ShopRarityPriceService } from './shop-rarity-price.service'

@Controller('shop-rarity-price')
export class ShopRarityPriceController {
  constructor(private readonly shopRarityPriceService: ShopRarityPriceService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(ShopRarityPriceMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.shopRarityPriceService.list(query)
  }

  @Get(':shopRarityPriceId')
  @ZodSerializerDto(GetShopRarityPriceDetailResDTO)
  @ResponseMessage(ShopRarityPriceMessage.GET_LIST_SUCCESS)
  async findById(
    @Param() params: GetShopRarityPriceParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.shopRarityPriceService.findById(params.shopRarityPriceId)
  }

  @Post()
  @ZodSerializerDto(CreateShopRarityPriceResDTO)
  @ResponseMessage(ShopRarityPriceMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreateShopRarityPriceBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.shopRarityPriceService.create({
      userId,
      data: body
    })
  }

  @Put(':shopRarityPriceId')
  @ZodSerializerDto(UpdateShopRarityPriceResDTO)
  @ResponseMessage(ShopRarityPriceMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateShopRarityPriceBodyDTO,
    @Param() params: GetShopRarityPriceParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.shopRarityPriceService.update({
      data: body,
      id: params.shopRarityPriceId,
      userId
    })
  }

  @Delete(':shopRarityPriceId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(ShopRarityPriceMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetShopRarityPriceParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.shopRarityPriceService.delete({
      id: params.shopRarityPriceId,
      userId
    })
  }
}
