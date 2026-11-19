import { I18nService } from '@/i18n/i18n.service'
import { AttendanceMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { PaginationResponseSchema } from '@/shared/models/response.model'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateAttendanceResDTO,
  GetAttendanceResDTO,
  GetAttendanceWithUserStreakResDTO,
  GetParamsAttendanceDTO,
  GetParamsDateAttendanceDTO,
  UpdateAttendanceBodyDTO,
  UpdateAttendanceResDTO
} from 'src/modules/attendance/dto/attendance.zod-dto'

import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { ApiBearerAuth } from '@nestjs/swagger'
import { MessageResDTO } from 'src/shared/dtos/response.dto'
import { AttendanceService } from './attendance.service'

@Controller('attendance')
@ApiBearerAuth()
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(AttendanceMessage.GET_LIST_SUCCESS, lang),
      data: await this.attendanceService.list(query)
    }
  }

  @Get('user')
  @ZodSerializerDto(GetAttendanceWithUserStreakResDTO)
  async findByUser(
    @Param() params: GetParamsDateAttendanceDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(AttendanceMessage.GET_SUCCESS, lang),
      data: await this.attendanceService.findByUserWeek(userId, params.date)
    }
  }

  @Get(':attendanceId')
  @ZodSerializerDto(GetAttendanceResDTO)
  async findById(@Param() params: GetParamsAttendanceDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(AttendanceMessage.GET_SUCCESS, lang),
      data: await this.attendanceService.findById(params.attendanceId)
    }
  }

  @Post()
  @ZodSerializerDto(CreateAttendanceResDTO)
  async create(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(AttendanceMessage.CREATE_SUCCESS, lang),
      data: await this.attendanceService.create(
        {
          createdById: userId
        },
        lang
      )
    }
  }

  @Put(':attendanceId')
  @ZodSerializerDto(UpdateAttendanceResDTO)
  async update(
    @Body() body: UpdateAttendanceBodyDTO,
    @Param() params: GetParamsAttendanceDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(AttendanceMessage.UPDATE_SUCCESS, lang),
      data: await this.attendanceService.update({
        data: body,
        id: params.attendanceId,
        updatedById: userId
      })
    }
  }

  @Delete(':attendanceId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetParamsAttendanceDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.attendanceService.delete({
      id: params.attendanceId,
      deletedById: userId
    })
    return {
      message: this.i18nService.translate(AttendanceMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
