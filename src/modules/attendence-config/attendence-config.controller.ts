import { I18nService } from '@/i18n/i18n.service'
import { AttendenceConfigMessage } from '@/i18n/message-keys'
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
  constructor(
    private readonly atttendenceConfigService: AttendenceConfigService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(AttendenceConfigMessage.GET_LIST_SUCCESS, lang),
      data: await this.atttendenceConfigService.list(query)
    }
  }

  @Get(':attendenceConfigId')
  @ZodSerializerDto(GetAttendanceConfigResDTO)
  async findById(
    @Param() params: GetParamsAttendanceConfigDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(AttendenceConfigMessage.GET_SUCCESS, lang),
      data: await this.atttendenceConfigService.findById(params.attendenceConfigId)
    }
  }

  @Post()
  @ZodSerializerDto(CreateAttendanceConfigResDTO)
  async create(
    @Body() body: CreateAttendanceConfigBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(AttendenceConfigMessage.CREATE_SUCCESS, lang),
      data: await this.atttendenceConfigService.create({
        data: body,
        createdById: userId
      })
    }
  }

  @Put(':attendenceConfigId')
  @ZodSerializerDto(UpdateAttendanceConfigResDTO)
  async update(
    @Body() body: UpdateAttendanceConfigBodyDTO,
    @Param() params: GetParamsAttendanceConfigDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(AttendenceConfigMessage.UPDATE_SUCCESS, lang),
      data: await this.atttendenceConfigService.update({
        data: body,
        id: params.attendenceConfigId,
        updatedById: userId
      })
    }
  }

  @Delete(':attendenceConfigId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetParamsAttendanceConfigDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.atttendenceConfigService.delete({
      id: params.attendenceConfigId,
      deletedById: userId
    })
    return {
      message: this.i18nService.translate(AttendenceConfigMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
