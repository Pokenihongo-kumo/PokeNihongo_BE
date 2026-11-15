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
  constructor(private readonly gachaBannerService: GachaBannerService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  list(
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.gachaBannerService.list(query, lang, roleName)
  }

  @Get('all/details')
  @ZodSerializerDto(PaginationResponseSchema)
  listwithDetail(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.gachaBannerService.listwithDetail(query, lang)
  }

  @Get('today/user')
  @ZodSerializerDto(GetGachaBannerByTodayResDTO)
  getByToday(@I18nLang() lang: string, @ActiveUser('userId') userId: number) {
    return this.gachaBannerService.getByToday(lang, userId)
  }

  @Get(':gachaBannerId')
  @ZodSerializerDto(GetGachaBannerDetailResDTO)
  findById(
    @Param() params: GetGachaBannerParamsDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.gachaBannerService.findById(params.gachaBannerId, lang, roleName)
  }

  @Post()
  @ZodSerializerDto(CreateGachaBannerResDTO)
  create(
    @Body() body: CreatedGachaBannerBodyInputDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.gachaBannerService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Put(':gachaBannerId')
  @ZodSerializerDto(UpdateGachaBannerResDTO)
  update(
    @Body() body: UpdateGachaBannerBodyInputDTO,
    @Param() params: GetGachaBannerParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.gachaBannerService.update(
      {
        data: body,
        id: params.gachaBannerId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':gachaBannerId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetGachaBannerParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.gachaBannerService.delete(
      {
        id: params.gachaBannerId,
        deletedById: userId
      },
      lang
    )
  }
}
