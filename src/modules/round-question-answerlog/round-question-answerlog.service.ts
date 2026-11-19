import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { RoundQuestionsAnswerLogNotFoundException } from './dto/round-question-answerlog.error'
import {
  CreateRoundQuestionsAnswerLogBody,
  UpdateRoundQuestionsAnswerLogBody
} from './dto/round-question-answerlog.zod-dto'
import { RoundQuestionsAnswerLogRepo } from './round-question-answerlog.repo'

@Injectable()
export class RoundQuestionsAnswerLogService {
  constructor(private roundQuestionsAnswerLogRepo: RoundQuestionsAnswerLogRepo) {}

  async list(pagination: PaginationQuery) {
    const data = await this.roundQuestionsAnswerLogRepo.list(pagination)
    return data
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number) {
    const roundQuestionsAnswerLog = await this.roundQuestionsAnswerLogRepo.findById(id)
    if (!roundQuestionsAnswerLog) {
      throw new RoundQuestionsAnswerLogNotFoundException()
    }

    return roundQuestionsAnswerLog
  }

  async create({
    userId,
    data
  }: {
    userId: number
    data: CreateRoundQuestionsAnswerLogBody
  }) {
    try {
      const result = await this.roundQuestionsAnswerLogRepo.create({
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
    data: UpdateRoundQuestionsAnswerLogBody
    userId?: number
  }) {
    try {
      const roundQuestionsAnswerLog = await this.roundQuestionsAnswerLogRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return roundQuestionsAnswerLog
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new RoundQuestionsAnswerLogNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }) {
    try {
      const existRoundQuestionsAnswerLog =
        await this.roundQuestionsAnswerLogRepo.findById(id)
      if (!existRoundQuestionsAnswerLog) {
        throw new RoundQuestionsAnswerLogNotFoundException()
      }

      await this.roundQuestionsAnswerLogRepo.delete(id)
      return
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new RoundQuestionsAnswerLogNotFoundException()
      }
      throw error
    }
  }
}
