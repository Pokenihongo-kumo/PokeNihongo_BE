import { ResponseMessage } from '@/i18n/response-message'
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

import { MessageResDTO } from '@/shared/dtos/response.dto'
import { AttendenceConfigService } from './attendence-config.service'

@Controller('attendence-config')
@ApiBearerAuth()
export class AttendenceConfigController {
  constructor(private readonly atttendenceConfigService: AttendenceConfigService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  @ResponseMessage(AttendenceConfigMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.atttendenceConfigService.list(query)
  }

  @Get(':attendenceConfigId')
  @ZodSerializerDto(GetAttendanceConfigResDTO)
  @ResponseMessage(AttendenceConfigMessage.GET_SUCCESS)
  async findById(@Param() params: GetParamsAttendanceConfigDTO) {
    return this.atttendenceConfigService.findById(params.attendenceConfigId)
  }

  @Post()
  @ZodSerializerDto(CreateAttendanceConfigResDTO)
  @ResponseMessage(AttendenceConfigMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreateAttendanceConfigBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.atttendenceConfigService.create({
      data: body,
      createdById: userId
    })
  }

  @Put(':attendenceConfigId')
  @ZodSerializerDto(UpdateAttendanceConfigResDTO)
  @ResponseMessage(AttendenceConfigMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateAttendanceConfigBodyDTO,
    @Param() params: GetParamsAttendanceConfigDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.atttendenceConfigService.update({
      data: body,
      id: params.attendenceConfigId,
      updatedById: userId
    })
  }

  @Delete(':attendenceConfigId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(AttendenceConfigMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetParamsAttendanceConfigDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.atttendenceConfigService.delete({
      id: params.attendenceConfigId,
      deletedById: userId
    })
  }
}
