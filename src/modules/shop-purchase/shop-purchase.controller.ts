import { I18nService } from '@/i18n/i18n.service'
import { ShopPurchaseMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
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
  constructor(
    private readonly shopPurchaseService: ShopPurchaseService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(ShopPurchaseMessage.GET_LIST_SUCCESS, lang),
      data: await this.shopPurchaseService.list(query)
    }
  }

  @Get('user')
  @ZodSerializerDto(GetShopPurchaseListResDTO)
  async getByUser(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(ShopPurchaseMessage.GET_LIST_SUCCESS, lang),
      data: await this.shopPurchaseService.getByUser(userId)
    }
  }

  @Get(':shopPurchaseId')
  @ZodSerializerDto(GetShopPurchaseDetailResDTO)
  async findById(
    @Param() params: GetShopPurchaseParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(ShopPurchaseMessage.GET_LIST_SUCCESS, lang),
      data: await this.shopPurchaseService.findById(params.shopPurchaseId)
    }
  }

  @Post()
  @ZodSerializerDto(CreateShopPurchaseResDTO)
  async create(
    @Body() body: CreateShopPurchaseBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(ShopPurchaseMessage.CREATE_SUCCESS, lang),
      data: await this.shopPurchaseService.create({
        userId,
        data: body
      })
    }
  }

  @Put(':shopPurchaseId')
  @ZodSerializerDto(UpdateShopPurchaseResDTO)
  async update(
    @Body() body: UpdateShopPurchaseBodyDTO,
    @Param() params: GetShopPurchaseParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(ShopPurchaseMessage.UPDATE_SUCCESS, lang),
      data: await this.shopPurchaseService.update({
        data: body,
        id: params.shopPurchaseId,
        userId
      })
    }
  }

  @Delete(':shopPurchaseId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetShopPurchaseParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.shopPurchaseService.delete({
      id: params.shopPurchaseId,
      userId
    })
    return {
      message: this.i18nService.translate(ShopPurchaseMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
