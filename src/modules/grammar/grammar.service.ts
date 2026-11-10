import { Injectable, Logger } from '@nestjs/common'
import {
  CreateGrammarBodyType,
  UpdateGrammarBodyType,
  GetGrammarByIdParamsType,
  GetGrammarListQueryType
} from './entities/grammar.entity'
import {
  GrammarNotFoundException,
  GrammarAlreadyExistsException,
  InvalidGrammarDataException
} from './dto/grammar.error'
import { GrammarRepo } from './grammar.repo'
import { GrammarUsageService } from '../grammar-usage/grammar-usage.service'
import { TranslationService } from '../translation/translation.service'
import { LanguagesService } from '../languages/languages.service'
import { PrismaService } from '@/shared/services/prisma.service'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'

@Injectable()
export class GrammarService {
  private readonly logger = new Logger(GrammarService.name)

  constructor(
    private readonly grammarRepository: GrammarRepo,
    private readonly grammarUsageService: GrammarUsageService,
    private readonly translationService: TranslationService,
    private readonly languagesService: LanguagesService,
    private readonly prismaService: PrismaService
  ) {}
  //#region Get Grammar
  async getGrammarList(params: GetGrammarListQueryType) {
    try {
      this.logger.log('Getting grammar list with params:', params)

      const result = await this.grammarRepository.findMany(params)

      this.logger.log(`Found ${result.data.length} grammar entries`)
      return {
        statusCode: 200,
        message: 'Lấy danh sách ngữ pháp thành công',
        data: {
          results: result.data,
          pagination: {
            current: result.current,
            pageSize: result.pageSize,
            totalPage: result.totalPages,
            totalItem: result.total
          }
        }
      }
    } catch (error) {
      this.logger.error('Error getting grammar list:', error)
      throw error
    }
  }

  async getGrammarById(id: number) {
    try {
      this.logger.log(`Getting grammar by id: ${id}`)

      const grammar = await this.grammarRepository.findByIdWithTranslations(id)

      if (!grammar) {
        throw new GrammarNotFoundException()
      }

      this.logger.log(`Found grammar: ${grammar.id}`)
      return {
        data: grammar,
        message: 'Lấy thông tin ngữ pháp thành công'
      }
    } catch (error) {
      this.logger.error(`Error getting grammar by id ${id}:`, error)

      if (error instanceof GrammarNotFoundException) {
        throw error
      }

      throw new InvalidGrammarDataException('Lỗi khi lấy thông tin ngữ pháp')
    }
  }
  //#endregion

  //#region Create Grammar
  async createGrammar(data: CreateGrammarBodyType) {
    try {
      this.logger.log('Creating grammar with data:', data)

      // Check if structure already exists
      const structureExists = await this.grammarRepository.checkStructureExists(
        data.structure
      )
      if (structureExists) {
        throw new GrammarAlreadyExistsException()
      }

      // Use transaction to create grammar, usage, and translations
      const result = await this.prismaService.$transaction(async (tx) => {
        // 1. Create Grammar
        const grammar = await tx.grammar.create({
          data: {
            structure: data.structure,
            level: data.level
          }
        })

        this.logger.log(`Created grammar: ${grammar.id}`)

        let grammarUsage: any = null
        let translationsCreated = 0

        // 2. Create GrammarUsage if provided
        if (data.usage) {
          // Generate keys first
          const tempId = Date.now() // Use timestamp as temporary ID
          const explanationKey = `grammar.${grammar.id}.usage.${tempId}.explanation`
          const exampleSentenceKey = `grammar.${grammar.id}.usage.${tempId}.example`

          grammarUsage = await tx.grammarUsage.create({
            data: {
              grammarId: grammar.id,
              explanationKey: explanationKey,
              exampleSentenceJp: data.usage.exampleSentenceJp,
              exampleSentenceKey: exampleSentenceKey
            }
          })
          this.logger.log(`Created grammar usage: ${grammarUsage.id}`)

          // Update keys with actual GrammarUsage ID
          const finalExplanationKey = `grammar.${grammar.id}.usage.${grammarUsage.id}.explanation`
          const finalExampleSentenceKey = `grammar.${grammar.id}.usage.${grammarUsage.id}.example`

          await tx.grammarUsage.update({
            where: { id: grammarUsage.id },
            data: {
              explanationKey: finalExplanationKey,
              exampleSentenceKey: finalExampleSentenceKey
            }
          })

          // Update the keys for translation creation
          grammarUsage.explanationKey = finalExplanationKey
          grammarUsage.exampleSentenceKey = finalExampleSentenceKey
        }

        // 3. Create translations if provided
        if (data.translations && grammarUsage && data.translations.usage) {
          const allTranslations: any[] = []

          // Get language mappings
          const languages = await tx.languages.findMany()
          const languageMap = Object.fromEntries(
            languages.map((lang) => [lang.code, lang.id])
          )
          this.logger.log('Available languages:', languageMap)

          this.logger.log(`Creating translations for grammar usage ${grammarUsage.id}`)
          this.logger.log('Usage translations:', data.translations.usage)

          for (const translation of data.translations.usage) {
            const languageId = languageMap[translation.language_code]
            this.logger.log(`Processing ${translation.language_code}:`, {
              languageId,
              explanation: translation.explanation,
              example: translation.example
            })

            if (languageId) {
              // Explanation translation
              allTranslations.push({
                key: grammarUsage.explanationKey,
                value: translation.explanation,
                languageId: languageId
              })
              // Example translation
              allTranslations.push({
                key: grammarUsage.exampleSentenceKey,
                value: translation.example,
                languageId: languageId
              })
            } else {
              this.logger.warn(
                `Language ${translation.language_code} not found in database`
              )
            }
          }

          // Bulk create translations
          if (allTranslations.length > 0) {
            this.logger.log(`Creating ${allTranslations.length} translations`)
            const createResult = await tx.translation.createMany({
              data: allTranslations,
              skipDuplicates: true
            })
            translationsCreated = createResult.count
            this.logger.log(`Successfully created ${translationsCreated} translations`)
          } else {
            this.logger.log('No translations to create')
          }
        }

        return {
          grammar,
          grammarUsage,
          translationsCreated
        }
      })

      this.logger.log(`Grammar creation completed: ${result.grammar.id}`)

      return {
        data: {
          ...result.grammar,
          usage: result.grammarUsage,
          translationsCreated: result.translationsCreated
        },
        message: 'Tạo ngữ pháp thành công'
      }
    } catch (error) {
      this.logger.error('Error creating grammar:', error)

      if (error instanceof GrammarAlreadyExistsException) {
        throw error
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new GrammarAlreadyExistsException()
      }

      throw new InvalidGrammarDataException('Lỗi khi tạo ngữ pháp')
    }
  }

  async createGrammarBasic(data: { structure: string; level: string }) {
    try {
      this.logger.log('Creating basic grammar with data:', data)

      // Check if structure already exists
      const structureExists = await this.grammarRepository.checkStructureExists(
        data.structure
      )
      if (structureExists) {
        throw new GrammarAlreadyExistsException()
      }

      // Create grammar without usage
      const grammar = await this.grammarRepository.create({
        structure: data.structure,
        level: data.level
      })

      this.logger.log(`Created basic grammar: ${grammar.id}`)

      return {
        data: grammar,
        message: 'Tạo ngữ pháp cơ bản thành công'
      }
    } catch (error) {
      this.logger.error('Error creating basic grammar:', error)

      if (error instanceof GrammarAlreadyExistsException) {
        throw error
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new GrammarAlreadyExistsException()
      }

      throw new InvalidGrammarDataException('Lỗi khi tạo ngữ pháp cơ bản')
    }
  }
  //#endregion

  //#region Update Grammar
  async updateGrammar(id: number, data: UpdateGrammarBodyType) {
    try {
      this.logger.log(`Updating grammar ${id} with data:`, data)

      // Check if grammar exists
      const grammar = await this.grammarRepository.findById(id)
      if (!grammar) {
        throw new GrammarNotFoundException()
      }

      // Check if new structure already exists (if updating structure)
      if (data.structure && data.structure !== grammar.structure) {
        const structureExists = await this.grammarRepository.checkStructureExists(
          data.structure,
          id
        )
        if (structureExists) {
          throw new GrammarAlreadyExistsException()
        }
      }

      const updatedGrammar = await this.grammarRepository.update(id, data)

      this.logger.log(`Updated grammar: ${updatedGrammar.id}`)
      return {
        data: updatedGrammar,
        message: 'Cập nhật ngữ pháp thành công'
      }
    } catch (error) {
      this.logger.error(`Error updating grammar ${id}:`, error)

      if (
        error instanceof GrammarNotFoundException ||
        error instanceof GrammarAlreadyExistsException
      ) {
        throw error
      }

      throw new InvalidGrammarDataException('Lỗi khi cập nhật ngữ pháp')
    }
  }
  //#endregion

  //#region Delete Grammar
  async deleteGrammar(id: number) {
    try {
      this.logger.log(`Deleting grammar ${id}`)

      // Check if grammar exists
      const grammar = await this.grammarRepository.findById(id)
      if (!grammar) {
        throw new GrammarNotFoundException()
      }

      await this.grammarRepository.delete(id)

      this.logger.log(`Deleted grammar ${id}`)
      return {
        message: 'Xóa ngữ pháp thành công'
      }
    } catch (error) {
      this.logger.error(`Error deleting grammar ${id}:`, error)

      if (error instanceof GrammarNotFoundException) {
        throw error
      }

      if (isNotFoundPrismaError(error)) {
        throw new GrammarNotFoundException()
      }

      throw new InvalidGrammarDataException('Lỗi khi xóa ngữ pháp')
    }
  }
  //#endregion
}
