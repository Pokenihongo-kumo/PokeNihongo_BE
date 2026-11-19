import { I18nService } from '@/i18n/i18n.service'
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

  async list(pagination: PaginationQuery) {
    const data = await this.notificationRepo.list(pagination)
    return data
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
      ...notification,
      title: title,
      body: body
    }
  }
  async create({ userId, data }: { userId: number; data: CreateNotificationBody }) {
    try {
      const result = await this.notificationRepo.create({
        createdById: userId,
        data: {
          ...data,
          userId
        }
      })
      return result
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

  async update({
    id,
    data,
    userId
  }: {
    id: number
    data: UpdateNotificationBody
    userId?: number
  }) {
    try {
      const notification = await this.notificationRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return notification
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
  async updateRead({ id, userId }: { id: number; userId?: number }) {
    try {
      const notification = await this.notificationRepo.update({
        id,
        data: {
          isRead: true
        }
      })
      return notification
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

  async updateReads({
    body,
    userId
  }: {
    body: UpdateNotificationReadListBody
    userId?: number
  }) {
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

      return result
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

  async delete({ id, userId }: { id: number; userId?: number }) {
    try {
      const existNotification = await this.notificationRepo.findById(id)
      if (!existNotification) {
        throw new NotificationNotFoundException()
      }

      await this.notificationRepo.delete(id)
      return
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
      ...data,
      results
    }
  }

  async sendNotiToUserBySocket({ userId, payload }: { userId: number; payload: any }) {
    this.userGateway.notifyUser(userId, payload)
  }
}
