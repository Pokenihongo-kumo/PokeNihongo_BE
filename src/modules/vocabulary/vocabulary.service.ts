import { TextToSpeechService } from '@/modules/speech/text-to-speech.service'
import { UploadService } from '@/modules/upload/upload.service'
import { hasJapaneseText } from '@/common/utils/japanese-text'
import { LanguagesService } from '@/modules/languages/languages.service'
import { MeaningService } from '@/modules/meaning/meaning.service'
import { TranslationService } from '@/modules/translation/translation.service'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'
import { Injectable, Logger } from '@nestjs/common'
import * as XLSX from 'xlsx'
import {
  InvalidVocabularyDataException,
  VocabularyAlreadyExistsException,
  VocabularyJapaneseTextInvalidException,
  VocabularyNotFoundException
} from './dto/vocabulary.error'
import { GetVocabularyListQuery, UpdateVocabularyBody } from './dto/vocabulary.zod-dto'
import { VocabularyHelperService } from './vocabulary.helper.service'
import { VocabularyRepo } from './vocabulary.repo'

@Injectable()
export class VocabularyService {
  private readonly logger = new Logger(VocabularyService.name)

  constructor(
    private readonly vocabularyRepository: VocabularyRepo,
    private readonly uploadService: UploadService,
    private readonly textToSpeechService: TextToSpeechService,
    private readonly vocabularyHelperService: VocabularyHelperService,
    private readonly meaningService: MeaningService,
    private readonly translationService: TranslationService,
    private readonly languagesService: LanguagesService
  ) {}

  // Removed old create method - use createFullVocabularyWithFiles instead

  //#region Find All
  async findAll(query: GetVocabularyListQuery, lang: string) {
    try {
      const { currentPage, pageSize, search, levelN, lessonId, sortBy, sort } = query

      const result = await this.vocabularyRepository.findMany({
        currentPage,
        pageSize,
        search,
        levelN,
        lessonId,
        sortBy,
        sort
      })

      // Resolve translation values for wordType.nameKey per requested language
      let languageId: number | undefined
      try {
        const language = await this.languagesService.findByCode({ code: lang })
        languageId = language?.id
      } catch {
        languageId = undefined
      }

      const resultsWithWordType = await Promise.all(
        result.items.map(async (item) => {
          if (!item.wordType || !languageId) {
            return item
          }

          try {
            const translation = await this.translationService.findByKeyAndLanguage(
              item.wordType.nameKey,
              languageId as number
            )
            const name = translation?.value || item.wordType.nameKey
            return {
              ...item,
              wordType: {
                ...item.wordType,
                name
              }
            }
          } catch {
            return {
              ...item,
              wordType: {
                ...item.wordType,
                name: item.wordType.nameKey
              }
            }
          }
        })
      )

      return {
        results: resultsWithWordType,
        pagination: {
          current: result.page,
          pageSize: result.limit,
          totalPage: Math.ceil(result.total / result.limit),
          totalItem: result.total
        }
      }
    } catch (error) {
      this.logger.error('Error in findAll vocabulary:', error)
      throw error
    }
  }
  //#endregion

  //#endregion

  //#endregion

  //#region Statistics
  async getStatistics() {
    const stats = await this.vocabularyRepository.getStatistics()

    return stats
  }
  //#endregion

  //#region Find One
  async findOne(id: number, lang: string) {
    const vocabulary = await this.vocabularyRepository.findUnique({
      id
    })

    if (!vocabulary) {
      throw new VocabularyNotFoundException()
    }

    // Resolve wordType translation if present
    let vocabularyWithWordType = vocabulary
    if (vocabulary.wordType) {
      try {
        const language = await this.languagesService.findByCode({ code: lang })
        if (language?.id) {
          const translation = await this.translationService.findByKeyAndLanguage(
            vocabulary.wordType.nameKey,
            language.id
          )
          const name = translation?.value || vocabulary.wordType.nameKey
          vocabularyWithWordType = {
            ...vocabulary,
            wordType: {
              ...vocabulary.wordType,
              name
            }
          }
        }
      } catch {
        // Keep original wordType if translation fails
        vocabularyWithWordType = {
          ...vocabulary,
          wordType: {
            ...vocabulary.wordType,
            name: vocabulary.wordType.nameKey
          }
        }
      }
    }

    return vocabularyWithWordType
  }

  async findByWordJp(wordJp: string) {
    const vocabulary = await this.vocabularyRepository.findFirst({
      wordJp
    })

    return vocabulary ?? null
  }

  async findOneDetail(id: number, lang: string, userId?: number) {
    const vocabulary = await this.vocabularyRepository.findUnique({
      id
    })

    if (!vocabulary) {
      throw new VocabularyNotFoundException()
    }

    // Get language ID
    let languageId: number | undefined
    try {
      const language = await this.languagesService.findByCode({ code: lang })
      languageId = language?.id
    } catch {
      languageId = undefined
    }

    // Get all meanings with translations
    const meanings = await this.meaningService.findByVocabularyId(vocabulary.id)
    const meaningsWithTranslations = await Promise.all(
      meanings.map(async (meaning: any) => {
        let meaningText = ''
        let exampleSentence = ''

        if (meaning.meaningKey && languageId) {
          try {
            const translation = await this.translationService.findByKeyAndLanguage(
              meaning.meaningKey,
              languageId
            )
            meaningText = translation?.value || ''
          } catch {
            meaningText = ''
          }
        }

        if (meaning.exampleSentenceKey && languageId) {
          try {
            const translation = await this.translationService.findByKeyAndLanguage(
              meaning.exampleSentenceKey,
              languageId
            )
            exampleSentence = translation?.value || ''
          } catch {
            exampleSentence = ''
          }
        }

        // Resolve wordType for meaning if exists
        let meaningWordType = null
        if (meaning.wordType && languageId) {
          try {
            const translation = await this.translationService.findByKeyAndLanguage(
              meaning.wordType.nameKey,
              languageId
            )
            meaningWordType = translation?.value || meaning.wordType.nameKey
          } catch {
            meaningWordType = meaning.wordType?.nameKey || null
          }
        }

        return {
          id: meaning.id,
          meaning: meaningText,
          exampleSentenceJp: meaning.exampleSentenceJp || null,
          exampleSentence: exampleSentence || null,
          wordType: meaningWordType
        }
      })
    )

    // Resolve wordType translation for vocabulary
    let wordTypeName: string = ''
    if (vocabulary.wordType) {
      if (languageId) {
        try {
          const translation = await this.translationService.findByKeyAndLanguage(
            vocabulary.wordType.nameKey,
            languageId
          )
          if (translation?.value) {
            wordTypeName = translation.value
          } else {
            // Fallback: thử lấy translation tiếng Việt nếu không có translation cho ngôn ngữ hiện tại
            try {
              const viLanguage = await this.languagesService.findByCode({ code: 'vi' })
              if (viLanguage?.id) {
                const viTranslation = await this.translationService.findByKeyAndLanguage(
                  vocabulary.wordType.nameKey,
                  viLanguage.id
                )
                wordTypeName = viTranslation?.value || ''
              }
            } catch {
              wordTypeName = ''
            }
          }
        } catch {
          wordTypeName = ''
        }
      }
    }

    // Get Kanji meanings (Hán Việt) - gộp thành một chuỗi
    let kanjiMeaning: string = ''
    if ((vocabulary as any).kanji && (vocabulary as any).kanji.length > 0) {
      // Get Vietnamese language ID for Han Viet
      let viLanguageId: number | undefined
      try {
        const viLanguage = await this.languagesService.findByCode({ code: 'vi' })
        viLanguageId = viLanguage?.id
      } catch {
        viLanguageId = undefined
      }

      if (viLanguageId) {
        const kanjiMeanings = await Promise.all(
          (vocabulary as any).kanji.map(async (vk: any) => {
            let hanVietMeaning = ''
            if (vk.kanji?.meaningKey) {
              try {
                const translation = await this.translationService.findByKeyAndLanguage(
                  vk.kanji.meaningKey,
                  viLanguageId
                )
                const rawMeaning = translation?.value || ''
                // Lấy phần trước dấu chấm đầu tiên (ví dụ: "NAM. Con trai." → "NAM")
                const firstPart = rawMeaning.split('.')[0]?.trim() || ''
                if (firstPart) {
                  // Lấy phần trước dấu chấm (bỏ phần sau)
                  hanVietMeaning = firstPart
                } else {
                  hanVietMeaning = ''
                }
              } catch {
                hanVietMeaning = ''
              }
            }
            return hanVietMeaning
          })
        )
        // Gộp tất cả các nghĩa thành một chuỗi, cách nhau bằng dấu cách
        kanjiMeaning = kanjiMeanings.filter((m) => m).join(' ')
      }
    }

    // Get related words
    const relatedWordsData = await this.vocabularyRepository.findRelatedWords(
      vocabulary.wordJp,
      vocabulary.id,
      10
    )
    const relatedWords = await Promise.all(
      relatedWordsData.map(async (vocab) => {
        let meaning = ''
        if (vocab.meanings && vocab.meanings.length > 0 && languageId) {
          const firstMeaning = vocab.meanings[0]
          if (firstMeaning.meaningKey) {
            try {
              const translation = await this.translationService.findByKeyAndLanguage(
                firstMeaning.meaningKey,
                languageId
              )
              meaning = translation?.value || ''
            } catch {
              meaning = ''
            }
          }
        }

        return {
          id: vocab.id,
          wordJp: vocab.wordJp,
          reading: vocab.reading,
          meaning
        }
      })
    )

    // Save search history if user is logged in (lưu với wordJp của vocabulary)
    if (userId && vocabulary.wordJp.trim()) {
      try {
        await this.vocabularyRepository.saveSearchHistory(
          userId,
          vocabulary.wordJp.trim(),
          vocabulary.id
        )
      } catch (error) {
        // Log error but don't fail the request
        this.logger.warn(`Failed to save search history: ${error}`)
      }
    }

    return {
      id: vocabulary.id,
      wordJp: vocabulary.wordJp,
      reading: vocabulary.reading,
      audioUrl: vocabulary.audioUrl || null,
      imageUrl: vocabulary.imageUrl || null,
      levelN: vocabulary.levelN || null,
      wordType: wordTypeName,
      kanjiMeaning: kanjiMeaning,
      meanings: meaningsWithTranslations,
      relatedWords
    }
  }

  async search(
    searchKeyword: string,
    lang: string,
    currentPage: number,
    pageSize: number,
    userId?: number
  ) {
    try {
      // Search vocabulary
      const result = await this.vocabularyRepository.search(
        searchKeyword,
        currentPage,
        pageSize
      )

      // Get language ID
      let languageId: number | undefined
      try {
        const language = await this.languagesService.findByCode({ code: lang })
        languageId = language?.id
      } catch {
        languageId = undefined
      }

      // Map results to include only wordJp, reading, and meaning
      const results = await Promise.all(
        result.items.map(async (vocab) => {
          // Get the first meaning's translation for the requested language
          let meaning = ''
          if (vocab.meanings && vocab.meanings.length > 0 && languageId) {
            const firstMeaning = vocab.meanings[0]
            if (firstMeaning.meaningKey) {
              try {
                const translation = await this.translationService.findByKeyAndLanguage(
                  firstMeaning.meaningKey,
                  languageId
                )
                meaning = translation?.value || ''
              } catch {
                // If translation not found, leave empty
                meaning = ''
              }
            }
          }

          return {
            id: vocab.id,
            wordJp: vocab.wordJp,
            reading: vocab.reading,
            meaning
          }
        })
      )

      return {
        results,
        pagination: {
          current: result.page,
          pageSize: result.limit,
          totalPage: Math.ceil(result.total / result.limit),
          totalItem: result.total
        }
      }
    } catch (error) {
      this.logger.error('Error in search vocabulary:', error)
      throw error
    }
  }
  //#endregion

  //#region Search History
  async getSearchHistory(
    userId: number,
    currentPage: number,
    pageSize: number,
    lang: string
  ) {
    try {
      const result = await this.vocabularyRepository.findSearchHistory(
        userId,
        currentPage,
        pageSize
      )

      // Get language ID
      let languageId: number | undefined
      try {
        const language = await this.languagesService.findByCode({ code: lang })
        languageId = language?.id
      } catch {
        languageId = undefined
      }

      // Map results với meaning nếu có vocabulary
      const results = await Promise.all(
        result.items.map(async (item) => {
          return {
            id: item.id,
            searchKeyword: item.searchKeyword,
            createdAt: item.createdAt
          }
        })
      )

      return {
        results,
        pagination: {
          current: result.page,
          pageSize: result.limit,
          totalPage: Math.ceil(result.total / result.limit),
          totalItem: result.total
        }
      }
    } catch (error) {
      this.logger.error('Error in get search history:', error)
      throw error
    }
  }
  //#endregion

  //#region Update
  async update(
    id: number,
    body: UpdateVocabularyBody,
    imageFile?: Express.Multer.File,
    audioFile?: Express.Multer.File,
    regenerateAudio?: boolean
  ) {
    try {
      // Get existing vocabulary to get old URLs
      const existingVocabulary = await this.vocabularyRepository.findUnique({ id })
      if (!existingVocabulary) {
        throw new VocabularyNotFoundException()
      }

      // Upload new files if provided and get URLs
      const uploadResults = await this.uploadVocabularyFiles(
        imageFile,
        audioFile,
        existingVocabulary.imageUrl || undefined,
        existingVocabulary.audioUrl || undefined
      )

      let finalAudioUrl = uploadResults.audioUrl || existingVocabulary.audioUrl

      // If no audio file uploaded AND regenerateAudio=true → Gen new audio using TTS
      if (!audioFile && regenerateAudio && body.wordJp) {
        this.logger.log('Regenerating audio using TTS...')
        try {
          const ttsResult = await this.textToSpeechService.convertTextToSpeech(
            body.wordJp,
            { languageCode: 'ja-JP', audioEncoding: 'MP3' }
          )

          const audioBuffer = ttsResult.audioContent
          const fileName = `vocabulary_${body.wordJp}_${Date.now()}.mp3`

          const generatedAudioFile: Express.Multer.File = {
            buffer: audioBuffer,
            originalname: fileName,
            mimetype: 'audio/mpeg',
            fieldname: 'audioFile',
            encoding: '7bit',
            size: audioBuffer.length,
            stream: null as any,
            destination: '',
            filename: fileName,
            path: ''
          }

          const uploadResult = await this.uploadService.uploadFile(
            generatedAudioFile,
            'vocabulary/audio'
          )
          finalAudioUrl = uploadResult.url
          this.logger.log(`Audio regenerated via TTS: ${finalAudioUrl}`)
        } catch (ttsError) {
          this.logger.warn('Failed to regenerate audio using TTS:', ttsError)
        }
      }

      // Update vocabulary with new URLs
      const updateData = {
        ...body,
        imageUrl: uploadResults.imageUrl || existingVocabulary.imageUrl,
        audioUrl: finalAudioUrl
      }

      // If wordJp is being updated, check for duplicates
      if (updateData.wordJp && updateData.wordJp !== existingVocabulary.wordJp) {
        const duplicateVocabulary = await this.vocabularyRepository.findFirst({
          wordJp: updateData.wordJp
        })
        if (duplicateVocabulary && duplicateVocabulary.id !== id) {
          throw new VocabularyAlreadyExistsException()
        }
      }

      const vocabulary = await this.vocabularyRepository.update(
        { id },
        {
          ...updateData,
          imageUrl: updateData.imageUrl || undefined,
          audioUrl: updateData.audioUrl || undefined
        }
      )

      return vocabulary
    } catch (error) {
      // If it's our custom exceptions, re-throw them
      if (
        error instanceof VocabularyNotFoundException ||
        error instanceof VocabularyAlreadyExistsException
      ) {
        throw error
      }
      // Handle database errors
      if (isNotFoundPrismaError(error)) {
        throw new VocabularyNotFoundException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new VocabularyAlreadyExistsException()
      }
      this.logger.error('Error updating vocabulary:', error)
      throw new InvalidVocabularyDataException()
    }
  }
  //#endregion

  //#region Remove
  async remove(id: number) {
    try {
      const vocabulary = await this.vocabularyRepository.delete({ id })

      return vocabulary
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new VocabularyNotFoundException()
      }
      this.logger.error('Error deleting vocabulary:', error)
      throw new InvalidVocabularyDataException()
    }
  }
  //#endregion

  //#region File Upload Methods
  async uploadVocabularyImage(imageFile: Express.Multer.File, oldImageUrl?: string) {
    try {
      const imageUrl = await this.uploadService.uploadVocabularyImage(
        imageFile,
        oldImageUrl
      )
      return { imageUrl }
    } catch (error) {
      this.logger.error('Error uploading vocabulary image:', error)
      throw new Error('Upload hình ảnh thất bại')
    }
  }

  async uploadVocabularyAudio(audioFile: Express.Multer.File, oldAudioUrl?: string) {
    try {
      const audioUrl = await this.uploadService.uploadVocabularyAudio(
        audioFile,
        oldAudioUrl
      )
      return { audioUrl }
    } catch (error) {
      this.logger.error('Error uploading vocabulary audio:', error)
      throw new Error('Upload âm thanh thất bại')
    }
  }

  async uploadVocabularyFiles(
    imageFile?: Express.Multer.File,
    audioFile?: Express.Multer.File,
    oldImageUrl?: string,
    oldAudioUrl?: string
  ) {
    try {
      const results = await this.uploadService.uploadVocabularyFiles(
        imageFile,
        audioFile,
        oldImageUrl,
        oldAudioUrl
      )
      return results
    } catch (error) {
      this.logger.error('Error uploading vocabulary files:', error)
      throw new Error('Upload files thất bại')
    }
  }

  //#endregion

  //#region Add Meaning to Existing Vocabulary
  /**
   * Thêm nghĩa mới cho từ vựng đã tồn tại
   */
  async addMeaningToExistingVocabulary(
    vocabularyId: number,
    meaningData: {
      wordTypeId?: number
      exampleSentenceJp?: string
    }
  ) {
    try {
      this.logger.log(`Adding new meaning to vocabulary ${vocabularyId}`)

      // Kiểm tra vocabulary có tồn tại không
      const vocabulary = await this.vocabularyRepository.findUnique({ id: vocabularyId })
      if (!vocabulary) {
        throw new VocabularyNotFoundException()
      }

      // Thêm meaning mới
      const meaning = await this.vocabularyHelperService.addMeaningToVocabulary(
        vocabularyId,
        meaningData
      )

      return meaning
    } catch (error) {
      this.logger.error(`Error adding meaning to vocabulary ${vocabularyId}:`, error)
      if (error instanceof VocabularyNotFoundException) {
        throw error
      }
      throw new Error('Không thể thêm nghĩa mới')
    }
  }

  // Removed createOrAddMeaning - use createFullVocabularyWithFiles instead
  //#endregion

  //#region Create Full Vocabulary with Translations
  /**
   * Tạo vocabulary hoàn chỉnh với file uploads (audio + image)
   */
  async createFullVocabularyWithFiles(
    data: {
      word_jp: string
      reading: string
      level_n?: number
      word_type_id?: number
      translations:
        | string
        | {
            meaning: Array<{ language_code: string; value: string }>
            examples?: Array<{
              original_sentence: string
              translations: Array<{ language_code: string; sentence: string }>
            }>
          }
    },
    audioFile?: Express.Multer.File,
    imageFile?: Express.Multer.File,
    createdById?: number,
    allowUpdateExistingLevel?: boolean
  ) {
    try {
      // Validate word_jp must be Japanese (Hiragana/Katakana/Kanji)
      if (!this.isJapaneseText(data.word_jp)) {
        throw new VocabularyJapaneseTextInvalidException()
      }
      this.logger.log('Creating full vocabulary with file uploads')

      // Parse translations if it's a string (from multipart/form-data)
      let parsedTranslations: {
        meaning: Array<{ language_code: string; value: string }>
        examples?: Array<{
          original_sentence: string
          translations: Array<{ language_code: string; sentence: string }>
        }>
      }

      if (typeof data.translations === 'string') {
        this.logger.log('Parsing translations from JSON string')
        parsedTranslations = JSON.parse(data.translations)
      } else {
        parsedTranslations = data.translations
      }

      this.logger.log('Parsed translations:', parsedTranslations)

      // 1. Upload files if provided, or generate audio using TTS
      let audioUrl: string | undefined
      let imageUrl: string | undefined

      if (audioFile) {
        this.logger.log('Uploading audio file...')
        const audioResult = await this.uploadService.uploadFile(
          audioFile,
          'vocabulary/audio'
        )
        audioUrl = audioResult.url
        this.logger.log(`Audio uploaded: ${audioUrl}`)
      } else {
        // Generate audio using text-to-speech if no audio file provided
        this.logger.log('No audio file provided, generating audio using TTS...')
        const generatedAudioUrl = await this.textToSpeechService.generateAudioFromText(
          data.word_jp,
          'vocabulary',
          'vocabulary'
        )
        audioUrl = generatedAudioUrl || undefined
      }

      if (imageFile) {
        this.logger.log('Uploading image file...')
        const imageResult = await this.uploadService.uploadFile(
          imageFile,
          'vocabulary/images'
        )
        imageUrl = imageResult.url
        this.logger.log(`Image uploaded: ${imageUrl}`)
      }

      // 2. Check vocabulary exists
      const existingCheck = await this.vocabularyHelperService.checkVocabularyExists(
        data.word_jp
      )

      if (existingCheck.exists && existingCheck.vocabularyId) {
        // Vocabulary exists → Add new meaning with translations
        this.logger.log(
          `Vocabulary already exists (ID: ${existingCheck.vocabularyId}), adding new meaning with translations`
        )

        const result = await this.vocabularyHelperService.addMeaningWithTranslations(
          existingCheck.vocabularyId,
          parsedTranslations,
          data.word_type_id
        )

        // Get full vocabulary information
        const vocabulary = await this.vocabularyRepository.findUnique({
          id: existingCheck.vocabularyId
        })
        if (!vocabulary) {
          throw new VocabularyNotFoundException()
        }

        if (
          allowUpdateExistingLevel &&
          data.level_n !== undefined &&
          data.level_n !== null
        ) {
          if (vocabulary.levelN !== data.level_n) {
            await this.vocabularyRepository.update(
              { id: vocabulary.id },
              { levelN: data.level_n }
            )
            vocabulary.levelN = data.level_n
          }
        }

        // Tạo response với meaning và examples cho trường hợp vocabulary đã tồn tại
        const meaning = parsedTranslations.meaning.map((m) => ({
          language_code: m.language_code,
          value: m.value
        }))

        const examples = parsedTranslations.examples || []

        return {
          data: {
            vocabulary: {
              ...vocabulary,
              imageUrl: imageUrl ?? vocabulary.imageUrl ?? null,
              audioUrl: audioUrl ?? vocabulary.audioUrl ?? null
            },
            meaning: {
              id: result.meaning.id,
              translations: meaning,
              examples: examples
            },
            translationsCreated: result.translationsCreated,
            isNew: false
          },
          meaningAdded: true
        }
      } else {
        // Vocabulary doesn't exist → Create new
        this.logger.log(
          'Creating new vocabulary with full translations and uploaded files'
        )

        const result =
          await this.vocabularyHelperService.createVocabularyWithTranslations(
            {
              wordJp: data.word_jp,
              reading: data.reading,
              levelN: data.level_n,
              audioUrl,
              imageUrl,
              createdById: createdById || undefined
            },
            parsedTranslations,
            data.word_type_id
          )

        // Tạo response với meaning và examples
        const meaning = parsedTranslations.meaning.map((m) => ({
          language_code: m.language_code,
          value: m.value
        }))

        const examples = parsedTranslations.examples || []

        return {
          data: {
            vocabulary: {
              ...result.vocabulary,
              imageUrl: imageUrl ?? null,
              audioUrl: audioUrl ?? null
            },
            meaning: {
              id: result.meaning.id,
              translations: meaning,
              examples: examples
            },
            translationsCreated: result.translationsCreated,
            isNew: true
          },
          meaningAdded: false
        }
      }
    } catch (error) {
      this.logger.error('Error creating full vocabulary with files:', error)
      // Let specific exceptions bubble up
      if (
        error instanceof VocabularyJapaneseTextInvalidException ||
        (error &&
          error.status === 409 &&
          error.response?.error === 'MEANING_ALREADY_EXISTS')
      ) {
        throw error
      }
      throw new InvalidVocabularyDataException()
    }
  }
  //#endregion

  // Helper: validate Japanese text (Hiragana/Katakana/Kanji)
  private isJapaneseText(text: string): boolean {
    if (!text || typeof text !== 'string') return false
    // Reject obvious Latin letters, digits, common symbols
    const hasNonJapanese = /[a-zA-Z0-9@#$%^&*()_+=\[\]{}|\\:\";'<>?,./`~]/.test(text)
    if (hasNonJapanese) return false
    // At least one kana or kanji (the old range "u20000-u2A6DF" also matched
    // Latin-extended, Greek and Cyrillic letters)
    return hasJapaneseText(text)
  }

  //#endregion
}
