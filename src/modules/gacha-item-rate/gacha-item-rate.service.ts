import { GachaStarTypeType } from '@/common/constants/gacha.constant'
import { I18nService } from '@/i18n/i18n.service'
import { GachaItemRateMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import {
  GachaItemRateAlreadyExistsException,
  GachaItemRateNotFoundException
} from './dto/gacha-item-rate.error'
import {
  CreateGachaItemRateBody,
  UpdateGachaItemRateBody
} from './entities/gacha-item-rate.entity'
import { GachaItemRateRepo } from './gacha-item-rate.repo'

@Injectable()
export class GachaItemRateService {
  constructor(
    private gachaItemRateRepo: GachaItemRateRepo,

    private readonly i18nService: I18nService
  ) {}

  async list(pagination: PaginationQuery, lang: string = 'vi') {
    const data = await this.gachaItemRateRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(GachaItemRateMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const gachaItemRate = await this.gachaItemRateRepo.findById(id)
    if (!gachaItemRate) {
      throw new GachaItemRateNotFoundException()
    }

    return {
      statusCode: 200,
      data: gachaItemRate,
      message: this.i18nService.translate(GachaItemRateMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async create(
    { userId, data }: { userId: number; data: CreateGachaItemRateBody },
    lang: string = 'vi'
  ) {
    try {
      //check exist gacha item rate by star type
      const existGachaItemRate = await this.gachaItemRateRepo.getByType(data.starType)
      if (existGachaItemRate) {
        throw new GachaItemRateAlreadyExistsException()
      }

      const result = await this.gachaItemRateRepo.create({
        createdById: userId,
        data: {
          ...data
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(GachaItemRateMessage.CREATE_SUCCESS, lang)
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
      data: UpdateGachaItemRateBody
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      if (data.starType) {
        //check exist gacha item rate by star type
        const existGachaItemRate = await this.gachaItemRateRepo.getByType(data.starType)
        if (existGachaItemRate && existGachaItemRate.id !== id) {
          throw new GachaItemRateAlreadyExistsException()
        }
      }

      const gachaItemRate = await this.gachaItemRateRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return {
        statusCode: 200,
        data: gachaItemRate,
        message: this.i18nService.translate(GachaItemRateMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new GachaItemRateNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existGachaItemRate = await this.gachaItemRateRepo.findById(id)
      if (!existGachaItemRate) {
        throw new GachaItemRateNotFoundException()
      }

      await this.gachaItemRateRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(GachaItemRateMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new GachaItemRateNotFoundException()
      }
      throw error
    }
  }

  async getByType(starType: GachaStarTypeType) {
    return await this.gachaItemRateRepo.getByType(starType)
  }
}
