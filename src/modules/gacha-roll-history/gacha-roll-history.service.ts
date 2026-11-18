import { I18nService } from '@/i18n/i18n.service'
import { GachaRollHistoryMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { GachaRollHistoryNotFoundException } from './dto/gacha-roll-history.error'
import {
  CreateGachaRollHistoryBodyType,
  UpdateGachaRollHistoryBodyType
} from './entities/gacha-roll-history.entity'
import { GachaRollHistoryRepo } from './gacha-roll-history.repo'

@Injectable()
export class GachaRollHistoryService {
  constructor(
    private gachaRollHistoryRepo: GachaRollHistoryRepo,

    private readonly i18nService: I18nService
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.gachaRollHistoryRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(GachaRollHistoryMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const gachaRollHistory = await this.gachaRollHistoryRepo.findById(id)
    if (!gachaRollHistory) {
      throw new GachaRollHistoryNotFoundException()
    }

    return {
      statusCode: 200,
      data: gachaRollHistory,
      message: this.i18nService.translate(GachaRollHistoryMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async getGachasHisByUser(
    userId: number,
    query: PaginationQueryType,
    lang: string = 'vi'
  ) {
    const gachaRollHistory = await this.gachaRollHistoryRepo.findListGachaHisByUserId(
      userId,
      query
    )
    if (!gachaRollHistory) {
      throw new GachaRollHistoryNotFoundException()
    }
    return {
      statusCode: 200,
      data: gachaRollHistory,

      message: this.i18nService.translate(GachaRollHistoryMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async create(
    { userId, data }: { userId: number; data: CreateGachaRollHistoryBodyType },
    lang: string = 'vi'
  ) {
    try {
      // check coi co truyen userId ko, neu ko thi lay cua created_by
      data.userId = data.userId || userId

      const result = await this.gachaRollHistoryRepo.create({
        createdById: userId,
        data: {
          ...data
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(GachaRollHistoryMessage.CREATE_SUCCESS, lang)
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
      data: UpdateGachaRollHistoryBodyType
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      //check coi thang user nay co pity nao dang pending ko, co thi ko dc tao them
      const existingPity = await this.gachaRollHistoryRepo.findById(id)
      if (!existingPity) {
        throw new GachaRollHistoryNotFoundException()
      }

      const gachaRollHistory = await this.gachaRollHistoryRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return {
        statusCode: 200,
        data: gachaRollHistory,
        message: this.i18nService.translate(GachaRollHistoryMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new GachaRollHistoryNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existGachaRollHistory = await this.gachaRollHistoryRepo.findById(id)
      if (!existGachaRollHistory) {
        throw new GachaRollHistoryNotFoundException()
      }

      await this.gachaRollHistoryRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(GachaRollHistoryMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new GachaRollHistoryNotFoundException()
      }
      throw error
    }
  }

  // ---- For other modules (module-boundary plan B8) ----
  // Same arguments and results as the repo methods.

  // The repo's create (the service's own create answers the HTTP route)
  createRollHistory(...args: Parameters<GachaRollHistoryRepo['create']>) {
    return this.gachaRollHistoryRepo.create(...args)
  }
}
