import { GachaStarTypeType } from '@/common/constants/gacha.constant'
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
} from './dto/gacha-item-rate.zod-dto'
import { GachaItemRateRepo } from './gacha-item-rate.repo'

@Injectable()
export class GachaItemRateService {
  constructor(private gachaItemRateRepo: GachaItemRateRepo) {}

  async list(pagination: PaginationQuery) {
    const data = await this.gachaItemRateRepo.list(pagination)
    return data
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number) {
    const gachaItemRate = await this.gachaItemRateRepo.findById(id)
    if (!gachaItemRate) {
      throw new GachaItemRateNotFoundException()
    }

    return gachaItemRate
  }

  async create({ userId, data }: { userId: number; data: CreateGachaItemRateBody }) {
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
    data: UpdateGachaItemRateBody
    userId?: number
  }) {
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
      return gachaItemRate
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

  async delete({ id, userId }: { id: number; userId?: number }) {
    try {
      const existGachaItemRate = await this.gachaItemRateRepo.findById(id)
      if (!existGachaItemRate) {
        throw new GachaItemRateNotFoundException()
      }

      await this.gachaItemRateRepo.delete(id)
      return
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
