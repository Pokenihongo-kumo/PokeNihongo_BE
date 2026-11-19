import { toPaginationMeta } from '@/shared/utils/pagination'
import {
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/utils/prisma-errors'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import {
  GrammarNotFoundException,
  GrammarUsageAlreadyExistsException,
  GrammarUsageNotFoundException,
  InvalidGrammarUsageDataException
} from './dto/grammar-usage.error'
import {
  CreateGrammarUsageBody,
  GetGrammarUsageByIdParams,
  GetGrammarUsageListQuery,
  UpdateGrammarUsageBody
} from './dto/grammar-usage.zod-dto'
import { GrammarUsageRepo } from './grammar-usage.repo'

@Injectable()
export class GrammarUsageService {
  private readonly logger = new Logger(GrammarUsageService.name)

  constructor(private readonly grammarUsageRepository: GrammarUsageRepo) {}

  async getGrammarUsageList(params: GetGrammarUsageListQuery) {
    const result = await this.grammarUsageRepository.findMany(params)
    return {
      results: result.data,
      pagination: toPaginationMeta(params.page, params.limit, result.total)
    }
  }

  async getGrammarUsageById(params: GetGrammarUsageByIdParams) {
    try {
      const grammarUsage = await this.grammarUsageRepository.findById(params.id)
      if (!grammarUsage) {
        throw new GrammarUsageNotFoundException()
      }
      return grammarUsage
    } catch (error) {
      throw this.toGrammarUsageError(error)
    }
  }

  async createGrammarUsage(data: CreateGrammarUsageBody) {
    try {
      if (!(await this.grammarUsageRepository.checkGrammarExists(data.grammarId))) {
        throw new GrammarNotFoundException()
      }
      if (
        await this.grammarUsageRepository.checkUsageExistsInGrammar(
          data.grammarId,
          data.explanationKey
        )
      ) {
        throw new GrammarUsageAlreadyExistsException()
      }

      const grammarUsage = await this.grammarUsageRepository.create(data)
      return grammarUsage
    } catch (error) {
      throw this.toGrammarUsageError(error)
    }
  }

  async updateGrammarUsage(id: number, data: UpdateGrammarUsageBody) {
    try {
      const grammarUsage = await this.grammarUsageRepository.findById(id)
      if (!grammarUsage) {
        throw new GrammarUsageNotFoundException()
      }
      if (
        data.explanationKey &&
        data.explanationKey !== grammarUsage.explanationKey &&
        (await this.grammarUsageRepository.checkUsageExistsInGrammar(
          grammarUsage.grammarId,
          data.explanationKey,
          id
        ))
      ) {
        throw new GrammarUsageAlreadyExistsException()
      }

      const updatedGrammarUsage = await this.grammarUsageRepository.update(id, data)
      return updatedGrammarUsage
    } catch (error) {
      throw this.toGrammarUsageError(error)
    }
  }

  async deleteGrammarUsage(id: number) {
    try {
      if (!(await this.grammarUsageRepository.findById(id))) {
        throw new GrammarUsageNotFoundException()
      }
      await this.grammarUsageRepository.delete(id)
      return
    } catch (error) {
      throw this.toGrammarUsageError(error)
    }
  }

  /**
   * Error to answer, decided by type (not message text): our HTTP errors pass
   * through, Prisma unique/not-found become 409/404, anything else is the
   * generic "invalid data" 400 these methods answered before.
   */
  private toGrammarUsageError(error: unknown): HttpException {
    if (error instanceof HttpException) return error
    this.logger.error(
      'Grammar usage request failed',
      error instanceof Error ? error.stack : error
    )
    if (isUniqueConstraintPrismaError(error))
      return new GrammarUsageAlreadyExistsException()
    if (isNotFoundPrismaError(error)) return new GrammarUsageNotFoundException()
    return new InvalidGrammarUsageDataException()
  }
}
