import { I18nService } from '@/i18n/i18n.service'
import { ShopItemMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
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
  constructor(
    private readonly shopItemService: ShopItemService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(ShopItemMessage.GET_LIST_SUCCESS, lang),
      data: await this.shopItemService.list(query)
    }
  }

  @Get('random')
  @ZodSerializerDto(GetRandomShopItemResDTO)
  async getRandomListItem(
    @Query() query: GetRamdomAmountShopItemBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(ShopItemMessage.GET_SUCCESS, lang),
      data: await this.shopItemService.getRandomListItem(query)
    }
  }

  @Get(':shopItemId')
  @ZodSerializerDto(GetShopItemDetailResDTO)
  async findById(
    @Param() params: GetShopItemParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(ShopItemMessage.GET_LIST_SUCCESS, lang),
      data: await this.shopItemService.findById(params.shopItemId)
    }
  }

  @Post('list')
  @ZodSerializerDto(CreateWithListItemResDTO)
  async createByList(
    @Body() body: CreateWithListItemBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(ShopItemMessage.CREATE_SUCCESS, lang),
      data: await this.shopItemService.createByList({
        userId,
        data: body
      })
    }
  }

  @Post()
  @ZodSerializerDto(CreateShopItemResDTO)
  async create(
    @Body() body: CreateShopItemBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(ShopItemMessage.CREATE_SUCCESS, lang),
      data: await this.shopItemService.create({
        userId,
        data: body
      })
    }
  }

  @Put('list')
  @ZodSerializerDto(UpdateWithListItemResDTO)
  async updateByList(
    @Body() body: UpdateWithListItemBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(ShopItemMessage.UPDATE_SUCCESS, lang),
      data: await this.shopItemService.updateByList({
        userId,
        data: body
      })
    }
  }

  @Put(':shopItemId')
  @ZodSerializerDto(UpdateShopItemResDTO)
  async update(
    @Body() body: UpdateShopItemBodyDTO,
    @Param() params: GetShopItemParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(ShopItemMessage.UPDATE_SUCCESS, lang),
      data: await this.shopItemService.update({
        data: body,
        id: params.shopItemId,
        userId
      })
    }
  }

  @Delete(':shopItemId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetShopItemParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.shopItemService.delete({
      id: params.shopItemId,
      userId
    })
    return {
      message: this.i18nService.translate(ShopItemMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
