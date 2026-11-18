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
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.notificationService.list(query, lang)
  }

  @Get('user')
  @ZodSerializerDto(PaginationResponseDTO)
  getUserSubWithSubPlan(
    @Query() query: PaginationQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.notificationService.getUserSubWithSubPlan(query, userId, lang)
  }

  @Get(':notificationId')
  @ZodSerializerDto(GetNotificationDetailResDTO)
  findById(
    @Param() params: GetNotificationParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.notificationService.findById(params.notificationId, lang)
  }
  @Post()
  @ZodSerializerDto(CreateNotificationResDTO)
  create(
    @Body() body: CreateNotificationBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.notificationService.create(
      {
        userId,
        data: body
      },
      lang
    )
  }

  @Put('read/list')
  @ZodSerializerDto(UpdateNotificationReadListResDTO)
  updateReadList(
    @Body() body: UpdateNotificationReadListBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.notificationService.updateReads(
      {
        body: body,
        userId
      },
      lang
    )
  }

  @Put('read/:notificationId')
  @ZodSerializerDto(UpdateNotificationResDTO)
  updateRead(
    @Param() params: GetNotificationParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.notificationService.updateRead(
      {
        id: params.notificationId,
        userId
      },
      lang
    )
  }

  @Put(':notificationId')
  @ZodSerializerDto(UpdateNotificationResDTO)
  update(
    @Body() body: UpdateNotificationBodyDTO,
    @Param() params: GetNotificationParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.notificationService.update(
      {
        data: body,
        id: params.notificationId,
        userId
      },
      lang
    )
  }

  @Delete(':notificationId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetNotificationParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.notificationService.delete(
      {
        id: params.notificationId,
        userId
      },
      lang
    )
  }
}
