import { I18nService } from '@/i18n/i18n.service'
import { GachaBannerMessage } from '@/i18n/message-keys'
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
  CreatedGachaBannerBodyInputDTO,
  CreateGachaBannerResDTO,
  GetGachaBannerByTodayResDTO,
  GetGachaBannerDetailResDTO,
  GetGachaBannerParamsDTO,
  UpdateGachaBannerBodyInputDTO,
  UpdateGachaBannerResDTO
} from './dto/gacha-banner.zod-dto'
import { GachaBannerService } from './gacha-banner.service'

@Controller('gacha-banner')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class GachaBannerController {
  constructor(
    private readonly gachaBannerService: GachaBannerService,
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
      message: this.i18nService.translate(GachaBannerMessage.GET_LIST_SUCCESS, lang),
      data: await this.gachaBannerService.list(query, lang, roleName)
    }
  }

  @Get('all/details')
  @ZodSerializerDto(PaginationResponseSchema)
  async listwithDetail(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(GachaBannerMessage.GET_LIST_SUCCESS, lang),
      data: await this.gachaBannerService.listwithDetail(query, lang)
    }
  }

  @Get('today/user')
  @ZodSerializerDto(GetGachaBannerByTodayResDTO)
  async getByToday(@I18nLang() lang: string, @ActiveUser('userId') userId: number) {
    return {
      message: this.i18nService.translate(GachaBannerMessage.GET_LIST_SUCCESS, lang),
      data: await this.gachaBannerService.getByToday(lang, userId)
    }
  }

  @Get(':gachaBannerId')
  @ZodSerializerDto(GetGachaBannerDetailResDTO)
  async findById(
    @Param() params: GetGachaBannerParamsDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return {
      message: this.i18nService.translate(GachaBannerMessage.GET_SUCCESS, lang),
      data: await this.gachaBannerService.findById(params.gachaBannerId, lang, roleName)
    }
  }

  @Post()
  @ZodSerializerDto(CreateGachaBannerResDTO)
  async create(
    @Body() body: CreatedGachaBannerBodyInputDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(GachaBannerMessage.CREATE_SUCCESS, lang),
      data: await this.gachaBannerService.create({
        data: body,
        createdById: userId
      })
    }
  }

  @Put(':gachaBannerId')
  @ZodSerializerDto(UpdateGachaBannerResDTO)
  async update(
    @Body() body: UpdateGachaBannerBodyInputDTO,
    @Param() params: GetGachaBannerParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(GachaBannerMessage.UPDATE_SUCCESS, lang),
      data: await this.gachaBannerService.update({
        data: body,
        id: params.gachaBannerId,
        updatedById: userId
      })
    }
  }

  @Delete(':gachaBannerId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetGachaBannerParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.gachaBannerService.delete({
      id: params.gachaBannerId,
      deletedById: userId
    })
    return {
      message: this.i18nService.translate(GachaBannerMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
