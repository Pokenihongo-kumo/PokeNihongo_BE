import { ResponseMessage } from '@/i18n/response-message'
import { NotificationMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { NotificationService } from '@/modules/notification/notification.service'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateNotificationBodyDTO,
  CreateNotificationResDTO,
  GetNotificationDetailResDTO,
  GetNotificationParamsDTO,
  UpdateNotificationBodyDTO,
  UpdateNotificationReadListBodyDTO,
  UpdateNotificationReadListResDTO,
  UpdateNotificationResDTO
} from './dto/notification.dto'

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(NotificationMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.notificationService.list(query)
  }

  @Get('user')
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(NotificationMessage.GET_LIST_SUCCESS)
  async getUserSubWithSubPlan(
    @Query() query: PaginationQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.notificationService.getUserSubWithSubPlan(query, userId, lang)
  }

  @Get(':notificationId')
  @ZodSerializerDto(GetNotificationDetailResDTO)
  @ResponseMessage(NotificationMessage.GET_LIST_SUCCESS)
  async findById(
    @Param() params: GetNotificationParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.notificationService.findById(params.notificationId, lang)
  }
  @Post()
  @ZodSerializerDto(CreateNotificationResDTO)
  @ResponseMessage(NotificationMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreateNotificationBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.notificationService.create({
      userId,
      data: body
    })
  }

  @Put('read/list')
  @ZodSerializerDto(UpdateNotificationReadListResDTO)
  @ResponseMessage(NotificationMessage.UPDATE_SUCCESS)
  async updateReadList(
    @Body() body: UpdateNotificationReadListBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.notificationService.updateReads({
      body: body,
      userId
    })
  }

  @Put('read/:notificationId')
  @ZodSerializerDto(UpdateNotificationResDTO)
  @ResponseMessage(NotificationMessage.UPDATE_SUCCESS)
  async updateRead(
    @Param() params: GetNotificationParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.notificationService.updateRead({
      id: params.notificationId,
      userId
    })
  }

  @Put(':notificationId')
  @ZodSerializerDto(UpdateNotificationResDTO)
  @ResponseMessage(NotificationMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateNotificationBodyDTO,
    @Param() params: GetNotificationParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.notificationService.update({
      data: body,
      id: params.notificationId,
      userId
    })
  }

  @Delete(':notificationId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(NotificationMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetNotificationParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.notificationService.delete({
      id: params.notificationId,
      userId
    })
  }
}
