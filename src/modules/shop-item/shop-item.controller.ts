import { ResponseMessage } from '@/i18n/response-message'
import { ShopItemMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateShopItemBodyDTO,
  CreateShopItemResDTO,
  CreateWithListItemBodyDTO,
  CreateWithListItemResDTO,
  GetRamdomAmountShopItemBodyDTO,
  GetRandomShopItemResDTO,
  GetShopItemDetailResDTO,
  GetShopItemParamsDTO,
  UpdateShopItemBodyDTO,
  UpdateShopItemResDTO,
  UpdateWithListItemBodyDTO,
  UpdateWithListItemResDTO
} from './dto/shop-item.dto'
import { ShopItemService } from './shop-item.service'

@Controller('shop-item')
export class ShopItemController {
  constructor(private readonly shopItemService: ShopItemService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(ShopItemMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.shopItemService.list(query)
  }

  @Get('random')
  @ZodSerializerDto(GetRandomShopItemResDTO)
  @ResponseMessage(ShopItemMessage.GET_SUCCESS)
  async getRandomListItem(
    @Query() query: GetRamdomAmountShopItemBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.shopItemService.getRandomListItem(query)
  }

  @Get(':shopItemId')
  @ZodSerializerDto(GetShopItemDetailResDTO)
  @ResponseMessage(ShopItemMessage.GET_LIST_SUCCESS)
  async findById(
    @Param() params: GetShopItemParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.shopItemService.findById(params.shopItemId)
  }

  @Post('list')
  @ZodSerializerDto(CreateWithListItemResDTO)
  @ResponseMessage(ShopItemMessage.CREATE_SUCCESS)
  async createByList(
    @Body() body: CreateWithListItemBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.shopItemService.createByList({
      userId,
      data: body
    })
  }

  @Post()
  @ZodSerializerDto(CreateShopItemResDTO)
  @ResponseMessage(ShopItemMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreateShopItemBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.shopItemService.create({
      userId,
      data: body
    })
  }

  @Put('list')
  @ZodSerializerDto(UpdateWithListItemResDTO)
  @ResponseMessage(ShopItemMessage.UPDATE_SUCCESS)
  async updateByList(
    @Body() body: UpdateWithListItemBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.shopItemService.updateByList({
      userId,
      data: body
    })
  }

  @Put(':shopItemId')
  @ZodSerializerDto(UpdateShopItemResDTO)
  @ResponseMessage(ShopItemMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateShopItemBodyDTO,
    @Param() params: GetShopItemParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.shopItemService.update({
      data: body,
      id: params.shopItemId,
      userId
    })
  }

  @Delete(':shopItemId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(ShopItemMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetShopItemParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.shopItemService.delete({
      id: params.shopItemId,
      userId
    })
  }
}
