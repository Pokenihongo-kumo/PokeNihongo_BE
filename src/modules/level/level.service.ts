import { LevelTypeType } from '@/common/constants/level.constant'
import { NotFoundRecordException } from '@/shared/error'
import { PaginationQuery } from '@/shared/models/request.model'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/utils/prisma-errors'
import { Injectable, Logger } from '@nestjs/common'
import {
  ConflictTypeNextLevelException,
  LevelAlreadyExistsException
} from './dto/level.error'
import { CreateLevelBody, UpdateLevelBody } from './dto/level.zod-dto'
import { LevelRepo } from './level.repo'

@Injectable()
export class LevelService {
  private readonly logger = new Logger(LevelService.name)

  constructor(private readonly levelRepo: LevelRepo) {}

  list(pagination: PaginationQuery) {
    return this.levelRepo.list(pagination)
  }

  async findById(id: number) {
    const level = await this.levelRepo.findById(id)
    if (!level) {
      throw new NotFoundRecordException()
    }
    return level
  }

  async create({ data, createdById }: { data: CreateLevelBody; createdById: number }) {
    try {
      // Tạo level trước
      const result = await this.levelRepo.create({
        createdById,
        data
      })

      // Sau khi tạo thành công, tự động liên kết với các level liền kề
      await this.autoLinkLevels(result.id, data.levelNumber, data.levelType)

      return result
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new LevelAlreadyExistsException()
      }
      if (isNotFoundPrismaError(error)) {
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
    data: UpdateLevelBody
    updatedById: number
  }) {
    try {
      const existLevel = await this.levelRepo.findById(id)
      if (!existLevel) {
        throw new NotFoundRecordException()
      }

      // neu update de lien ket level voi level ke tiep, phai giong type va level number phai hop le
      if (data.nextLevelId) {
        const nextLevel = await this.levelRepo.findById(data.nextLevelId)
        if (
          !nextLevel ||
          nextLevel.levelType !== existLevel.levelType ||
          nextLevel.levelNumber !== existLevel.levelNumber + 1
        ) {
          throw new ConflictTypeNextLevelException()
        }
      }

      const level = await this.levelRepo.update({
        id,
        updatedById,
        data
      })

      // Nếu có thay đổi levelNumber hoặc levelType, tự động liên kết lại
      if (data.levelNumber !== undefined || data.levelType !== undefined) {
        const newLevelNumber = data.levelNumber ?? existLevel.levelNumber
        const newLevelType = data.levelType ?? existLevel.levelType
        await this.autoLinkLevels(id, newLevelNumber, newLevelType)
      }

      return level
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new LevelAlreadyExistsException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, deletedById }: { id: number; deletedById: number }): Promise<void> {
    try {
      await this.levelRepo.delete({
        id,
        deletedById
      })
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  /**
   * Tự động liên kết level với các level liền kề
   * - Tìm level có levelNumber + 1 cùng type → set làm nextLevel
   * - Tìm level có levelNumber - 1 cùng type → cập nhật level đó để trỏ đến level hiện tại
   */
  private async autoLinkLevels(
    levelId: number,
    levelNumber: number,
    levelType: LevelTypeType
  ) {
    try {
      // 1. Tìm level kế tiếp (levelNumber + 1)
      const nextLevel = await this.levelRepo.findNextLevelByNumber(levelNumber, levelType)

      // 2. Tìm level trước đó (levelNumber - 1)
      const prevLevel = await this.levelRepo.findPrevLevelByNumber(levelNumber, levelType)

      // 3. Cập nhật nextLevel cho level hiện tại
      if (nextLevel) {
        await this.levelRepo.updateNextLevel(levelId, nextLevel.id)
      }

      // 4. Cập nhật nextLevel cho level trước đó (trỏ đến level hiện tại)
      if (prevLevel) {
        await this.levelRepo.updateNextLevel(prevLevel.id, levelId)
      }
    } catch (error) {
      // Best effort: the level itself is already saved; a missing link is logged
      this.logger.error(
        'Error in autoLinkLevels',
        error instanceof Error ? error.stack : error
      )
    }
  }

  // ---- Catalog lookups for other modules (module-boundary plan B3) ----
  // Same arguments and results as the repo methods; no message, no throw.

  findByLevelAndType(...args: Parameters<LevelRepo['findByLevelAndType']>) {
    return this.levelRepo.findByLevelAndType(...args)
  }

  getFirstLevelUser() {
    return this.levelRepo.getFirstLevelUser()
  }
}
