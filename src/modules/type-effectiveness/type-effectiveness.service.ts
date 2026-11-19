import { NotFoundRecordException } from '@/shared/error'
import { PaginationQuery } from '@/shared/models/request.model'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/utils/prisma-errors'
import { HttpStatus, Injectable } from '@nestjs/common'
import { TypeEffectivenessAlreadyExistsException } from './dto/type-effectiveness.error'
import {
  CreateTypeEffectivenessBody,
  UpdateTypeEffectivenessBody
} from './dto/type-effectiveness.zod-dto'
import { TypeEffectivenessRepo } from './type-effectiveness.repo'

@Injectable()
export class TypeEffectivenessService {
  constructor(private readonly typeEffectivenessRepo: TypeEffectivenessRepo) {}

  async list(pagination: PaginationQuery) {
    const data = await this.typeEffectivenessRepo.list(pagination)
    return data
  }

  async findById(id: number) {
    const typeEffectiveness = await this.typeEffectivenessRepo.findById(id)
    if (!typeEffectiveness) {
      throw new NotFoundRecordException()
    }
    return typeEffectiveness
  }

  async create({
    data,
    createdById
  }: {
    data: CreateTypeEffectivenessBody
    createdById: number
  }) {
    try {
      // Kiểm tra xem đã tồn tại effectiveness cho cặp attacker-defender này chưa
      const existingTypeEffectiveness =
        await this.typeEffectivenessRepo.findByAttackerDefender(
          data.attackerId,
          data.defenderId
        )
      if (existingTypeEffectiveness) {
        throw new TypeEffectivenessAlreadyExistsException()
      }

      const result = await this.typeEffectivenessRepo.create({
        createdById,
        data
      })
      return result
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new TypeEffectivenessAlreadyExistsException()
      }
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
    updatedById
  }: {
    id: number
    data: UpdateTypeEffectivenessBody
    updatedById: number
  }) {
    try {
      const existTypeEffectiveness = await this.typeEffectivenessRepo.findById(id)
      if (!existTypeEffectiveness) {
        throw new NotFoundRecordException()
      }

      // Nếu update attackerId hoặc defenderId, kiểm tra xem có trùng với type effectiveness khác không
      if (
        (data.attackerId && data.attackerId !== existTypeEffectiveness.attackerId) ||
        (data.defenderId && data.defenderId !== existTypeEffectiveness.defenderId)
      ) {
        const attackerId = data.attackerId ?? existTypeEffectiveness.attackerId
        const defenderId = data.defenderId ?? existTypeEffectiveness.defenderId

        const existingTypeEffectiveness =
          await this.typeEffectivenessRepo.findByAttackerDefender(attackerId, defenderId)
        if (existingTypeEffectiveness && existingTypeEffectiveness.id !== id) {
          throw new TypeEffectivenessAlreadyExistsException()
        }
      }

      const typeEffectiveness = await this.typeEffectivenessRepo.update({
        id,
        updatedById,
        data
      })
      return typeEffectiveness
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new TypeEffectivenessAlreadyExistsException()
      }
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, deletedById }: { id: number; deletedById: number }) {
    try {
      const existTypeEffectiveness = await this.typeEffectivenessRepo.findById(id)
      if (!existTypeEffectiveness) {
        throw new NotFoundRecordException()
      }

      await this.typeEffectivenessRepo.delete({ id, deletedById })
      // data: null keeps this an envelope for TransformInterceptor (without it
      // the body was wrapped again and failed the serializer: 500)
      return
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

  async getAllActiveEffectiveness() {
    const data = await this.typeEffectivenessRepo.getAllActiveEffectiveness()
    return data
  }

  async getEffectivenessMatrix() {
    const data = await this.typeEffectivenessRepo.getEffectivenessMatrix()
    return data
  }

  async getWeaknessesForDefender(defenderId: number) {
    const data = await this.typeEffectivenessRepo.getWeaknessesForDefender(defenderId)
    return data
  }

  async getResistancesForDefender(defenderId: number) {
    const data = await this.typeEffectivenessRepo.getResistancesForDefender(defenderId)
    return data
  }

  async calculateMultiTypeEffectiveness(defenderTypeIds: number[]) {
    // Tính toán weakness/resistance cho Pokémon có nhiều type
    const matrix = await this.typeEffectivenessRepo.getEffectivenessMatrix()
    const result = {
      weaknesses: {} as { [attackerType: string]: number },
      resistances: {} as { [attackerType: string]: number },
      immunities: {} as { [attackerType: string]: number }
    }

    // Lấy tất cả attacker types
    const attackerTypes = Object.keys(matrix)

    // Lấy thông tin defender types
    const defenderTypes =
      await this.typeEffectivenessRepo.findActiveTypeNames(defenderTypeIds)

    // Tính toán multiplier cho từng attacker type
    attackerTypes.forEach((attackerType) => {
      let totalMultiplier = 1

      defenderTypes.forEach((defenderType) => {
        const multiplier = matrix[attackerType]?.[defenderType] ?? 1
        totalMultiplier *= multiplier
      })

      if (totalMultiplier === 0) {
        result.immunities[attackerType] = totalMultiplier
      } else if (totalMultiplier > 1) {
        result.weaknesses[attackerType] = totalMultiplier
      } else if (totalMultiplier < 1) {
        result.resistances[attackerType] = totalMultiplier
      }
    })

    return result
  }

  // ---- For other modules (module-boundary plan B7): repo results as is ----

  findWeaknessesForDefenders(defenderIds: number[]) {
    return this.typeEffectivenessRepo.findWeaknessesForDefenders(defenderIds)
  }

  findForDefenders(defenderIds: number[]) {
    return this.typeEffectivenessRepo.findForDefenders(defenderIds)
  }

  findForDefendersWithTypes(defenderIds: number[]) {
    return this.typeEffectivenessRepo.findForDefendersWithTypes(defenderIds)
  }
}
