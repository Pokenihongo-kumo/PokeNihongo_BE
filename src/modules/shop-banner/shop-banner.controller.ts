import { ResponseMessage } from '@/i18n/response-message'
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
  constructor(private readonly shopBannerService: ShopBannerService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  @ResponseMessage(ShopBannerMessage.GET_LIST_SUCCESS)
  async list(
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.shopBannerService.list(query, lang, roleName)
  }

  @Get('all-pokemon/:shopBannerId')
  @ZodSerializerDto(PaginationResponseSchema)
  @ResponseMessage(ShopBannerMessage.GET_LIST_SUCCESS)
  async getListAllPokemonWithShopId(
    @Param('shopBannerId') shopBannerId: number,
    @Query() query: PaginationQueryDTO
  ) {
    return this.shopBannerService.getListAllPokemonWithShopId(shopBannerId, query)
  }

  @Get('all/details')
  @ZodSerializerDto(PaginationResponseSchema)
  @ResponseMessage(ShopBannerMessage.GET_LIST_SUCCESS)
  async listwithDetail(
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.shopBannerService.listwithDetail(query, lang, roleName)
  }

  @Get('today/user')
  @ZodSerializerDto(GetShopBannerByTodayResDTO)
  @ResponseMessage(ShopBannerMessage.GET_LIST_SUCCESS)
  async getByToday(@I18nLang() lang: string, @ActiveUser('userId') userId?: number) {
    return this.shopBannerService.getByToday(lang, userId)
  }

  @Get(':shopBannerId')
  @ZodSerializerDto(GetShopBannerDetailResDTO)
  @ResponseMessage(ShopBannerMessage.GET_SUCCESS)
  async findById(
    @Param() params: GetShopBannerParamsDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.shopBannerService.findById(params.shopBannerId, lang, roleName)
  }

  @Post()
  @ZodSerializerDto(CreateShopBannerResDTO)
  @ResponseMessage(ShopBannerMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreatedShopBannerBodyInputDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.shopBannerService.create({
      data: body,
      createdById: userId
    })
  }

  @Put(':shopBannerId')
  @ZodSerializerDto(UpdateShopBannerResDTO)
  @ResponseMessage(ShopBannerMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateShopBannerBodyInputDTO,
    @Param() params: GetShopBannerParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.shopBannerService.update({
      data: body,
      id: params.shopBannerId,
      updatedById: userId
    })
  }

  @Delete(':shopBannerId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(ShopBannerMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetShopBannerParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.shopBannerService.delete({
      id: params.shopBannerId,
      deletedById: userId
    })
  }
}
