import { LevelTypeType } from '@/common/constants/level.constant'
import { I18nService } from '@/i18n/i18n.service'
import { LevelMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import { PaginationQueryType } from '@/shared/models/request.model'
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
import { CreateLevelBodyType, UpdateLevelBodyType } from './entities/level.entity'
import { LevelRepo } from './level.repo'

@Injectable()
export class LevelService {
  private readonly logger = new Logger(LevelService.name)

  constructor(
    private readonly levelRepo: LevelRepo,
    private readonly i18nService: I18nService
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.levelRepo.list(pagination)
    return {
      data,
      message: this.i18nService.translate(LevelMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const level = await this.levelRepo.findById(id)
    if (!level) {
      throw new NotFoundRecordException()
    }
    return {
      data: level,
      message: this.i18nService.translate(LevelMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateLevelBodyType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    try {
      // Tạo level trước
      const result = await this.levelRepo.create({
        createdById,
        data
      })

      // Sau khi tạo thành công, tự động liên kết với các level liền kề
      await this.autoLinkLevels(result.id, data.levelNumber, data.levelType)

      return {
        data: result,
        message: this.i18nService.translate(LevelMessage.CREATE_SUCCESS, lang)
      }
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

  async update(
    {
      id,
      data,
      updatedById
    }: {
      id: number
      data: UpdateLevelBodyType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
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

      return {
        data: level,
        message: this.i18nService.translate(LevelMessage.UPDATE_SUCCESS, lang)
      }
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

  async delete(
    { id, deletedById }: { id: number; deletedById: number },
    lang: string = 'vi'
  ) {
    try {
      await this.levelRepo.delete({
        id,
        deletedById
      })
      return {
        data: null,
        message: this.i18nService.translate(LevelMessage.DELETE_SUCCESS, lang)
      }
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
}
