import { GachaPityType } from '@/common/constants/gacha.constant'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import {
  UserGachaPityHasPendingException,
  UserGachaPityNotFoundException
} from './dto/user-gacha-pity.error'
import {
  CreateUserGachaPityBody,
  UpdateUserGachaPityBody
} from './dto/user-gacha-pity.zod-dto'
import { UserGachaPityRepo } from './user-gacha-pity.repo'

@Injectable()
export class UserGachaPityService {
  constructor(private userGachaPityRepo: UserGachaPityRepo) {}

  async list(pagination: PaginationQuery) {
    const data = await this.userGachaPityRepo.list(pagination)
    return data
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number) {
    const userGachaPity = await this.userGachaPityRepo.findById(id)
    if (!userGachaPity) {
      throw new UserGachaPityNotFoundException()
    }

    return userGachaPity
  }

  async create({ userId, data }: { userId: number; data: CreateUserGachaPityBody }) {
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
    data: UpdateUserGachaPityBody
    userId?: number
  }) {
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
      return userGachaPity
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

  async delete({ id, userId }: { id: number; userId?: number }) {
    try {
      const existUserGachaPity = await this.userGachaPityRepo.findById(id)
      if (!existUserGachaPity) {
        throw new UserGachaPityNotFoundException()
      }

      await this.userGachaPityRepo.delete(id)
      return
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserGachaPityNotFoundException()
      }
      throw error
    }
  }

  async getUserPityNow(userId: number) {
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
      return { created: true, data: created }
    }

    return { created: false, data: userGachaPity }
  }

  // ---- For other modules (module-boundary plan B8) ----
  // Same arguments and results as the repo methods.

  findStatusByUserId(...args: Parameters<UserGachaPityRepo['findStatusByUserId']>) {
    return this.userGachaPityRepo.findStatusByUserId(...args)
  }

  // The repo's create (the service's own create answers the HTTP route)
  createPity(...args: Parameters<UserGachaPityRepo['create']>) {
    return this.userGachaPityRepo.create(...args)
  }

  // The repo's update (the service's own update answers the HTTP route)
  updatePity(...args: Parameters<UserGachaPityRepo['update']>) {
    return this.userGachaPityRepo.update(...args)
  }
}
