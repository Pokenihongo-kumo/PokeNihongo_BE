import { I18nService } from '@/i18n/i18n.service'
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
  constructor(
    private readonly notificationService: NotificationService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(NotificationMessage.GET_LIST_SUCCESS, lang),
      data: await this.notificationService.list(query)
    }
  }

  @Get('user')
  @ZodSerializerDto(PaginationResponseDTO)
  async getUserSubWithSubPlan(
    @Query() query: PaginationQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(NotificationMessage.GET_LIST_SUCCESS, lang),
      data: await this.notificationService.getUserSubWithSubPlan(query, userId, lang)
    }
  }

  @Get(':notificationId')
  @ZodSerializerDto(GetNotificationDetailResDTO)
  async findById(
    @Param() params: GetNotificationParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(NotificationMessage.GET_LIST_SUCCESS, lang),
      data: await this.notificationService.findById(params.notificationId, lang)
    }
  }
  @Post()
  @ZodSerializerDto(CreateNotificationResDTO)
  async create(
    @Body() body: CreateNotificationBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(NotificationMessage.CREATE_SUCCESS, lang),
      data: await this.notificationService.create({
        userId,
        data: body
      })
    }
  }

  @Put('read/list')
  @ZodSerializerDto(UpdateNotificationReadListResDTO)
  async updateReadList(
    @Body() body: UpdateNotificationReadListBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(NotificationMessage.UPDATE_SUCCESS, lang),
      data: await this.notificationService.updateReads({
        body: body,
        userId
      })
    }
  }

  @Put('read/:notificationId')
  @ZodSerializerDto(UpdateNotificationResDTO)
  async updateRead(
    @Param() params: GetNotificationParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(NotificationMessage.UPDATE_SUCCESS, lang),
      data: await this.notificationService.updateRead({
        id: params.notificationId,
        userId
      })
    }
  }

  @Put(':notificationId')
  @ZodSerializerDto(UpdateNotificationResDTO)
  async update(
    @Body() body: UpdateNotificationBodyDTO,
    @Param() params: GetNotificationParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(NotificationMessage.UPDATE_SUCCESS, lang),
      data: await this.notificationService.update({
        data: body,
        id: params.notificationId,
        userId
      })
    }
  }

  @Delete(':notificationId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetNotificationParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.notificationService.delete({
      id: params.notificationId,
      userId
    })
    return {
      message: this.i18nService.translate(NotificationMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
