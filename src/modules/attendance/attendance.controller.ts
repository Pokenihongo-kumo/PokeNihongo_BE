import { ResponseMessage } from '@/i18n/response-message'
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
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  @ResponseMessage(AttendanceMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.attendanceService.list(query)
  }

  @Get('user')
  @ZodSerializerDto(GetAttendanceWithUserStreakResDTO)
  @ResponseMessage(AttendanceMessage.GET_SUCCESS)
  async findByUser(
    @Param() params: GetParamsDateAttendanceDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.attendanceService.findByUserWeek(userId, params.date)
  }

  @Get(':attendanceId')
  @ZodSerializerDto(GetAttendanceResDTO)
  @ResponseMessage(AttendanceMessage.GET_SUCCESS)
  async findById(@Param() params: GetParamsAttendanceDTO) {
    return this.attendanceService.findById(params.attendanceId)
  }

  @Post()
  @ZodSerializerDto(CreateAttendanceResDTO)
  @ResponseMessage(AttendanceMessage.CREATE_SUCCESS)
  async create(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return this.attendanceService.create(
      {
        createdById: userId
      },
      lang
    )
  }

  @Put(':attendanceId')
  @ZodSerializerDto(UpdateAttendanceResDTO)
  @ResponseMessage(AttendanceMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateAttendanceBodyDTO,
    @Param() params: GetParamsAttendanceDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.attendanceService.update({
      data: body,
      id: params.attendanceId,
      updatedById: userId
    })
  }

  @Delete(':attendanceId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(AttendanceMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetParamsAttendanceDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.attendanceService.delete({
      id: params.attendanceId,
      deletedById: userId
    })
  }
}
