import {
  CreateMeaningBodyType,
  CreateMeaningServiceType,
  UpdateMeaningBodyType,
  GetMeaningListQueryType,
  GetMeaningsByVocabularyParamsType,
  MeaningType
} from './entities/meaning.entities'
import { MeaningRepository } from './meaning.repo'
import { Injectable, Logger } from '@nestjs/common'
import {
  MeaningNotFoundException,
  MeaningAlreadyExistsException,
  InvalidMeaningDataException
} from './dto/meaning.error'
import { TranslationHelperService } from '@/modules/translation/translation.helper.service'

@Injectable()
export class MeaningService {
  private readonly logger = new Logger(MeaningService.name)

  constructor(
    private readonly meaningRepository: MeaningRepository,
    private readonly translationHelper: TranslationHelperService
  ) {}

  async findMany(params: GetMeaningListQueryType) {
    try {
      this.logger.log(`Finding meanings with params: ${JSON.stringify(params)}`)
      const result = await this.meaningRepository.findMany(params)

      return {
        statusCode: 200,
        message: 'Lấy danh sách nghĩa thành công',
        data: {
          results: result.data,
          pagination: {
            current: result.page,
            pageSize: result.limit,
            totalPage: result.totalPages,
            totalItem: result.total
          }
        }
      }
    } catch (error) {
      this.logger.error('Error finding meanings:', error)
      throw error
    }
  }

  async findById(id: number): Promise<MeaningType> {
    try {
      this.logger.log(`Finding meaning by id: ${id}`)
      const meaning = await this.meaningRepository.findById(id)

      if (!meaning) {
        throw MeaningNotFoundException
      }

      return meaning
    } catch (error) {
      this.logger.error('Error finding meaning by id:', error)
      throw error
    }
  }

  async findByVocabularyId(vocabularyId: number) {
    try {
      this.logger.log(`Finding meanings by vocabulary id: ${vocabularyId}`)
      const meanings = await this.meaningRepository.findByVocabularyId(vocabularyId)

      // Lấy translations cho mỗi meaning
      const meaningsWithTranslations = await Promise.all(
        meanings.map(async (meaning) => {
          const result: any = { ...meaning }

          // Lấy translations cho meaningKey
          if (meaning.meaningKey) {
            try {
              const meaningTranslations =
                await this.translationHelper.getTranslationsByKey(meaning.meaningKey)
              result.meaningTranslations = Object.entries(meaningTranslations).map(
                ([language_code, value]) => ({
                  language_code,
                  value
                })
              )
            } catch (error) {
              this.logger.warn(
                `Failed to get translations for meaningKey ${meaning.meaningKey}:`,
                error
              )
              result.meaningTranslations = []
            }
          } else {
            result.meaningTranslations = []
          }

          // Lấy translations cho exampleSentenceKey
          if (meaning.exampleSentenceKey) {
            try {
              const exampleTranslations =
                await this.translationHelper.getTranslationsByKey(
                  meaning.exampleSentenceKey
                )
              result.exampleTranslations = Object.entries(exampleTranslations).map(
                ([language_code, value]) => ({
                  language_code,
                  value
                })
              )
            } catch (error) {
              this.logger.warn(
                `Failed to get translations for exampleSentenceKey ${meaning.exampleSentenceKey}:`,
                error
              )
              result.exampleTranslations = []
            }
          } else {
            result.exampleTranslations = []
          }

          return result
        })
      )

      return meaningsWithTranslations
    } catch (error) {
      this.logger.error('Error finding meanings by vocabulary id:', error)
      throw error
    }
  }

  async create(data: CreateMeaningBodyType): Promise<MeaningType> {
    try {
      this.logger.log(`Creating meaning for vocabulary: ${data.vocabularyId}`)

      // Tự động generate keys
      const meaningData: CreateMeaningServiceType = {
        ...data,
        meaningKey: this.generateMeaningKey(data.vocabularyId),
        exampleSentenceKey: this.generateExampleSentenceKey(data.vocabularyId),
        explanationKey: this.generateExplanationKey(data.vocabularyId)
      }

      const meaning = await this.meaningRepository.create(meaningData)
      this.logger.log(`Meaning created successfully: ${meaning.id}`)
      return meaning
    } catch (error) {
      this.logger.error('Error creating meaning:', error)
      throw InvalidMeaningDataException
    }
  }

  async update(id: number, data: UpdateMeaningBodyType): Promise<MeaningType> {
    try {
      this.logger.log(`Updating meaning: ${id}`)

      // Kiểm tra nghĩa có tồn tại không
      const existingMeaning = await this.meaningRepository.findById(id)
      if (!existingMeaning) {
        throw MeaningNotFoundException
      }

      const meaning = await this.meaningRepository.update(id, data)
      this.logger.log(`Meaning updated successfully: ${meaning.id}`)
      return meaning
    } catch (error) {
      this.logger.error('Error updating meaning:', error)
      throw InvalidMeaningDataException
    }
  }

  async delete(id: number): Promise<void> {
    try {
      this.logger.log(`Deleting meaning: ${id}`)

      // Kiểm tra nghĩa có tồn tại không
      const existingMeaning = await this.meaningRepository.findById(id)
      if (!existingMeaning) {
        throw MeaningNotFoundException
      }

      await this.meaningRepository.delete(id)
      this.logger.log(`Meaning deleted successfully: ${id}`)
    } catch (error) {
      this.logger.error('Error deleting meaning:', error)
      throw InvalidMeaningDataException
    }
  }

  async deleteByVocabularyId(vocabularyId: number): Promise<{ count: number }> {
    try {
      this.logger.log(`Deleting meanings by vocabulary id: ${vocabularyId}`)
      const result = await this.meaningRepository.deleteByVocabularyId(vocabularyId)
      this.logger.log(`${result.count} meanings deleted for vocabulary: ${vocabularyId}`)
      return result
    } catch (error) {
      this.logger.error('Error deleting meanings by vocabulary id:', error)
      throw error
    }
  }

  /**
   * Tạo nghĩa với translations tự động
   */
  async createWithTranslations(
    vocabularyId: number,
    wordTypeId: number | undefined,
    meaningData: {
      meaningKey: string
      exampleSentenceKey?: string
      explanationKey?: string
      exampleSentenceJp?: string
    },
    translations: Record<string, Record<string, string>>
  ): Promise<MeaningType> {
    try {
      this.logger.log(
        `Creating meaning with translations for vocabulary: ${vocabularyId}`
      )

      // Tạo nghĩa
      const meaning = await this.meaningRepository.create({
        vocabularyId,
        wordTypeId,
        meaningKey: meaningData.meaningKey,
        exampleSentenceKey: meaningData.exampleSentenceKey,
        explanationKey: meaningData.explanationKey,
        exampleSentenceJp: meaningData.exampleSentenceJp
      })

      this.logger.log(`Meaning created successfully: ${meaning.id}`)
      return meaning
    } catch (error) {
      this.logger.error('Error creating meaning with translations:', error)
      throw InvalidMeaningDataException
    }
  }

  /**
   * Lấy nghĩa với translations đầy đủ
   */
  async findWithTranslations(id: number, languageCode: string = 'vi') {
    try {
      this.logger.log(
        `Finding meaning with translations: ${id}, language: ${languageCode}`
      )

      const meaning = await this.meaningRepository.findById(id)
      if (!meaning) {
        throw MeaningNotFoundException
      }

      // TODO: Implement logic to get translations using TranslationHelperService
      // This would require injecting TranslationHelperService

      return meaning
    } catch (error) {
      this.logger.error('Error finding meaning with translations:', error)
      throw error
    }
  }

  /**
   * Tự động generate meaning key
   */
  private generateMeaningKey(vocabularyId: number): string {
    return `meaning.${vocabularyId}.definition`
  }

  /**
   * Tự động generate example sentence key
   */
  private generateExampleSentenceKey(vocabularyId: number): string {
    return `meaning.${vocabularyId}.example`
  }

  /**
   * Tự động generate explanation key
   */
  private generateExplanationKey(vocabularyId: number): string {
    return `meaning.${vocabularyId}.explanation`
  }

  /**
   * Tự động generate tất cả keys cho một vocabulary
   */
  generateAllKeys(vocabularyId: number): {
    meaningKey: string
    exampleSentenceKey: string
    explanationKey: string
  } {
    return {
      meaningKey: this.generateMeaningKey(vocabularyId),
      exampleSentenceKey: this.generateExampleSentenceKey(vocabularyId),
      explanationKey: this.generateExplanationKey(vocabularyId)
    }
  }
}
