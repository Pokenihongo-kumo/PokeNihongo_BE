import { I18nService } from '@/i18n/i18n.service'
import { FeatureMessage } from '@/i18n/message-keys'
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
  CreatedFeatureBodyInputDTO,
  CreateFeatureResDTO,
  GetFeatureDetailResDTO,
  GetFeatureParamsDTO,
  UpdateFeatureBodyInputDTO,
  UpdateFeatureResDTO
} from './dto/feature.zod-dto'
import { FeatureService } from './feature.service'

@Controller('feature')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class FeatureController {
  constructor(
    private readonly FeatureService: FeatureService,
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
      message: this.i18nService.translate(FeatureMessage.GET_LIST_SUCCESS, lang),
      data: await this.FeatureService.list(query, lang, roleName)
    }
  }

  @Post()
  @ZodSerializerDto(CreateFeatureResDTO)
  create(
    @Body() body: CreatedFeatureBodyInputDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.FeatureService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Get(':featureId')
  @ZodSerializerDto(GetFeatureDetailResDTO)
  async findById(
    @Param() params: GetFeatureParamsDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return {
      message: this.i18nService.translate(FeatureMessage.GET_SUCCESS, lang),
      data: await this.FeatureService.findById(params.featureId, roleName, lang)
    }
  }

  @Put(':featureId')
  @ZodSerializerDto(UpdateFeatureResDTO)
  update(
    @Body() body: UpdateFeatureBodyInputDTO,
    @Param() params: GetFeatureParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.FeatureService.update(
      {
        data: body,
        id: params.featureId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':featureId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetFeatureParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.FeatureService.delete({
      id: params.featureId,
      deletedById: userId
    })
    return {
      message: this.i18nService.translate(FeatureMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
