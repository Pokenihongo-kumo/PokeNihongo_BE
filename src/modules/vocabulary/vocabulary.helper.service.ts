import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import { KanjiService } from '@/modules/kanji/kanji.service'
import { MeaningService } from '@/modules/meaning/meaning.service'
import { TranslationService } from '@/modules/translation/translation.service'
import { LanguagesService } from '@/modules/languages/languages.service'
import { TRANSLATION_MESSAGE } from '@/common/constants/message'
import { MeaningAlreadyExistsException } from '@/modules/vocabulary/dto/vocabulary.error'
import type {
  TranslationItemType,
  ExampleTranslationType,
  TranslationsType
} from './dto/create-vocabulary-full.dto'

@Injectable()
export class VocabularyHelperService {
  private readonly logger = new Logger(VocabularyHelperService.name)

  constructor(
    private readonly prismaService: PrismaService,
    private readonly kanjiService: KanjiService,
    private readonly meaningService: MeaningService,
    private readonly translationService: TranslationService,
    private readonly languagesService: LanguagesService
  ) {}

  /**
   * Phát hiện và trích xuất các ký tự Kanji từ text tiếng Nhật
   */
  extractKanjiCharacters(text: string): string[] {
    // Regex để match các ký tự Kanji
    const kanjiRegex = /[\u4E00-\u9FAF\u3400-\u4DBF]/g
    const matches = text.match(kanjiRegex)

    // Loại bỏ trùng lặp và giữ thứ tự xuất hiện
    return matches ? Array.from(new Set(matches)) : []
  }

  /**
   * Tạo hoặc lấy Kanji đã tồn tại
   * @param character - Ký tự Kanji
   * @returns Kanji object với id
   */
  async findOrCreateKanji(character: string): Promise<{ id: number; character: string }> {
    try {
      // Kiểm tra Kanji đã tồn tại chưa
      // kanjiService.findByCharacter throws a 404 for a missing kanji, so the
      // create branch below never ran: look the kanji up directly
      let kanji: { id: number; character: string } | null =
        await this.prismaService.kanji.findUnique({
          where: { character },
          select: { id: true, character: true }
        })

      if (!kanji) {
        // Tạo Kanji mới với meaningKey tạm thời (sẽ được cập nhật sau)
        const tempMeaningKey = `kanji.temp.${Date.now()}.meaning`

        this.logger.log(`Creating new Kanji: ${character}`)
        kanji = await this.prismaService.kanji.create({
          data: {
            character,
            meaningKey: tempMeaningKey
          }
        })

        // Cập nhật meaningKey với ID thực tế
        const finalMeaningKey = `kanji.${kanji.id}.meaning`
        await this.prismaService.kanji.update({
          where: { id: kanji.id },
          data: { meaningKey: finalMeaningKey }
        })

        this.logger.log(`Kanji created successfully: ${character} with id ${kanji.id}`)
      }

      return { id: kanji.id, character: kanji.character }
    } catch (error) {
      this.logger.error(`Error finding or creating Kanji ${character}:`, error)
      throw error
    }
  }

  /**
   * Tìm hoặc tạo Kanji trong transaction
   * @param prisma - Prisma transaction client
   * @param character - Ký tự Kanji
   */
  async findOrCreateKanjiInTransaction(
    prisma: any,
    character: string
  ): Promise<{ id: number; character: string }> {
    try {
      // Kiểm tra Kanji đã tồn tại chưa trong transaction
      let kanji = await prisma.kanji.findUnique({
        where: { character }
      })

      if (!kanji) {
        // Tạo Kanji mới với meaningKey tạm thời trong transaction
        const tempMeaningKey = `kanji.temp.${Date.now()}.meaning`

        this.logger.log(`Creating new Kanji in transaction: ${character}`)
        kanji = await prisma.kanji.create({
          data: {
            character,
            meaningKey: tempMeaningKey
          }
        })

        // Cập nhật meaningKey với ID thực tế trong transaction
        const finalMeaningKey = `kanji.${kanji.id}.meaning`
        kanji = await prisma.kanji.update({
          where: { id: kanji.id },
          data: { meaningKey: finalMeaningKey }
        })

        this.logger.log(
          `Kanji created successfully in transaction: ${character} with id ${kanji.id}`
        )
      }

      return kanji
    } catch (error) {
      this.logger.error(
        `Error finding or creating Kanji ${character} in transaction:`,
        error
      )
      throw error
    }
  }

  /**
   * Liên kết Vocabulary với các Kanji đã được tạo/tìm thấy
   * @param vocabularyId - ID của vocabulary
   * @param kanjiCharacters - Mảng các ký tự Kanji
   */
  async linkVocabularyWithKanji(
    vocabularyId: number,
    kanjiCharacters: string[]
  ): Promise<void> {
    try {
      if (kanjiCharacters.length === 0) {
        this.logger.log(`No Kanji characters found in vocabulary ${vocabularyId}`)
        return
      }

      this.logger.log(
        `Linking vocabulary ${vocabularyId} with ${kanjiCharacters.length} Kanji characters`
      )

      // Tạo hoặc lấy tất cả Kanji
      const kanjiPromises = kanjiCharacters.map((char) => this.findOrCreateKanji(char))
      const kanjis = await Promise.all(kanjiPromises)

      // Tạo các liên kết trong bảng Vocabulary_Kanji
      const linkPromises = kanjis.map((kanji, index) => {
        return this.prismaService.vocabulary_Kanji.upsert({
          where: {
            vocabularyId_kanjiId: {
              vocabularyId,
              kanjiId: kanji.id
            }
          },
          create: {
            vocabularyId,
            kanjiId: kanji.id,
            displayOrder: index + 1 // Thứ tự xuất hiện của Kanji
          },
          update: {
            displayOrder: index + 1 // Cập nhật displayOrder nếu đã tồn tại
          }
        })
      })

      await Promise.all(linkPromises)
      this.logger.log(
        `Successfully linked vocabulary ${vocabularyId} with ${kanjis.length} Kanji`
      )
    } catch (error) {
      this.logger.error(`Error linking vocabulary with Kanji:`, error)
      throw error
    }
  }

  /**
   * Liên kết Vocabulary với Kanji trong transaction
   * @param prisma - Prisma transaction client
   * @param vocabularyId - ID của vocabulary
   * @param kanjiCharacters - Danh sách ký tự Kanji
   */
  async linkVocabularyWithKanjiInTransaction(
    prisma: any,
    vocabularyId: number,
    kanjiCharacters: string[]
  ): Promise<void> {
    try {
      if (kanjiCharacters.length === 0) {
        this.logger.log(`No Kanji characters found in vocabulary ${vocabularyId}`)
        return
      }

      this.logger.log(
        `Linking vocabulary ${vocabularyId} with ${kanjiCharacters.length} Kanji characters in transaction`
      )

      // Tạo hoặc lấy tất cả Kanji
      const kanjiPromises = kanjiCharacters.map((char) =>
        this.findOrCreateKanjiInTransaction(prisma, char)
      )
      const kanjis = await Promise.all(kanjiPromises)

      // Tạo các liên kết trong bảng Vocabulary_Kanji
      const linkPromises = kanjis.map((kanji, index) => {
        return prisma.vocabulary_Kanji.upsert({
          where: {
            vocabularyId_kanjiId: {
              vocabularyId,
              kanjiId: kanji.id
            }
          },
          create: {
            vocabularyId,
            kanjiId: kanji.id,
            displayOrder: index + 1 // Thứ tự xuất hiện của Kanji
          },
          update: {
            displayOrder: index + 1 // Cập nhật displayOrder nếu đã tồn tại
          }
        })
      })

      await Promise.all(linkPromises)
      this.logger.log(
        `Successfully linked vocabulary ${vocabularyId} with ${kanjis.length} Kanji in transaction`
      )
    } catch (error) {
      this.logger.error(`Error linking vocabulary with Kanji in transaction:`, error)
      throw error
    }
  }

  /**
   * Xử lý toàn bộ quy trình: phát hiện Kanji và liên kết với Vocabulary
   * @param vocabularyId - ID của vocabulary
   * @param wordJp - Từ tiếng Nhật
   */
  async processVocabularyKanji(vocabularyId: number, wordJp: string): Promise<void> {
    try {
      // 1. Trích xuất các ký tự Kanji
      const kanjiCharacters = this.extractKanjiCharacters(wordJp)

      if (kanjiCharacters.length === 0) {
        this.logger.log(`No Kanji found in word: ${wordJp}`)
        return
      }

      this.logger.log(
        `Found ${kanjiCharacters.length} Kanji characters in word: ${wordJp}`
      )
      this.logger.log(`Kanji characters: ${kanjiCharacters.join(', ')}`)

      // 2. Liên kết Vocabulary với các Kanji
      await this.linkVocabularyWithKanji(vocabularyId, kanjiCharacters)
    } catch (error) {
      this.logger.error(`Error processing vocabulary Kanji:`, error)
      throw error
    }
  }

  /**
   * Xử lý Kanji trong transaction (version cho transaction)
   * @param prisma - Prisma transaction client
   * @param vocabularyId - ID của vocabulary
   * @param wordJp - Từ tiếng Nhật
   */
  async processVocabularyKanjiInTransaction(
    prisma: any,
    vocabularyId: number,
    wordJp: string
  ): Promise<void> {
    try {
      // 1. Trích xuất các ký tự Kanji
      const kanjiCharacters = this.extractKanjiCharacters(wordJp)

      if (kanjiCharacters.length === 0) {
        this.logger.log(`No Kanji found in word: ${wordJp}`)
        return
      }

      this.logger.log(
        `Found ${kanjiCharacters.length} Kanji characters in word: ${wordJp}`
      )
      this.logger.log(`Kanji characters: ${kanjiCharacters.join(', ')}`)

      // 2. Liên kết Vocabulary với các Kanji trong transaction
      await this.linkVocabularyWithKanjiInTransaction(
        prisma,
        vocabularyId,
        kanjiCharacters
      )
    } catch (error) {
      this.logger.error(`Error processing vocabulary Kanji in transaction:`, error)
      throw error
    }
  }

  /**
   * Thêm nghĩa mới cho vocabulary đã tồn tại
   * @param vocabularyId - ID của vocabulary
   * @param meaningData - Dữ liệu nghĩa mới
   */
  async addMeaningToVocabulary(
    vocabularyId: number,
    meaningData: {
      wordTypeId?: number
      exampleSentenceJp?: string
    }
  ): Promise<any> {
    try {
      // Kiểm tra vocabulary có tồn tại không
      const vocabulary = await this.prismaService.vocabulary.findUnique({
        where: { id: vocabularyId }
      })

      if (!vocabulary) {
        throw new Error(`Vocabulary with id ${vocabularyId} not found`)
      }

      // Tạo meaningKey tự động
      const existingMeaningsCount = await this.prismaService.meaning.count({
        where: { vocabularyId }
      })

      const meaningKey = `vocabulary.${vocabularyId}.meaning.${existingMeaningsCount + 1}`
      const exampleSentenceKey = meaningData.exampleSentenceJp
        ? `vocabulary.${vocabularyId}.example.${existingMeaningsCount + 1}`
        : undefined

      // Tạo meaning mới
      const meaning = await this.meaningService.create({
        vocabularyId,
        wordTypeId: meaningData.wordTypeId,
        exampleSentenceJp: meaningData.exampleSentenceJp
      })

      this.logger.log(`Added new meaning to vocabulary ${vocabularyId}`)
      return meaning
    } catch (error) {
      this.logger.error(`Error adding meaning to vocabulary:`, error)
      throw error
    }
  }

  /**
   * Kiểm tra vocabulary có tồn tại không (theo wordJp và reading)
   */
  async checkVocabularyExists(
    wordJp: string
  ): Promise<{ exists: boolean; vocabularyId?: number }> {
    try {
      const vocabulary = await this.prismaService.vocabulary.findFirst({
        where: {
          wordJp
        },
        select: {
          id: true
        }
      })

      return {
        exists: !!vocabulary,
        vocabularyId: vocabulary?.id
      }
    } catch (error) {
      this.logger.error(`Error checking vocabulary existence:`, error)
      throw error
    }
  }

  /**
   * Kiểm tra xem đã có meaning tương tự chưa
   */
  private async checkDuplicateMeaning(
    prisma: any,
    vocabularyId: number,
    translations: TranslationsType
  ) {
    try {
      this.logger.log(`Checking duplicate meaning for vocabulary ${vocabularyId}`)
      this.logger.log(`New translations:`, JSON.stringify(translations.meaning))

      // Lấy tất cả meanings của vocabulary này
      const existingMeanings = await prisma.meaning.findMany({
        where: { vocabularyId }
      })

      this.logger.log(`Found ${existingMeanings.length} existing meanings`)

      // Kiểm tra từng meaning xem có trùng không
      for (const meaning of existingMeanings) {
        // Lấy tất cả translations cho meaning này (không giới hạn theo meaning ID cụ thể)
        // Vì có thể translations được lưu với key khác nhau
        const meaningTranslations = await prisma.translation.findMany({
          where: {
            key: {
              startsWith: `vocabulary.${vocabularyId}.meaning.`
            },
            language: {
              code: {
                in: translations.meaning.map((t) => t.language_code)
              }
            }
          },
          include: {
            language: true
          }
        })

        // Filter translations that belong to this specific meaning
        // We need to check all possible meaning IDs for this vocabulary
        const possibleMeaningTranslations = meaningTranslations.filter((t) => {
          const keyParts = t.key.split('.')
          const meaningIdFromKey = parseInt(keyParts[keyParts.length - 1])
          return meaningIdFromKey === meaning.id
        })

        this.logger.log(
          `Meaning ${meaning.id} has ${possibleMeaningTranslations.length} translations`
        )
        this.logger.log(
          `Existing translations:`,
          JSON.stringify(
            possibleMeaningTranslations.map((t) => ({
              language_code: t.language.code,
              value: t.value
            }))
          )
        )

        // Nếu meaning cũ không có translations, bỏ qua (không phải duplicate)
        if (possibleMeaningTranslations.length === 0) {
          this.logger.log(
            `Meaning ${meaning.id}: No translations found, skipping comparison`
          )
          continue
        }

        // So sánh số lượng translations
        if (possibleMeaningTranslations.length !== translations.meaning.length) {
          this.logger.log(
            `Meaning ${meaning.id}: Translation count mismatch (${possibleMeaningTranslations.length} vs ${translations.meaning.length})`
          )
          continue
        }

        // So sánh nội dung translations bằng value (không phải key)
        let isDuplicate = true
        for (const newTranslation of translations.meaning) {
          const existingTranslation = possibleMeaningTranslations.find(
            (t) => t.language.code === newTranslation.language_code
          )

          this.logger.log(
            `Comparing ${newTranslation.language_code}: "${newTranslation.value}" vs "${existingTranslation?.value || 'NOT_FOUND'}"`
          )

          if (
            !existingTranslation ||
            existingTranslation.value !== newTranslation.value
          ) {
            isDuplicate = false
            break
          }
        }

        // Nếu tìm thấy duplicate, return meaning đó
        if (isDuplicate) {
          this.logger.log(`Found duplicate meaning with ID: ${meaning.id}`)
          return meaning
        } else {
          this.logger.log(`Meaning ${meaning.id} is not a duplicate`)
        }
      }

      this.logger.log(`No duplicate meaning found`)
      return null
    } catch (error) {
      this.logger.error(`Error checking duplicate meaning:`, error)
      throw error
    }
  }

  /**
   * Lấy languageId từ language_code
   */
  private async getLanguageId(languageCode: string): Promise<number> {
    const language = await this.languagesService.findByCode({ code: languageCode })
    return language.data.id
  }

  /**
   * Tạo vocabulary với đầy đủ translations (meanings + examples)
   * @param vocabularyData - Dữ liệu vocabulary cơ bản
   * @param translations - Object chứa meanings và examples translations
   * @param wordTypeId - ID của loại từ
   */
  async createVocabularyWithTranslations(
    vocabularyData: {
      wordJp: string
      reading: string
      levelN?: number
      audioUrl?: string
      imageUrl?: string
      createdById?: number
    },
    translations: TranslationsType,
    wordTypeId?: number
  ) {
    // Sử dụng transaction để đảm bảo rollback nếu có lỗi
    return await this.prismaService.$transaction(async (prisma) => {
      try {
        this.logger.log(
          'Starting transaction: Creating vocabulary with full translations'
        )

        // 1. Tạo vocabulary
        const vocabulary = await prisma.vocabulary.create({
          data: {
            wordJp: vocabularyData.wordJp,
            reading: vocabularyData.reading,
            levelN: vocabularyData.levelN,
            audioUrl: vocabularyData.audioUrl,
            imageUrl: vocabularyData.imageUrl,
            wordTypeId: wordTypeId || undefined, // Chỉ set nếu có giá trị
            createdById: vocabularyData.createdById
          }
        })

        this.logger.log(`Vocabulary created with ID: ${vocabulary.id}`)

        // 2. Xử lý Kanji tự động (không rollback nếu lỗi Kanji)
        try {
          await this.processVocabularyKanjiInTransaction(
            prisma,
            vocabulary.id,
            vocabulary.wordJp
          )
        } catch (kanjiError) {
          this.logger.warn(
            `Failed to process Kanji (continuing without rollback):`,
            kanjiError
          )
        }

        // 3. Tạo meaning với translations
        const meaningKey = `vocabulary.${vocabulary.id}.meaning.1`
        const exampleSentenceKey =
          translations.examples && translations.examples.length > 0
            ? `vocabulary.${vocabulary.id}.example.1`
            : undefined

        // Lấy câu ví dụ tiếng Nhật đầu tiên (nếu có)
        const exampleSentenceJp =
          translations.examples && translations.examples.length > 0
            ? translations.examples[0].original_sentence
            : undefined

        const meaning = await prisma.meaning.create({
          data: {
            vocabularyId: vocabulary.id,
            wordTypeId: wordTypeId || undefined,
            meaningKey,
            exampleSentenceKey,
            exampleSentenceJp
          }
        })

        this.logger.log(`Meaning created with ID: ${meaning.id}`)

        // 4. Tạo translations cho meaning (convert language_code → languageId)
        const meaningTranslations = await Promise.all(
          translations.meaning.map(async (item) => ({
            languageId: await this.getLanguageId(item.language_code),
            key: meaningKey,
            value: item.value
          }))
        )

        // 5. Tạo translations cho examples (nếu có)
        // Cấu trúc mới: examples có original_sentence và translations array
        const exampleTranslations =
          translations.examples && exampleSentenceKey
            ? (
                await Promise.all(
                  translations.examples.map(
                    async (example) =>
                      await Promise.all(
                        example.translations.map(async (translation) => ({
                          languageId: await this.getLanguageId(translation.language_code),
                          key: exampleSentenceKey,
                          value: translation.sentence
                        }))
                      )
                  )
                )
              ).flat()
            : []

        // 6. Bulk create tất cả translations
        const allTranslations = [...meaningTranslations, ...exampleTranslations]

        if (allTranslations.length > 0) {
          await prisma.translation.createMany({
            data: allTranslations,
            skipDuplicates: true // Tránh lỗi nếu translation đã tồn tại
          })
          this.logger.log(
            `Bulk create translations successful: ${allTranslations.length} records`
          )
        }

        // 7. Trả về vocabulary với thông tin đầy đủ
        this.logger.log('Transaction completed successfully')
        return {
          vocabulary,
          meaning,
          translationsCreated: allTranslations.length
        }
      } catch (error) {
        this.logger.error('Error in transaction - rolling back:', error)
        throw error // Transaction sẽ tự động rollback
      }
    })
  }

  /**
   * Thêm nghĩa mới với translations cho vocabulary đã tồn tại
   */
  async addMeaningWithTranslations(
    vocabularyId: number,
    translations: TranslationsType,
    wordTypeId?: number
  ) {
    // Sử dụng transaction để đảm bảo rollback nếu có lỗi
    return await this.prismaService.$transaction(async (prisma) => {
      try {
        this.logger.log(
          `Starting transaction: Adding new meaning with translations to vocabulary ${vocabularyId}`
        )

        // Kiểm tra vocabulary có tồn tại không
        const vocabulary = await prisma.vocabulary.findUnique({
          where: { id: vocabularyId }
        })

        if (!vocabulary) {
          throw new Error(`Vocabulary with id ${vocabularyId} not found`)
        }

        // Kiểm tra trực tiếp bằng value trong DB: có translation nào trùng value không?
        this.logger.log(`Checking for existing translation by value...`)

        for (const newTrans of translations.meaning) {
          const languageId = await this.getLanguageId(newTrans.language_code)
          const duplicateTranslation = await prisma.translation.findFirst({
            where: {
              languageId,
              value: newTrans.value,
              key: {
                startsWith: `vocabulary.${vocabularyId}.meaning.`
              }
            }
          })

          if (duplicateTranslation) {
            this.logger.log(
              `Found duplicate translation with same value: "${newTrans.value}" (key: ${duplicateTranslation.key})`
            )
            throw new MeaningAlreadyExistsException()
          }
        }

        this.logger.log(
          `No duplicate translation value found, proceeding to create new meaning`
        )

        // Đếm số meanings hiện có
        const existingMeaningsCount = await prisma.meaning.count({
          where: { vocabularyId }
        })

        const meaningIndex = existingMeaningsCount + 1
        const meaningKey = `vocabulary.${vocabularyId}.meaning.${meaningIndex}`
        const exampleSentenceKey =
          translations.examples && translations.examples.length > 0
            ? `vocabulary.${vocabularyId}.example.${meaningIndex}`
            : undefined

        const exampleSentenceJp =
          translations.examples && translations.examples.length > 0
            ? translations.examples[0].original_sentence
            : undefined

        // Tạo meaning mới
        const meaning = await prisma.meaning.create({
          data: {
            vocabularyId,
            wordTypeId: wordTypeId || undefined, // Chỉ set nếu có giá trị
            meaningKey,
            exampleSentenceKey,
            exampleSentenceJp
          }
        })

        this.logger.log(`Meaning created with ID: ${meaning.id}`)

        // Tạo translations cho meaning (convert language_code → languageId)
        const meaningTranslations = await Promise.all(
          translations.meaning.map(async (item) => ({
            languageId: await this.getLanguageId(item.language_code),
            key: meaningKey,
            value: item.value
          }))
        )

        // Tạo translations cho examples (nếu có)
        // Cấu trúc mới: examples có original_sentence và translations array
        const exampleTranslations =
          translations.examples && exampleSentenceKey
            ? (
                await Promise.all(
                  translations.examples.map(
                    async (example) =>
                      await Promise.all(
                        example.translations.map(async (translation) => ({
                          languageId: await this.getLanguageId(translation.language_code),
                          key: exampleSentenceKey,
                          value: translation.sentence
                        }))
                      )
                  )
                )
              ).flat()
            : []

        // Bulk create translations
        const allTranslations = [...meaningTranslations, ...exampleTranslations]

        if (allTranslations.length > 0) {
          await prisma.translation.createMany({
            data: allTranslations,
            skipDuplicates: true
          })
          this.logger.log(
            `Bulk create translations successful for new meaning: ${allTranslations.length} records`
          )
        }

        this.logger.log('Transaction completed successfully for adding meaning')
        return {
          meaning,
          translationsCreated: allTranslations.length
        }
      } catch (error) {
        this.logger.error('Error in transaction - rolling back:', error)
        throw error // Transaction sẽ tự động rollback
      }
    })
  }
}
