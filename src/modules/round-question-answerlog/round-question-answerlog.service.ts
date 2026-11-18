import { I18nService } from '@/i18n/i18n.service'
import { RoundQuestionsAnswerLogMessage } from '@/i18n/message-keys'
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
} from './entities/round-question-answerlog.entity'
import { RoundQuestionsAnswerLogRepo } from './round-question-answerlog.repo'

@Injectable()
export class RoundQuestionsAnswerLogService {
  constructor(
    private roundQuestionsAnswerLogRepo: RoundQuestionsAnswerLogRepo,

    private readonly i18nService: I18nService
  ) {}

  async list(pagination: PaginationQuery, lang: string = 'vi') {
    const data = await this.roundQuestionsAnswerLogRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(
        RoundQuestionsAnswerLogMessage.GET_LIST_SUCCESS,
        lang
      )
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const roundQuestionsAnswerLog = await this.roundQuestionsAnswerLogRepo.findById(id)
    if (!roundQuestionsAnswerLog) {
      throw new RoundQuestionsAnswerLogNotFoundException()
    }

    return {
      statusCode: 200,
      data: roundQuestionsAnswerLog,
      message: this.i18nService.translate(
        RoundQuestionsAnswerLogMessage.GET_LIST_SUCCESS,
        lang
      )
    }
  }

  async create(
    { userId, data }: { userId: number; data: CreateRoundQuestionsAnswerLogBody },
    lang: string = 'vi'
  ) {
    try {
      const result = await this.roundQuestionsAnswerLogRepo.create({
        createdById: userId,
        data: {
          ...data
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(
          RoundQuestionsAnswerLogMessage.CREATE_SUCCESS,
          lang
        )
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
      data: UpdateRoundQuestionsAnswerLogBody
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      const roundQuestionsAnswerLog = await this.roundQuestionsAnswerLogRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return {
        statusCode: 200,
        data: roundQuestionsAnswerLog,
        message: this.i18nService.translate(
          RoundQuestionsAnswerLogMessage.UPDATE_SUCCESS,
          lang
        )
      }
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

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existRoundQuestionsAnswerLog =
        await this.roundQuestionsAnswerLogRepo.findById(id)
      if (!existRoundQuestionsAnswerLog) {
        throw new RoundQuestionsAnswerLogNotFoundException()
      }

      await this.roundQuestionsAnswerLogRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(
          RoundQuestionsAnswerLogMessage.DELETE_SUCCESS,
          lang
        )
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new RoundQuestionsAnswerLogNotFoundException()
      }
      throw error
    }
  }
}
