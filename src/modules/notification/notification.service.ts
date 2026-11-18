import { I18nService } from '@/i18n/i18n.service'
import { NotificationMessage } from '@/i18n/message-keys'
import { LanguagesService } from '@/modules/languages/languages.service'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQuery } from '@/shared/models/request.model'
import { UserGateway } from '@/websockets/user.gateway'
import { Injectable } from '@nestjs/common'
import { NotificationNotFoundException } from './dto/notification.error'
import {
  CreateNotificationBody,
  UpdateNotificationBody,
  UpdateNotificationReadListBody
} from './dto/notification.zod-dto'
import { NotificationRepo } from './notification.repo'

@Injectable()
export class NotificationService {
  constructor(
    private notificationRepo: NotificationRepo,
    private readonly i18nService: I18nService,
    private readonly languagesService: LanguagesService,
    private readonly userGateway: UserGateway
  ) {}

  async list(pagination: PaginationQuery, lang: string = 'vi') {
    const data = await this.notificationRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(NotificationMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const notification = await this.notificationRepo.findById(id)
    if (!notification) {
      throw new NotificationNotFoundException()
    }
    const title = this.i18nService.translate(notification.titleKey, lang)
    const body = this.i18nService.translate(notification.bodyKey, lang)
    return {
      statusCode: 200,
      data: {
        ...notification,
        title: title,
        body: body
      },
      message: this.i18nService.translate(NotificationMessage.GET_LIST_SUCCESS, lang)
    }
  }
  async create(
    { userId, data }: { userId: number; data: CreateNotificationBody },
    lang: string = 'vi'
  ) {
    try {
      const result = await this.notificationRepo.create({
        createdById: userId,
        data: {
          ...data,
          userId
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(NotificationMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async update(
    {
      id,
      data,
      userId
    }: {
      id: number
      data: UpdateNotificationBody
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      const notification = await this.notificationRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return {
        statusCode: 200,
        data: notification,
        message: this.i18nService.translate(NotificationMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotificationNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }
  async updateRead(
    {
      id,
      userId
    }: {
      id: number
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      const notification = await this.notificationRepo.update({
        id,
        data: {
          isRead: true
        }
      })
      return {
        statusCode: 200,
        data: notification,
        message: this.i18nService.translate(NotificationMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotificationNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async updateReads(
    {
      body,
      userId
    }: {
      body: UpdateNotificationReadListBody
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      const result = await Promise.all(
        body.notificationIds.map(async (notificationId) => {
          return this.notificationRepo.update({
            id: notificationId,
            data: {
              isRead: true
            },
            updatedById: userId
          })
        })
      )

      return {
        statusCode: 200,
        data: result,
        message: this.i18nService.translate(NotificationMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotificationNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existNotification = await this.notificationRepo.findById(id)
      if (!existNotification) {
        throw new NotificationNotFoundException()
      }

      await this.notificationRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(NotificationMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotificationNotFoundException()
      }
      throw error
    }
  }

  async getUserSubWithSubPlan(
    pagination: PaginationQuery,
    userId: number,
    lang: string = 'vi'
  ) {
    const langId = await this.languagesService.getIdByCode(lang)
    const data = await this.notificationRepo.getUserSubWithSubPlan(
      pagination,
      userId,
      langId ?? undefined
    )
    // lượt bỏ nameTranslations, descriptionTranslations
    const results = data.results.map((us: any) => {
      const title = this.i18nService.translate(us.titleKey, lang)
      const body = this.i18nService.translate(us.bodyKey, lang)

      return {
        ...us,
        title: title,
        body: body
      }
    })
    return {
      statusCode: 200,
      data: {
        ...data,
        results
      },
      message: this.i18nService.translate(NotificationMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async sendNotiToUserBySocket({ userId, payload }: { userId: number; payload: any }) {
    this.userGateway.notifyUser(userId, payload)
  }
}
