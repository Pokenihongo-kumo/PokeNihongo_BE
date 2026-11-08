import { I18nService } from '@/i18n/i18n.service'
import { NotificationMessage } from '@/i18n/message-keys'
import { LanguagesRepo } from '@/modules/languages/languages.repo'
import { NotificationNotFoundException } from '@/modules/notification/dto/notification.error'
import {
  CreateNotificationBodyType,
  UpdateNotificationBodyType,
  UpdateNotificationReadListBodyType
} from '@/modules/notification/entities/notification.entity'
import { UserGateway } from '@/websockets/user.gateway'
import { Injectable } from '@nestjs/common'
import { NotFoundRecordException } from '../error'
import { isForeignKeyConstraintPrismaError, isNotFoundPrismaError } from '../helpers'
import { PaginationQueryType } from '../models/request.model'
import { SharedNotificationRepo } from '../repositories/shared-notification.repo'

@Injectable()
export class SharedNotificationService {
  constructor(
    private notificationRepo: SharedNotificationRepo,
    private readonly i18nService: I18nService,
    private readonly languageRepo: LanguagesRepo,
    private readonly userGateway: UserGateway
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
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
    { userId, data }: { userId: number; data: CreateNotificationBodyType },
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
      data: UpdateNotificationBodyType
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
      body: UpdateNotificationReadListBodyType
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
    pagination: PaginationQueryType,
    userId: number,
    lang: string = 'vi'
  ) {
    const langId = await this.languageRepo.getIdByCode(lang)
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
