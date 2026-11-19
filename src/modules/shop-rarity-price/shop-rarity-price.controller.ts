import { I18nService } from '@/i18n/i18n.service'
import { ShopRarityPriceMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
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
  constructor(
    private readonly shopRarityPriceService: ShopRarityPriceService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(ShopRarityPriceMessage.GET_LIST_SUCCESS, lang),
      data: await this.shopRarityPriceService.list(query)
    }
  }

  @Get(':shopRarityPriceId')
  @ZodSerializerDto(GetShopRarityPriceDetailResDTO)
  async findById(
    @Param() params: GetShopRarityPriceParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(ShopRarityPriceMessage.GET_LIST_SUCCESS, lang),
      data: await this.shopRarityPriceService.findById(params.shopRarityPriceId)
    }
  }

  @Post()
  @ZodSerializerDto(CreateShopRarityPriceResDTO)
  async create(
    @Body() body: CreateShopRarityPriceBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(ShopRarityPriceMessage.CREATE_SUCCESS, lang),
      data: await this.shopRarityPriceService.create({
        userId,
        data: body
      })
    }
  }

  @Put(':shopRarityPriceId')
  @ZodSerializerDto(UpdateShopRarityPriceResDTO)
  async update(
    @Body() body: UpdateShopRarityPriceBodyDTO,
    @Param() params: GetShopRarityPriceParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(ShopRarityPriceMessage.UPDATE_SUCCESS, lang),
      data: await this.shopRarityPriceService.update({
        data: body,
        id: params.shopRarityPriceId,
        userId
      })
    }
  }

  @Delete(':shopRarityPriceId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetShopRarityPriceParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.shopRarityPriceService.delete({
      id: params.shopRarityPriceId,
      userId
    })
    return {
      message: this.i18nService.translate(ShopRarityPriceMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
