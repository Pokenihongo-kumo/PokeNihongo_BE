import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { I18nService } from '@/i18n/i18n.service'
import { LevelMessage } from '@/i18n/message-keys'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { PaginationResponseSchema } from '@/shared/models/response.model'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateLevelBodyDTO,
  CreateLevelResDTO,
  GetLevelDetailResDTO,
  GetLevelParamsDTO,
  UpdateLevelBodyDTO,
  UpdateLevelResDTO
} from './dto/level.zod-dto'
import { LevelService } from './level.service'

@Controller('level')
export class LevelController {
  // The service returns levels; the message is the HTTP layer's
  // (statusCode is set by TransformInterceptor from the HTTP status)
  constructor(
    private readonly levelService: LevelService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(LevelMessage.GET_LIST_SUCCESS, lang),
      data: await this.levelService.list(query)
    }
  }

  @Get(':levelId')
  @IsPublic()
  @ZodSerializerDto(GetLevelDetailResDTO)
  async findById(@Param() params: GetLevelParamsDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(LevelMessage.GET_SUCCESS, lang),
      data: await this.levelService.findById(params.levelId)
    }
  }

  @Post()
  @ZodSerializerDto(CreateLevelResDTO)
  async create(
    @Body() body: CreateLevelBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(LevelMessage.CREATE_SUCCESS, lang),
      data: await this.levelService.create({ data: body, createdById: userId })
    }
  }

  @Put(':levelId')
  @ZodSerializerDto(UpdateLevelResDTO)
  async update(
    @Body() body: UpdateLevelBodyDTO,
    @Param() params: GetLevelParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(LevelMessage.UPDATE_SUCCESS, lang),
      data: await this.levelService.update({
        data: body,
        id: params.levelId,
        updatedById: userId
      })
    }
  }

  @Delete(':levelId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetLevelParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.levelService.delete({ id: params.levelId, deletedById: userId })
    // data: null as before (MessageResDTO)
    return {
      message: this.i18nService.translate(LevelMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
