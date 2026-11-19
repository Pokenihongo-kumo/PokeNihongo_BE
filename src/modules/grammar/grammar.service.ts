import { toPaginationMeta } from '@/shared/utils/pagination'
import {
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/utils/prisma-errors'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import {
  GrammarAlreadyExistsException,
  GrammarNotFoundException,
  InvalidGrammarDataException
} from './dto/grammar.error'
import {
  CreateGrammarBasicBody,
  CreateGrammarBody,
  GetGrammarListQuery,
  UpdateGrammarBody
} from './dto/grammar.zod-dto'
import { GrammarRepo } from './grammar.repo'

@Injectable()
export class GrammarService {
  private readonly logger = new Logger(GrammarService.name)

  constructor(private readonly grammarRepository: GrammarRepo) {}

  //#region Get Grammar
  async getGrammarList(params: GetGrammarListQuery) {
    const result = await this.grammarRepository.findMany(params)
    return {
      results: result.data,
      pagination: toPaginationMeta(params.currentPage, params.pageSize, result.total)
    }
  }

  async getGrammarById(id: number) {
    try {
      const grammar = await this.grammarRepository.findByIdWithTranslations(id)
      if (!grammar) {
        throw new GrammarNotFoundException()
      }
      return grammar
    } catch (error) {
      throw this.toGrammarError(error)
    }
  }
  //#endregion

  //#region Create Grammar
  // Grammar + optional first usage + its translations, in one transaction (repo)
  async createGrammar(data: CreateGrammarBody) {
    try {
      if (await this.grammarRepository.checkStructureExists(data.structure)) {
        throw new GrammarAlreadyExistsException()
      }

      const result = await this.grammarRepository.createWithUsage(data)
      this.logger.log(
        `Created grammar ${result.grammar.id} (${result.translationsCreated} translations)`
      )

      return {
        ...result.grammar,
        usage: result.grammarUsage,
        translationsCreated: result.translationsCreated
      }
    } catch (error) {
      throw this.toGrammarError(error)
    }
  }

  async createGrammarBasic(data: CreateGrammarBasicBody) {
    try {
      if (await this.grammarRepository.checkStructureExists(data.structure)) {
        throw new GrammarAlreadyExistsException()
      }
      const grammar = await this.grammarRepository.create(data)
      return grammar
    } catch (error) {
      throw this.toGrammarError(error)
    }
  }
  //#endregion

  //#region Update Grammar
  async updateGrammar(id: number, data: UpdateGrammarBody) {
    try {
      const grammar = await this.grammarRepository.findById(id)
      if (!grammar) {
        throw new GrammarNotFoundException()
      }
      if (
        data.structure &&
        data.structure !== grammar.structure &&
        (await this.grammarRepository.checkStructureExists(data.structure, id))
      ) {
        throw new GrammarAlreadyExistsException()
      }

      const updatedGrammar = await this.grammarRepository.update(id, data)
      return updatedGrammar
    } catch (error) {
      throw this.toGrammarError(error)
    }
  }
  //#endregion

  //#region Delete Grammar
  async deleteGrammar(id: number) {
    try {
      if (!(await this.grammarRepository.findById(id))) {
        throw new GrammarNotFoundException()
      }
      await this.grammarRepository.delete(id)
      return
    } catch (error) {
      throw this.toGrammarError(error)
    }
  }
  //#endregion

  /**
   * Error to answer, decided by type (not message text): our HTTP errors pass
   * through, Prisma unique/not-found become 409/404, anything else is the
   * generic "invalid data" 400 these methods answered before.
   */
  private toGrammarError(error: unknown): HttpException {
    if (error instanceof HttpException) return error
    this.logger.error(
      'Grammar request failed',
      error instanceof Error ? error.stack : error
    )
    if (isUniqueConstraintPrismaError(error)) return new GrammarAlreadyExistsException()
    if (isNotFoundPrismaError(error)) return new GrammarNotFoundException()
    return new InvalidGrammarDataException()
  }

  // ---- For other modules (module-boundary plan B8) ----
  // Same arguments and results as the repo methods.

  findById(...args: Parameters<GrammarRepo['findById']>) {
    return this.grammarRepository.findById(...args)
  }
}
