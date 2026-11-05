import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
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
  constructor(private readonly levelService: LevelService) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.levelService.list(query, lang)
  }

  @Get(':levelId')
  @IsPublic()
  @ZodSerializerDto(GetLevelDetailResDTO)
  findById(@Param() params: GetLevelParamsDTO, @I18nLang() lang: string) {
    return this.levelService.findById(params.levelId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateLevelResDTO)
  create(
    @Body() body: CreateLevelBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.levelService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Put(':levelId')
  @ZodSerializerDto(UpdateLevelResDTO)
  update(
    @Body() body: UpdateLevelBodyDTO,
    @Param() params: GetLevelParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.levelService.update(
      {
        data: body,
        id: params.levelId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':levelId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetLevelParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.levelService.delete(
      {
        id: params.levelId,
        deletedById: userId
      },
      lang
    )
  }
}
