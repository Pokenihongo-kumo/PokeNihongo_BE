import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { PaginationResponseSchema } from '@/shared/models/response.model'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateAttendanceConfigBodyDTO,
  CreateAttendanceConfigResDTO,
  GetAttendanceConfigResDTO,
  GetParamsAttendanceConfigDTO,
  UpdateAttendanceConfigBodyDTO,
  UpdateAttendanceConfigResDTO
} from './dto/attendence-config.zod-dto'

import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { AttendenceConfigService } from './attendence-config.service'

@Controller('attendence-config')
@ApiBearerAuth()
export class AttendenceConfigController {
  constructor(private readonly atttendenceConfigService: AttendenceConfigService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.atttendenceConfigService.list(query, lang)
  }

  @Get(':attendenceConfigId')
  @ZodSerializerDto(GetAttendanceConfigResDTO)
  findById(@Param() params: GetParamsAttendanceConfigDTO, @I18nLang() lang: string) {
    return this.atttendenceConfigService.findById(params.attendenceConfigId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateAttendanceConfigResDTO)
  create(
    @Body() body: CreateAttendanceConfigBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.atttendenceConfigService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Put(':attendenceConfigId')
  @ZodSerializerDto(UpdateAttendanceConfigResDTO)
  update(
    @Body() body: UpdateAttendanceConfigBodyDTO,
    @Param() params: GetParamsAttendanceConfigDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.atttendenceConfigService.update(
      {
        data: body,
        id: params.attendenceConfigId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':attendenceConfigId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetParamsAttendanceConfigDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.atttendenceConfigService.delete(
      {
        id: params.attendenceConfigId,
        deletedById: userId
      },
      lang
    )
  }
}
