import { I18nService } from '@/i18n/i18n.service'
import { TypeEffectivenessMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import { PaginationQueryType } from '@/shared/models/request.model'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/utils/prisma-errors'
import { HttpStatus, Injectable } from '@nestjs/common'
import { TypeEffectivenessAlreadyExistsException } from './dto/type-effectiveness.error'
import {
  CreateTypeEffectivenessBodyType,
  UpdateTypeEffectivenessBodyType
} from './entities/type-effectiveness.entity'
import { TypeEffectivenessRepo } from './type-effectiveness.repo'

@Injectable()
export class TypeEffectivenessService {
  constructor(
    private readonly typeEffectivenessRepo: TypeEffectivenessRepo,
    private readonly i18nService: I18nService
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.typeEffectivenessRepo.list(pagination)
    return {
      statusCode: HttpStatus.OK,
      data,
      message: this.i18nService.translate(TypeEffectivenessMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const typeEffectiveness = await this.typeEffectivenessRepo.findById(id)
    if (!typeEffectiveness) {
      throw new NotFoundRecordException()
    }
    return {
      statusCode: HttpStatus.OK,
      data: typeEffectiveness,
      message: this.i18nService.translate(TypeEffectivenessMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateTypeEffectivenessBodyType
      createdById: number
    },
    lang: string = 'vi'
  ) {
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
      return {
        statusCode: HttpStatus.CREATED,
        data: result,
        message: this.i18nService.translate(TypeEffectivenessMessage.CREATE_SUCCESS, lang)
      }
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

  async update(
    {
      id,
      data,
      updatedById
    }: {
      id: number
      data: UpdateTypeEffectivenessBodyType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
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
      return {
        statusCode: HttpStatus.OK,
        data: typeEffectiveness,
        message: this.i18nService.translate(TypeEffectivenessMessage.UPDATE_SUCCESS, lang)
      }
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

  async delete(
    { id, deletedById }: { id: number; deletedById: number },
    lang: string = 'vi'
  ) {
    try {
      const existTypeEffectiveness = await this.typeEffectivenessRepo.findById(id)
      if (!existTypeEffectiveness) {
        throw new NotFoundRecordException()
      }

      await this.typeEffectivenessRepo.delete({ id, deletedById })
      // data: null keeps this an envelope for TransformInterceptor (without it
      // the body was wrapped again and failed the serializer: 500)
      return {
        statusCode: HttpStatus.OK,
        data: null,
        message: this.i18nService.translate(TypeEffectivenessMessage.DELETE_SUCCESS, lang)
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

  async getAllActiveEffectiveness(lang: string = 'vi') {
    const data = await this.typeEffectivenessRepo.getAllActiveEffectiveness()
    return {
      statusCode: HttpStatus.OK,
      data,
      message: this.i18nService.translate(TypeEffectivenessMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async getEffectivenessMatrix(lang: string = 'vi') {
    const data = await this.typeEffectivenessRepo.getEffectivenessMatrix()
    return {
      statusCode: HttpStatus.OK,
      data,
      message: this.i18nService.translate(TypeEffectivenessMessage.GET_SUCCESS, lang)
    }
  }

  async getWeaknessesForDefender(defenderId: number, lang: string = 'vi') {
    const data = await this.typeEffectivenessRepo.getWeaknessesForDefender(defenderId)
    return {
      statusCode: HttpStatus.OK,
      data,
      message: this.i18nService.translate(TypeEffectivenessMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async getResistancesForDefender(defenderId: number, lang: string = 'vi') {
    const data = await this.typeEffectivenessRepo.getResistancesForDefender(defenderId)
    return {
      statusCode: HttpStatus.OK,
      data,
      message: this.i18nService.translate(TypeEffectivenessMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async calculateMultiTypeEffectiveness(defenderTypeIds: number[], lang: string = 'vi') {
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

    return {
      statusCode: HttpStatus.OK,
      data: result,
      message: this.i18nService.translate(TypeEffectivenessMessage.GET_SUCCESS, lang)
    }
  }
}
