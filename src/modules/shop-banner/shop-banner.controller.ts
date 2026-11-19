import { I18nService } from '@/i18n/i18n.service'
import { ShopBannerMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { AuthenticationGuard } from '@/common/guards/authentication.guard'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { PaginationResponseSchema } from '@/shared/models/response.model'
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards
} from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreatedShopBannerBodyInputDTO,
  CreateShopBannerResDTO,
  GetShopBannerByTodayResDTO,
  GetShopBannerDetailResDTO,
  GetShopBannerParamsDTO,
  UpdateShopBannerBodyInputDTO,
  UpdateShopBannerResDTO
} from './dto/shop-banner.zod-dto'
import { ShopBannerService } from './shop-banner.service'

@Controller('shop-banner')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class ShopBannerController {
  constructor(
    private readonly shopBannerService: ShopBannerService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  async list(
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return {
      message: this.i18nService.translate(ShopBannerMessage.GET_LIST_SUCCESS, lang),
      data: await this.shopBannerService.list(query, lang, roleName)
    }
  }

  @Get('all-pokemon/:shopBannerId')
  @ZodSerializerDto(PaginationResponseSchema)
  async getListAllPokemonWithShopId(
    @Param('shopBannerId') shopBannerId: number,
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(ShopBannerMessage.GET_LIST_SUCCESS, lang),
      data: await this.shopBannerService.getListAllPokemonWithShopId(shopBannerId, query)
    }
  }

  @Get('all/details')
  @ZodSerializerDto(PaginationResponseSchema)
  async listwithDetail(
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return {
      message: this.i18nService.translate(ShopBannerMessage.GET_LIST_SUCCESS, lang),
      data: await this.shopBannerService.listwithDetail(query, lang, roleName)
    }
  }

  @Get('today/user')
  @ZodSerializerDto(GetShopBannerByTodayResDTO)
  async getByToday(@I18nLang() lang: string, @ActiveUser('userId') userId?: number) {
    return {
      message: this.i18nService.translate(ShopBannerMessage.GET_LIST_SUCCESS, lang),
      data: await this.shopBannerService.getByToday(lang, userId)
    }
  }

  @Get(':shopBannerId')
  @ZodSerializerDto(GetShopBannerDetailResDTO)
  async findById(
    @Param() params: GetShopBannerParamsDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return {
      message: this.i18nService.translate(ShopBannerMessage.GET_SUCCESS, lang),
      data: await this.shopBannerService.findById(params.shopBannerId, lang, roleName)
    }
  }

  @Post()
  @ZodSerializerDto(CreateShopBannerResDTO)
  async create(
    @Body() body: CreatedShopBannerBodyInputDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(ShopBannerMessage.CREATE_SUCCESS, lang),
      data: await this.shopBannerService.create({
        data: body,
        createdById: userId
      })
    }
  }

  @Put(':shopBannerId')
  @ZodSerializerDto(UpdateShopBannerResDTO)
  async update(
    @Body() body: UpdateShopBannerBodyInputDTO,
    @Param() params: GetShopBannerParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(ShopBannerMessage.UPDATE_SUCCESS, lang),
      data: await this.shopBannerService.update({
        data: body,
        id: params.shopBannerId,
        updatedById: userId
      })
    }
  }

  @Delete(':shopBannerId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetShopBannerParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.shopBannerService.delete({
      id: params.shopBannerId,
      deletedById: userId
    })
    return {
      message: this.i18nService.translate(ShopBannerMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
