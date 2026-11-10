import { I18nService } from '@/i18n/i18n.service'
import { GrammarMessage } from '@/i18n/message-keys'
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
  CreateGrammarBasicBodyType,
  CreateGrammarBodyType,
  GetGrammarListQueryType,
  UpdateGrammarBodyType
} from './entities/grammar.entity'
import { GrammarRepo } from './grammar.repo'

@Injectable()
export class GrammarService {
  private readonly logger = new Logger(GrammarService.name)

  constructor(
    private readonly grammarRepository: GrammarRepo,
    private readonly i18nService: I18nService
  ) {}

  //#region Get Grammar
  async getGrammarList(params: GetGrammarListQueryType, lang: string = 'vi') {
    const result = await this.grammarRepository.findMany(params)
    return {
      statusCode: 200,
      message: this.i18nService.translate(GrammarMessage.GET_LIST_SUCCESS, lang),
      data: {
        results: result.data,
        pagination: toPaginationMeta(params.currentPage, params.pageSize, result.total)
      }
    }
  }

  async getGrammarById(id: number, lang: string = 'vi') {
    try {
      const grammar = await this.grammarRepository.findByIdWithTranslations(id)
      if (!grammar) {
        throw new GrammarNotFoundException()
      }
      return {
        data: grammar,
        message: this.i18nService.translate(GrammarMessage.GET_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toGrammarError(error)
    }
  }
  //#endregion

  //#region Create Grammar
  // Grammar + optional first usage + its translations, in one transaction (repo)
  async createGrammar(data: CreateGrammarBodyType, lang: string = 'vi') {
    try {
      if (await this.grammarRepository.checkStructureExists(data.structure)) {
        throw new GrammarAlreadyExistsException()
      }

      const result = await this.grammarRepository.createWithUsage(data)
      this.logger.log(
        `Created grammar ${result.grammar.id} (${result.translationsCreated} translations)`
      )

      return {
        data: {
          ...result.grammar,
          usage: result.grammarUsage,
          translationsCreated: result.translationsCreated
        },
        message: this.i18nService.translate(GrammarMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toGrammarError(error)
    }
  }

  async createGrammarBasic(data: CreateGrammarBasicBodyType, lang: string = 'vi') {
    try {
      if (await this.grammarRepository.checkStructureExists(data.structure)) {
        throw new GrammarAlreadyExistsException()
      }
      const grammar = await this.grammarRepository.create(data)
      return {
        data: grammar,
        message: this.i18nService.translate(GrammarMessage.CREATE_BASIC_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toGrammarError(error)
    }
  }
  //#endregion

  //#region Update Grammar
  async updateGrammar(id: number, data: UpdateGrammarBodyType, lang: string = 'vi') {
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
      return {
        data: updatedGrammar,
        message: this.i18nService.translate(GrammarMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toGrammarError(error)
    }
  }
  //#endregion

  //#region Delete Grammar
  async deleteGrammar(id: number, lang: string = 'vi') {
    try {
      if (!(await this.grammarRepository.findById(id))) {
        throw new GrammarNotFoundException()
      }
      await this.grammarRepository.delete(id)
      return {
        message: this.i18nService.translate(GrammarMessage.DELETE_SUCCESS, lang)
      }
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
}
