import { GachaPityType } from '@/common/constants/gacha.constant'
import { I18nService } from '@/i18n/i18n.service'
import { UserGachaPityMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import {
  UserGachaPityHasPendingException,
  UserGachaPityNotFoundException
} from './dto/user-gacha-pity.error'
import {
  CreateUserGachaPityBodyType,
  UpdateUserGachaPityBodyType
} from './entities/user-gacha-pityentity'
import { UserGachaPityRepo } from './user-gacha-pity.repo'

@Injectable()
export class UserGachaPityService {
  constructor(
    private userGachaPityRepo: UserGachaPityRepo,

    private readonly i18nService: I18nService
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.userGachaPityRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(UserGachaPityMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const userGachaPity = await this.userGachaPityRepo.findById(id)
    if (!userGachaPity) {
      throw new UserGachaPityNotFoundException()
    }

    return {
      statusCode: 200,
      data: userGachaPity,
      message: this.i18nService.translate(UserGachaPityMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async create(
    { userId, data }: { userId: number; data: CreateUserGachaPityBodyType },
    lang: string = 'vi'
  ) {
    try {
      // check coi co truyen userId ko, neu ko thi lay cua created_by
      data.userId = data.userId || userId

      //check coi thang user nay co pity nao dang pending ko, co thi ko dc tao them
      const existingPity = await this.userGachaPityRepo.findStatusByUserId(
        data.userId,
        GachaPityType.PENDING
      )
      if (existingPity) {
        throw new UserGachaPityHasPendingException()
      }

      const result = await this.userGachaPityRepo.create({
        createdById: userId,
        data: {
          ...data
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(UserGachaPityMessage.CREATE_SUCCESS, lang)
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
      data: UpdateUserGachaPityBodyType
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      //check coi thang user nay co pity nao dang pending ko, co thi ko dc tao them
      const existingPity = await this.userGachaPityRepo.findById(id)
      if (!existingPity) {
        throw new UserGachaPityNotFoundException()
      }
      // co update staus ko, neu co va status la pending thi check coi thang user da co pending chua

      if (data.status && data.status === GachaPityType.PENDING) {
        const pendingPity = await this.userGachaPityRepo.findStatusByUserId(
          existingPity.userId,
          GachaPityType.PENDING
        )
        if (pendingPity && pendingPity.id !== id) {
          throw new UserGachaPityHasPendingException()
        }
      }

      const userGachaPity = await this.userGachaPityRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return {
        statusCode: 200,
        data: userGachaPity,
        message: this.i18nService.translate(UserGachaPityMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserGachaPityNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existUserGachaPity = await this.userGachaPityRepo.findById(id)
      if (!existUserGachaPity) {
        throw new UserGachaPityNotFoundException()
      }

      await this.userGachaPityRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(UserGachaPityMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserGachaPityNotFoundException()
      }
      throw error
    }
  }

  async getUserPityNow(userId: number, lang: string = 'vi') {
    const userGachaPity = await this.userGachaPityRepo.findStatusByUserId(
      userId,
      GachaPityType.PENDING
    )

    if (!userGachaPity) {
      // tao moi
      const created = await this.userGachaPityRepo.create({
        createdById: userId,
        data: {
          userId,
          pityCount: 0,
          status: GachaPityType.PENDING
        }
      })
      // GET route: 200 even when the pity row is created on first read
      return {
        statusCode: 200,
        data: created,
        message: this.i18nService.translate(UserGachaPityMessage.CREATE_SUCCESS, lang)
      }
    }

    return {
      statusCode: 200,
      data: userGachaPity,
      message: this.i18nService.translate(UserGachaPityMessage.GET_LIST_SUCCESS, lang)
    }
  }
}
