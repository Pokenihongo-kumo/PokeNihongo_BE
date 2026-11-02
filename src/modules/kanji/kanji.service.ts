import {
  CreateKanjiBodyType,
  UpdateKanjiBodyType,
  GetKanjiListQueryType,
  Kanji
} from './entities/kanji.entities'
import { CreateKanjiWithMeaningsBodyType } from './dto/kanji-with-meanings.dto'
import { UpdateKanjiWithMeaningsBodyType } from './dto/update-kanji-with-meanings.dto'
import { KanjiRepository } from './kanji.repo'
import { KanjiReadingService } from '@/modules/kanji-reading/kanji-reading.service'
import { TranslationService } from '@/modules/translation/translation.service'
import { LanguagesService } from '@/modules/languages/languages.service'
import { UploadService } from '@/3rdService/upload/upload.service'
import { KANJI_MESSAGE } from '@/common/constants/message'
import { Injectable, Logger } from '@nestjs/common'
import { UnprocessableEntityException } from '@nestjs/common'
import * as XLSX from 'xlsx'
import {
  KanjiNotFoundException,
  KanjiAlreadyExistsException,
  InvalidKanjiDataException,
  KanjiCharacterInvalidException
} from './dto/kanji.error'

@Injectable()
export class KanjiService {
  private readonly logger = new Logger(KanjiService.name)

  constructor(
    private readonly kanjiRepository: KanjiRepository,
    private readonly kanjiReadingService: KanjiReadingService,
    private readonly translationService: TranslationService,
    private readonly languagesService: LanguagesService,
    private readonly uploadService: UploadService
  ) {}

  //#region Kanji Management API for UI
  // Kanji Management API for UI
  async getKanjiManagementList(params: GetKanjiListQueryType) {
    try {
      this.logger.log(
        `Getting kanji management list with params: ${JSON.stringify(params)}`
      )

      // Set default values
      const queryParams = {
        currentPage: (params as any).currentPage || 1,
        pageSize: (params as any).pageSize || 10,
        search: params.search,
        jlptLevel: params.jlptLevel,
        strokeCount: params.strokeCount,
        sortBy: params.sortBy,
        sortOrder: (params as any).sortOrder
      }

      const result = await this.kanjiRepository.findMany(queryParams)

      // Transform data for management UI
      const kanjiManagementData = await Promise.all(
        result.data.map(async (kanji) => {
          // Get meanings
          let meaning = ''
          if (kanji.meaningKey) {
            try {
              const translations = await this.translationService.findByKey({
                key: kanji.meaningKey
              })
              if (
                translations &&
                translations.translations &&
                translations.translations.length > 0
              ) {
                // Get Vietnamese meaning first, fallback to first available
                const viTranslation = translations.translations.find((t) => {
                  // We need to get language code, for now use a simple approach
                  return t.languageId === 1 // Assuming Vietnamese is languageId 1
                })
                meaning =
                  viTranslation?.value || translations.translations[0]?.value || ''
              }
            } catch (error) {
              this.logger.warn(`Failed to get meaning for kanji ${kanji.id}:`, error)
            }
          }

          // Separate onyomi and kunyomi readings
          const onyomiReadings =
            kanji.readings
              ?.filter((r) => r.readingType === 'onyomi')
              .map((r) => r.reading) || []
          const kunyomiReadings =
            kanji.readings
              ?.filter((r) => r.readingType === 'kunyomi')
              .map((r) => r.reading) || []

          return {
            id: kanji.id,
            kanji: kanji.character,
            meaning: meaning,
            strokeCount: kanji.strokeCount,
            jlptLevel: kanji.jlptLevel,
            onyomi: onyomiReadings.join(', '),
            kunyomi: kunyomiReadings.join(', '),
            createdAt: kanji.createdAt,
            updatedAt: kanji.updatedAt
          }
        })
      )

      return {
        statusCode: 200,
        message: 'Lấy danh sách quản lý kanji thành công',
        data: {
          results: kanjiManagementData,
          pagination: {
            current: (result as any).currentPage,
            pageSize: (result as any).pageSize,
            totalPage: result.totalPages,
            totalItem: result.total
          }
        }
      }
    } catch (error) {
      this.logger.error('Error getting kanji management list:', error)
      throw error
    }
  }
  //#endregion

  //#region Find many
  async findMany(params: GetKanjiListQueryType) {
    try {
      this.logger.log(`Finding kanji with params: ${JSON.stringify(params)}`)

      // Set default values
      const queryParams = {
        currentPage: (params as any).currentPage || 1,
        pageSize: (params as any).pageSize || 10,
        search: params.search,
        jlptLevel: params.jlptLevel,
        strokeCount: params.strokeCount,
        lessonId: params.lessonId,
        sortBy: params.sortBy,
        sortOrder: (params as any).sortOrder
      }

      const result = await this.kanjiRepository.findMany(queryParams)

      // Add meanings for each kanji
      const kanjiWithMeanings = await Promise.all(
        result.data.map(async (kanji) => {
          let meanings: Array<{
            meaningKey: string
            translations: Record<string, string>
          }> = []
          if (kanji.meaningKey) {
            try {
              const translations = await this.translationService.findByKey({
                key: kanji.meaningKey
              })
              if (
                translations &&
                translations.translations &&
                translations.translations.length > 0
              ) {
                // Get language codes for each translation
                const translationsWithLanguageCodes = await Promise.all(
                  translations.translations.map(async (translation) => {
                    try {
                      const language = await this.languagesService.findById(
                        translation.languageId
                      )
                      return {
                        languageCode:
                          language?.data?.code || `lang_${translation.languageId}`,
                        value: translation.value
                      }
                    } catch (error) {
                      return {
                        languageCode: `lang_${translation.languageId}`,
                        value: translation.value
                      }
                    }
                  })
                )

                meanings = [
                  {
                    meaningKey: kanji.meaningKey,
                    translations: translationsWithLanguageCodes.reduce(
                      (acc, translation) => {
                        acc[translation.languageCode] = translation.value
                        return acc
                      },
                      {} as Record<string, string>
                    )
                  }
                ]
              }
            } catch (error) {
              this.logger.warn(`Failed to get meanings for kanji ${kanji.id}:`, error)
            }
          }

          return {
            ...kanji,
            meanings
          }
        })
      )

      return {
        statusCode: 200,
        message: KANJI_MESSAGE.GET_LIST_SUCCESS,
        data: {
          results: kanjiWithMeanings,
          pagination: {
            current: (result as any).currentPage,
            pageSize: (result as any).pageSize,
            totalPage: result.totalPages,
            totalItem: result.total
          }
        }
      }
    } catch (error) {
      this.logger.error('Error finding kanji:', error)
      throw error
    }
  }
  //#endregion

  //#region Find by id
  async findById(id: number) {
    try {
      this.logger.log(`Finding kanji by id: ${id}`)
      const kanji = await this.kanjiRepository.findById(id)

      if (!kanji) {
        throw KanjiNotFoundException
      }

      return {
        data: kanji,
        message: KANJI_MESSAGE.GET_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error finding kanji by id:', error)
      throw error
    }
  }
  //#endregion

  //#region Find by character
  async findByCharacter(character: string) {
    try {
      this.logger.log(`Finding kanji by character: ${character}`)
      const kanji = await this.kanjiRepository.findByCharacter(character)

      if (!kanji) {
        throw KanjiNotFoundException
      }

      return {
        data: kanji,
        message: KANJI_MESSAGE.GET_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error finding kanji by character:', error)
      throw error
    }
  }
  //#endregion

  //#region Create with meanings
  async createWithMeanings(
    data: CreateKanjiWithMeaningsBodyType,
    image?: Express.Multer.File
  ) {
    try {
      this.logger.log(`Creating kanji with meanings: ${data.character}`)

      // Service-level validation for Kanji character (single Kanji, not Latin or number)
      if (!this.isKanjiCharacter(data.character)) {
        throw KanjiCharacterInvalidException
      }

      // Parse meanings nếu là string (từ multipart/form-data)
      if (typeof data.meanings === 'string') {
        try {
          data.meanings = JSON.parse(data.meanings)
          this.logger.log(`Parsed meanings from string: ${JSON.stringify(data.meanings)}`)
        } catch (error) {
          this.logger.error('Failed to parse meanings JSON:', error)
          throw new Error('Invalid JSON format for meanings')
        }
      }

      // Nếu meanings là object thay vì array, chuyển thành array
      if (data.meanings && !Array.isArray(data.meanings)) {
        data.meanings = [data.meanings]
        this.logger.log(
          `Converted meanings object to array: ${JSON.stringify(data.meanings)}`
        )
      }

      // Parse readings nếu là string (từ multipart/form-data)
      if (typeof data.readings === 'string') {
        this.logger.log(`Raw readings string: "${data.readings}"`)
        this.logger.log(`Readings string length: ${(data.readings as string).length}`)

        try {
          data.readings = JSON.parse(data.readings)
          this.logger.log(`Parsed readings from string: ${JSON.stringify(data.readings)}`)

          // Xử lý trường hợp readings bị stringify 2 lần
          if (Array.isArray(data.readings)) {
            data.readings = data.readings.map((reading) => {
              if (typeof reading === 'string') {
                try {
                  return JSON.parse(reading)
                } catch (e) {
                  return reading
                }
              }
              return reading
            })
            this.logger.log(`Processed nested readings: ${JSON.stringify(data.readings)}`)
          }
        } catch (error) {
          this.logger.error('Failed to parse readings JSON:', error)
          this.logger.error(`Problematic JSON string: "${data.readings}"`)
          throw new Error('Invalid JSON format for readings')
        }
      }

      // Kiểm tra character đã tồn tại chưa
      const existingKanji = await this.kanjiRepository.findByCharacter(data.character)
      if (existingKanji) {
        throw KanjiAlreadyExistsException
      }

      // Upload hình ảnh nếu có
      let imageUrl = data.img
      this.logger.log(`Initial imageUrl: ${imageUrl}`)
      this.logger.log(`Image file exists: ${!!image}`)

      if (image) {
        this.logger.log(`Uploading image for kanji: ${data.character}`)
        const uploadResult = await this.uploadService.uploadFile(image, 'kanji')
        imageUrl = uploadResult.url
        this.logger.log(`Image uploaded successfully: ${imageUrl}`)
      }

      this.logger.log(`Final imageUrl for database: ${imageUrl}`)

      // Tạo kanji trước (tạm thời không có meaningKey)
      const kanjiData = {
        character: data.character,
        meaningKey: '', // Tạm thời để trống
        strokeCount: data.strokeCount ? parseInt(data.strokeCount.toString()) : undefined,
        jlptLevel: data.jlptLevel ? parseInt(data.jlptLevel.toString()) : undefined,
        img: imageUrl
      }

      this.logger.log(`Kanji data to create: ${JSON.stringify(kanjiData)}`)

      const kanji = await this.kanjiRepository.create(kanjiData)
      this.logger.log(`Kanji created successfully: ${kanji.id}`)

      // Tự động generate meaningKey bằng ID (chỉ có 1 meaning chính)
      const meaningKey = `kanji.${kanji.id}.meaning`
      this.logger.log(`Auto-generated meaningKey: ${meaningKey}`)

      // Cập nhật kanji với meaningKey đã generate
      this.logger.log(
        `Updating kanji with meaningKey: ${meaningKey} and img: ${imageUrl}`
      )
      const updatedKanji = await this.kanjiRepository.update(kanji.id, {
        meaningKey,
        img: imageUrl // Giữ lại field img
      })
      this.logger.log(`Updated kanji result: ${JSON.stringify(updatedKanji)}`)

      // Tự động tạo translation cho meaningKey chính (chỉ tạo cho vi và en)
      await this.createTranslationForMeaningKey(meaningKey)

      // Tạo các readings (nếu có)
      const readings: any[] = []
      this.logger.log(`Processing readings for kanji ${kanji.id}`)
      this.logger.log(`Data readings: ${JSON.stringify(data.readings)}`)
      this.logger.log(`Readings length: ${data.readings?.length || 0}`)

      if (data.readings && Array.isArray(data.readings) && data.readings.length > 0) {
        for (let i = 0; i < data.readings.length; i++) {
          const readingData = data.readings[i]
          this.logger.log(`Processing reading ${i + 1}:`, readingData)

          try {
            // Trim spaces và validate reading data
            const cleanReadingData = {
              kanjiId: kanji.id,
              readingType: readingData.readingType?.trim(),
              reading: readingData.reading?.trim()
            }

            // Validate required fields
            if (!cleanReadingData.readingType || !cleanReadingData.reading) {
              this.logger.warn(
                `Skipping reading ${i + 1}: missing required fields`,
                readingData
              )
              continue
            }

            const reading = await this.kanjiReadingService.create(cleanReadingData)
            readings.push(reading)
            this.logger.log(
              `Successfully created reading ${i + 1}: ${cleanReadingData.readingType} - ${cleanReadingData.reading}`
            )
          } catch (error) {
            this.logger.warn(
              `Failed to create reading ${readingData.readingType}: ${readingData.reading} for kanji ${kanji.id}`,
              error
            )
          }
        }
      }

      // Xử lý meanings - chỉ lấy meaning đầu tiên và cập nhật vào meaningKey chính
      const meanings: any[] = []
      this.logger.log(`Processing meanings for kanji ${kanji.id}`)

      if (data.meanings && data.meanings.length > 0) {
        // Chỉ lấy meaning đầu tiên
        const meaningData = data.meanings[0]
        this.logger.log(`Processing main meaning:`, meaningData)

        try {
          // Cập nhật translations cho meaningKey chính
          if (meaningData.translations) {
            this.logger.log(
              `Creating specific translations for main meaningKey: ${meaningKey}`
            )
            await this.createTranslationsForLanguages(
              meaningKey,
              meaningData.translations
            )
          }

          // Lưu thông tin meaning chính
          meanings.push({
            meaningKey: meaningKey,
            translations: meaningData.translations
          })
          this.logger.log(`Added main meaning to meanings array`)
        } catch (error) {
          this.logger.warn(`Failed to create main meaning for kanji ${kanji.id}`)
        }
      }

      this.logger.log(`Kanji with meanings created successfully: ${kanji.id}`)

      return {
        data: {
          kanji: updatedKanji,
          readings: readings.length > 0 ? readings : undefined,
          meanings
        },
        message: 'Tạo Kanji cùng với nghĩa thành công'
      }
    } catch (error) {
      this.logger.error('Error creating kanji with meanings:', error)
      if (
        error.message.includes('đã tồn tại') ||
        error.message.includes(
          'Phải là một ký tự Kanji (Hán tự) duy nhất. Không chấp nhận ký tự Latin hoặc số'
        )
      ) {
        throw error
      }
      throw InvalidKanjiDataException
    }
  }
  //#endregion

  //#region Update with meanings
  async updateWithMeanings(
    identifier: string,
    data: UpdateKanjiWithMeaningsBodyType,
    image?: Express.Multer.File
  ) {
    try {
      this.logger.log(`Updating kanji with meanings: ${identifier}`)
      this.logger.log(`Update data: ${JSON.stringify(data)}`)

      // Parse meanings nếu là string (từ multipart/form-data)
      if (typeof data.meanings === 'string') {
        try {
          // Loại bỏ dấu phẩy thừa và whitespace
          const cleanedJson = (data.meanings as string)
            .replace(/,\s*}/g, '}') // Loại bỏ dấu phẩy trước }
            .replace(/,\s*]/g, ']') // Loại bỏ dấu phẩy trước ]
            .trim()

          this.logger.log(`Cleaned JSON: ${cleanedJson}`)
          data.meanings = JSON.parse(cleanedJson)
          this.logger.log(`Parsed meanings from string: ${JSON.stringify(data.meanings)}`)
        } catch (error) {
          this.logger.error('Failed to parse meanings JSON:', error)
          this.logger.error(`Original JSON string: "${data.meanings}"`)
          throw new Error('Invalid JSON format for meanings')
        }
      }

      // Nếu meanings là object thay vì array, chuyển thành array
      if (data.meanings && !Array.isArray(data.meanings)) {
        data.meanings = [data.meanings]
        this.logger.log(
          `Converted meanings object to array: ${JSON.stringify(data.meanings)}`
        )
      }

      // Parse readings nếu là string (từ multipart/form-data)
      if (typeof data.readings === 'string') {
        this.logger.log(`Raw readings string: "${data.readings}"`)
        this.logger.log(`Readings string length: ${(data.readings as string).length}`)

        // Kiểm tra nếu string rỗng hoặc chỉ có whitespace
        const trimmedReadings = (data.readings as string).trim()
        if (
          trimmedReadings === '' ||
          trimmedReadings === '[]' ||
          trimmedReadings === '{}'
        ) {
          this.logger.log('Readings string is empty, setting to undefined')
          data.readings = undefined
        } else {
          try {
            data.readings = JSON.parse(trimmedReadings)
            this.logger.log(
              `Parsed readings from string: ${JSON.stringify(data.readings)}`
            )

            // Xử lý trường hợp readings bị stringify 2 lần
            if (Array.isArray(data.readings)) {
              data.readings = data.readings.map((reading) => {
                if (typeof reading === 'string') {
                  try {
                    return JSON.parse(reading)
                  } catch (e) {
                    return reading
                  }
                }
                return reading
              })
              this.logger.log(
                `Processed nested readings: ${JSON.stringify(data.readings)}`
              )
            }
          } catch (error) {
            this.logger.error('Failed to parse readings JSON:', error)
            this.logger.error(`Problematic JSON string: "${data.readings}"`)
            throw new Error('Invalid JSON format for readings')
          }
        }
      }

      // Kiểm tra identifier là ID (số) hay Character (chữ)
      let existingKanji
      const isNumeric = /^\d+$/.test(identifier)

      if (isNumeric) {
        // Nếu là số, tìm bằng ID
        existingKanji = await this.kanjiRepository.findById(parseInt(identifier))
      } else {
        // Nếu là chữ, tìm bằng character
        if (!this.isKanjiCharacter(identifier)) {
          throw KanjiCharacterInvalidException
        }
        existingKanji = await this.kanjiRepository.findByCharacter(identifier)
      }

      if (!existingKanji) {
        throw KanjiNotFoundException
      }

      // Xử lý hình ảnh - chỉ dùng file upload như hàm create
      let imageUrl = existingKanji.img // Giữ lại URL hiện có

      if (image) {
        // Upload hình ảnh mới nếu có
        this.logger.log(`Uploading image for kanji: ${existingKanji.character}`)
        const uploadResult = await this.uploadService.uploadFile(image, 'kanji')
        imageUrl = uploadResult.url
        this.logger.log(`Image uploaded successfully: ${imageUrl}`)
      }
      // Nếu không có file upload, giữ nguyên URL hiện có

      this.logger.log(`Final imageUrl for database: ${imageUrl}`)

      // Cập nhật kanji (không cho phép thay đổi character)
      const kanjiData = {
        strokeCount: data.strokeCount ? parseInt(data.strokeCount.toString()) : undefined,
        jlptLevel: data.jlptLevel ? parseInt(data.jlptLevel.toString()) : undefined,
        img: imageUrl
      }

      this.logger.log(`Kanji data to update: ${JSON.stringify(kanjiData)}`)

      const kanji = await this.kanjiRepository.updatePartial(existingKanji.id, kanjiData)
      this.logger.log(`Kanji updated successfully: ${kanji.id}`)

      // Tự động tạo translation cho meaningKey hiện có (nếu chưa có)
      if (existingKanji.meaningKey) {
        await this.createTranslationForMeaningKey(existingKanji.meaningKey)
      }

      // Cập nhật/tạo readings
      const readings: any[] = []
      if (data.readings && Array.isArray(data.readings) && data.readings.length > 0) {
        for (const readingData of data.readings) {
          try {
            if (readingData.id) {
              // Update existing reading
              const reading = await this.kanjiReadingService.update(readingData.id, {
                readingType: readingData.readingType,
                reading: readingData.reading
              })
              readings.push(reading)
            } else {
              // Create new reading
              const reading = await this.kanjiReadingService.create({
                kanjiId: existingKanji.id,
                readingType: readingData.readingType,
                reading: readingData.reading
              })
              readings.push(reading)
            }
          } catch (error) {
            this.logger.warn(
              `Failed to update/create reading ${readingData.readingType}: ${readingData.reading} for kanji ${existingKanji.id}`
            )
          }
        }
      }

      // Cập nhật/tạo meanings
      const meanings: any[] = []
      if (data.meanings && data.meanings.length > 0) {
        for (const meaningData of data.meanings) {
          try {
            let meaningKey = meaningData.meaningKey

            // Nếu không có meaningKey, tự động generate từ kanji ID
            if (!meaningKey) {
              meaningKey = `kanji.${existingKanji.id}.meaning`
              this.logger.log(`Auto-generated meaningKey: ${meaningKey}`)
            }

            // Kiểm tra translation đã tồn tại chưa để quyết định tạo mới hay update
            if (meaningData.translations) {
              await this.createOrUpdateTranslationsForLanguages(
                meaningKey,
                meaningData.translations
              )
            } else {
              // Nếu không có translations, chỉ tạo translation mặc định
              await this.createTranslationForMeaningKey(meaningKey)
            }

            // Lưu thông tin meaning (không tạo trong database vì meaning thuộc về vocabulary)
            meanings.push({
              id: meaningData.id,
              meaningKey: meaningKey,
              translations: meaningData.translations
            })
          } catch (error) {
            this.logger.warn(
              `Failed to update/create meaning for kanji ${existingKanji.id}`,
              error
            )
          }
        }
      }

      this.logger.log(`Kanji with meanings updated successfully: ${kanji.id}`)

      return {
        data: {
          kanji,
          readings: readings.length > 0 ? readings : undefined,
          meanings
        },
        message: 'Cập nhật Kanji cùng với nghĩa thành công'
      }
    } catch (error) {
      this.logger.error('Error updating kanji with meanings:', error)
      if (
        error.message.includes('không tồn tại') ||
        error.message.includes('đã tồn tại') ||
        error.message.includes(
          'Phải là một ký tự Kanji (Hán tự) duy nhất. Không chấp nhận ký tự Latin hoặc số'
        )
      ) {
        throw error
      }
      throw InvalidKanjiDataException
    }
  }
  //#endregion

  //#region Delete
  async delete(id: number) {
    try {
      this.logger.log(`Deleting kanji: ${id}`)

      // Kiểm tra kanji có tồn tại không (nhẹ, không load full record)
      const exists = await this.kanjiRepository.exists(id)
      if (!exists) {
        throw KanjiNotFoundException
      }

      await this.kanjiRepository.delete(id)
      this.logger.log(`Kanji deleted successfully: ${id}`)

      return {
        message: KANJI_MESSAGE.DELETE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error deleting kanji:', error)
      if (error.message.includes('không tồn tại')) {
        throw error
      }
      throw InvalidKanjiDataException
    }
  }
  //#endregion

  // Tạo hoặc cập nhật translations cho các ngôn ngữ
  private async createOrUpdateTranslationsForLanguages(
    meaningKey: string,
    translations: Record<string, string>
  ) {
    try {
      this.logger.log(`Creating/updating translations for meaningKey: ${meaningKey}`)

      for (const [langCode, value] of Object.entries(translations)) {
        try {
          // Tìm ngôn ngữ theo code
          const languages = await this.languagesService.findMany({
            currentPage: 1,
            pageSize: 100,
            code: langCode
          })

          if (!languages.data?.results || languages.data.results.length === 0) {
            this.logger.warn(`Language ${langCode} not found, skipping`)
            continue
          }

          const language = languages.data.results[0]

          // Kiểm tra translation đã tồn tại chưa
          const existingTranslation = await this.translationService.findByKeyAndLanguage(
            meaningKey,
            language.id
          )

          if (existingTranslation) {
            // Update translation đã tồn tại
            await this.translationService.update(existingTranslation.id, {
              value: value
            })
            this.logger.log(
              `Updated translation for key: ${meaningKey}, language: ${language.code}, value: ${value}`
            )
          } else {
            // Tạo translation mới
            await this.translationService.create({
              key: meaningKey,
              languageId: language.id,
              value: value
            })
            this.logger.log(
              `Created new translation for key: ${meaningKey}, language: ${language.code}, value: ${value}`
            )
          }
        } catch (error) {
          this.logger.warn(
            `Failed to create/update translation for key: ${meaningKey}, language: ${langCode}`,
            error
          )
        }
      }
    } catch (error) {
      this.logger.error(
        `Error creating/updating translations for meaningKey: ${meaningKey}`,
        error
      )
      throw error
    }
  }

  // Tự động tạo translation cho meaningKey
  private async createTranslationForMeaningKey(meaningKey: string) {
    try {
      // Kiểm tra meaningKey có tồn tại không
      if (!meaningKey || meaningKey.trim() === '') {
        this.logger.warn(`MeaningKey is empty or undefined: ${meaningKey}`)
        return
      }

      this.logger.log(`Creating translations for meaningKey: ${meaningKey}`)

      // Chỉ tạo translations cho 2 ngôn ngữ: Việt (vi), Anh (en)
      const targetLanguages = ['vi', 'en']

      for (const langCode of targetLanguages) {
        try {
          // Tìm ngôn ngữ theo code
          const languages = await this.languagesService.findMany({
            currentPage: 1,
            pageSize: 100,
            code: langCode
          })

          if (!languages.data?.results || languages.data.results.length === 0) {
            this.logger.warn(`Language ${langCode} not found, skipping`)
            continue
          }

          const language = languages.data.results[0]

          // Kiểm tra translation đã tồn tại chưa
          const existingTranslation = await this.translationService.findByKeyAndLanguage(
            meaningKey,
            language.id
          )

          if (existingTranslation) {
            this.logger.log(
              `Translation already exists for key: ${meaningKey}, language: ${language.code}`
            )
            continue
          }

          // Tạo translation mặc định
          await this.translationService.create({
            key: meaningKey,
            languageId: language.id,
            value: meaningKey // Tạm thời dùng key làm value, có thể cập nhật sau
          })

          this.logger.log(
            `Translation created for key: ${meaningKey}, language: ${language.code}`
          )
        } catch (error) {
          this.logger.warn(
            `Failed to create translation for key: ${meaningKey}, language: ${langCode}`,
            error
          )
          // Tiếp tục với ngôn ngữ khác nếu có lỗi
        }
      }
    } catch (error) {
      this.logger.error('Error creating translations for meaningKey:', error)
      // Không throw error để không ảnh hưởng đến việc tạo kanji
    }
  }

  // Tạo translations cho các ngôn ngữ cụ thể
  private async createTranslationsForLanguages(
    meaningKey: string,
    translations: Record<string, string>
  ) {
    try {
      this.logger.log(`Creating specific translations for meaningKey: ${meaningKey}`)

      // Lấy danh sách các ngôn ngữ để map code -> id
      const languages = await this.languagesService.findMany({
        currentPage: 1,
        pageSize: 100
      })

      if (
        !languages.data ||
        !languages.data.results ||
        languages.data.results.length === 0
      ) {
        this.logger.warn('No languages found, skipping specific translation creation')
        return
      }

      // Tạo map code -> id
      const languageMap = new Map<string, number>()
      for (const language of languages.data.results) {
        languageMap.set(language.code, language.id)
      }

      // Chỉ xử lý các ngôn ngữ được hỗ trợ: vi, en
      const supportedLanguages = ['vi', 'en']

      for (const languageCode of supportedLanguages) {
        const translationValue = translations[languageCode]
        if (!translationValue) {
          continue // Bỏ qua nếu không có translation cho ngôn ngữ này
        }

        const languageId = languageMap.get(languageCode)
        if (!languageId) {
          this.logger.warn(`Language code ${languageCode} not found, skipping`)
          continue
        }

        try {
          // Kiểm tra translation đã tồn tại chưa
          const existingTranslation = await this.translationService.findByKeyAndLanguage(
            meaningKey,
            languageId
          )

          if (existingTranslation) {
            // Cập nhật translation hiện có
            await this.translationService.update(existingTranslation.id, {
              value: translationValue
            })
            this.logger.log(
              `Updated translation for key: ${meaningKey}, language: ${languageCode}`
            )
          } else {
            // Tạo translation mới
            await this.translationService.create({
              key: meaningKey,
              languageId: languageId,
              value: translationValue
            })
            this.logger.log(
              `Created translation for key: ${meaningKey}, language: ${languageCode}`
            )
          }
        } catch (error) {
          this.logger.warn(
            `Failed to create/update translation for key: ${meaningKey}, language: ${languageCode}`,
            error
          )
        }
      }
    } catch (error) {
      this.logger.error('Error creating specific translations:', error)
    }
  }

  // Statistics
  async getStats() {
    try {
      this.logger.log('Getting kanji statistics')
      return await this.kanjiRepository.getStats()
    } catch (error) {
      this.logger.error('Error getting kanji statistics:', error)
      throw error
    }
  }

  // Utility methods
  private isKanjiCharacter(text: string): boolean {
    if (!text || text.length !== 1) return false
    if (/[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(text)) return false
    const ranges = [
      /[\u4E00-\u9FAF]/,
      /[\u3400-\u4DBF]/,
      /[\u20000-\u2A6DF]/,
      /[\u2A700-\u2B73F]/,
      /[\u2B740-\u2B81F]/,
      /[\u2B820-\u2CEAF]/,
      /[\uF900-\uFAFF]/,
      /[\u2F800-\u2FA1F]/
    ]
    return ranges.some((r) => r.test(text))
  }
  async getKanjiWithReadings(kanjiId: number) {
    try {
      this.logger.log(`Getting kanji with readings: ${kanjiId}`)
      const kanji = await this.kanjiRepository.findById(kanjiId)

      if (!kanji) {
        throw KanjiNotFoundException
      }

      return {
        data: kanji,
        message: KANJI_MESSAGE.GET_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error getting kanji with readings:', error)
      throw error
    }
  }

  //#region Import from XLSX
  /**
   * Import Kanji từ file Excel với cột: kanji, mean, detail, kun, on
   * @param language - Ngôn ngữ của file (vi hoặc en)
   */
  async importFromXlsx(
    file: Express.Multer.File,
    language: string = 'vi',
    createdById?: number
  ) {
    try {
      if (!file || !file.buffer) {
        throw new Error('File không hợp lệ')
      }

      // Validate language
      if (!['vi', 'en'].includes(language)) {
        throw new Error('Ngôn ngữ không hợp lệ. Chỉ hỗ trợ vi hoặc en')
      }

      const workbook = XLSX.read(file.buffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const rows: Array<Record<string, any>> = XLSX.utils.sheet_to_json(sheet, {
        defval: ''
      })

      const created: any[] = []
      const updated: any[] = []
      const skipped: Array<{ kanji: string; reason: string }> = []

      for (const row of rows) {
        const kanji = (row.kanji || row['Kanji'] || '').toString().trim()
        const mean = (row.mean || row['Mean'] || '').toString().trim()
        const detail = (row.detail || row['Detail'] || '').toString().trim()
        const meanViet = (row.meanViet || row['meanViet'] || '').toString().trim()
        const detailViet = (row.detailViet || row['detailViet'] || '').toString().trim()
        const kun = (row.kun || row['Kun'] || '').toString().trim()
        const on = (row.on || row['On'] || '').toString().trim()

        if (!kanji || (!mean && !meanViet)) {
          skipped.push({ kanji, reason: 'Thiếu dữ liệu (kanji/mean/meanViet)' })
          continue
        }

        // Validate kanji character
        if (!this.isKanjiCharacter(kanji)) {
          skipped.push({ kanji, reason: 'Không phải ký tự Kanji hợp lệ' })
          continue
        }

        // Kiểm tra Kanji đã tồn tại chưa
        const existing = await this.kanjiRepository.findByCharacter(kanji)

        try {
          if (existing) {
            // Kanji đã tồn tại -> Thêm translation cho ngôn ngữ mới
            this.logger.log(`Kanji ${kanji} đã tồn tại, thêm translation`)

            const translations: Record<string, string> = {}

            // Fallback rules:
            // - vi: prefer meanViet/detailViet; if missing and importing language is 'vi', fallback to mean/detail
            // - en: prefer mean/detail; if missing and importing language is 'en', fallback to meanViet/detailViet
            const viBase = meanViet || (language === 'vi' ? mean : '')
            const viDetail = detailViet || (language === 'vi' ? detail : '')
            const enBase = mean || (language === 'en' ? meanViet : '')
            const enDetail = detail || (language === 'en' ? detailViet : '')

            if (enBase || enDetail) {
              const meaningValueEn = enDetail
                ? `${enBase || ''}${enBase && enDetail ? '. ' : ''}${enDetail}`
                : enBase
              if (meaningValueEn) translations['en'] = meaningValueEn
            }

            if (viBase || viDetail) {
              const meaningValueVi = viDetail
                ? `${viBase || ''}${viBase && viDetail ? '. ' : ''}${viDetail}`
                : viBase
              if (meaningValueVi) translations['vi'] = meaningValueVi
            }

            if (Object.keys(translations).length > 0) {
              await this.createTranslationsForLanguages(existing.meaningKey, translations)
            }

            updated.push({
              kanji: existing,
              translations,
              action: 'updated_translation'
            })
          } else {
            // Tạo Kanji mới
            const kanjiData = {
              character: kanji,
              meaningKey: '', // Tạm thời để trống
              jlptLevel: 5 // Mặc định N5
            }

            const newKanji = await this.kanjiRepository.create(kanjiData)

            // Tạo meaningKey từ ID
            const meaningKey = `kanji.${newKanji.id}.meaning`
            await this.kanjiRepository.update(newKanji.id, { meaningKey })

            // Tạo translations cho meaningKey (với fallback tương tự)
            const translations: Record<string, string> = {}

            const viBase = meanViet || (language === 'vi' ? mean : '')
            const viDetail = detailViet || (language === 'vi' ? detail : '')
            const enBase = mean || (language === 'en' ? meanViet : '')
            const enDetail = detail || (language === 'en' ? detailViet : '')

            if (enBase || enDetail) {
              const meaningValueEn = enDetail
                ? `${enBase || ''}${enBase && enDetail ? '. ' : ''}${enDetail}`
                : enBase
              if (meaningValueEn) translations['en'] = meaningValueEn
            }

            if (viBase || viDetail) {
              const meaningValueVi = viDetail
                ? `${viBase || ''}${viBase && viDetail ? '. ' : ''}${viDetail}`
                : viBase
              if (meaningValueVi) translations['vi'] = meaningValueVi
            }

            if (Object.keys(translations).length > 0) {
              await this.createTranslationsForLanguages(meaningKey, translations)
            }

            // Tạo readings (kun và on)
            const readings: any[] = []
            if (kun) {
              const kunReadings = kun.split(/[\s]+/).filter((r) => r.trim())
              for (const kunReading of kunReadings) {
                try {
                  const reading = await this.kanjiReadingService.create({
                    kanjiId: newKanji.id,
                    readingType: 'kunyomi',
                    reading: kunReading.trim()
                  })
                  readings.push(reading)
                } catch (err) {
                  this.logger.warn(`Failed to create kun reading: ${kunReading}`)
                }
              }
            }

            if (on) {
              const onReadings = on.split(/[\s]+/).filter((r) => r.trim())
              for (const onReading of onReadings) {
                try {
                  const reading = await this.kanjiReadingService.create({
                    kanjiId: newKanji.id,
                    readingType: 'onyomi',
                    reading: onReading.trim()
                  })
                  readings.push(reading)
                } catch (err) {
                  this.logger.warn(`Failed to create on reading: ${onReading}`)
                }
              }
            }

            created.push({
              kanji: newKanji,
              readings,
              meaningKey,
              translations
            })
          }
        } catch (err: any) {
          skipped.push({ kanji, reason: err?.message || 'Lỗi không xác định' })
        }
      }

      return {
        statusCode: 201,
        message: `Import Kanji thành công: ${created.length} tạo mới, ${updated.length} cập nhật, ${skipped.length} bỏ qua`,
        data: {
          created,
          updated,
          skipped,
          supportedLanguages: ['en', 'vi']
        }
      }
    } catch (error) {
      this.logger.error('Error importing kanji from xlsx:', error)
      throw InvalidKanjiDataException
    }
  }
  //#endregion

  //#region Import from TXT
  /**
   * Import Kanji từ file TXT (tab-separated)
   * Cấu trúc: kanji	mean	detail	kun	on	jlpt	strokes
   */
  async importFromTxt(
    file: Express.Multer.File,
    language: string = 'en'
  ): Promise<{ statusCode: number; message: string; data: any }> {
    try {
      if (!file || !file.buffer) {
        throw new Error('File không hợp lệ')
      }

      const fileContent = file.buffer.toString('utf-8')
      const lines = fileContent.split('\n').filter((line) => line.trim())

      const created: any[] = []
      const updated: any[] = []
      const skipped: Array<{ kanji: string; reason: string }> = []

      // Bỏ qua header line
      const dataLines = lines.slice(1)

      for (const line of dataLines) {
        const columns = line.split('\t')

        if (columns.length < 7) {
          skipped.push({ kanji: columns[0] || 'N/A', reason: 'Thiếu cột dữ liệu' })
          continue
        }

        const kanji = columns[0]?.trim()
        const mean = columns[1]?.trim()
        const detail = columns[2]?.trim()
        const kun = columns[3]?.trim()
        const on = columns[4]?.trim()
        const jlpt = columns[5]?.trim()
        const strokes = columns[6]?.trim()

        if (!kanji || !mean) {
          skipped.push({ kanji: kanji || 'N/A', reason: 'Thiếu dữ liệu (kanji/mean)' })
          continue
        }

        // Validate kanji character
        if (!this.isKanjiCharacter(kanji)) {
          skipped.push({ kanji, reason: 'Không phải ký tự Kanji hợp lệ' })
          continue
        }

        // Kiểm tra Kanji đã tồn tại chưa
        const existing = await this.kanjiRepository.findByCharacter(kanji)

        try {
          if (existing) {
            // Kanji đã tồn tại -> Thêm translation và cập nhật thông tin thiếu
            this.logger.log(`Kanji ${kanji} đã tồn tại, cập nhật thông tin`)

            const updates: any = {}
            const actions: string[] = []

            // Cập nhật JLPT level nếu có
            if (jlpt && existing.jlptLevel !== parseInt(jlpt)) {
              updates.jlptLevel = parseInt(jlpt)
              actions.push('jlpt_level')
            }

            // Cập nhật stroke count nếu có và đang null
            if (strokes && !existing.strokeCount) {
              updates.strokeCount = parseInt(strokes)
              actions.push('stroke_count')
            }

            // Cập nhật thông tin Kanji nếu có thay đổi
            if (Object.keys(updates).length > 0) {
              await this.kanjiRepository.update(existing.id, updates)
              actions.push('kanji_info')
            }

            // Thêm translation cho ngôn ngữ
            const meaningValue = detail ? `${mean}. ${detail}` : mean
            await this.createTranslationsForLanguages(existing.meaningKey, {
              [language]: meaningValue
            })
            actions.push('translation')

            updated.push({
              kanji: existing,
              language: language,
              meaningValue,
              actions: actions,
              updates: updates
            })
          } else {
            // Tạo Kanji mới
            const jlptLevel = jlpt ? parseInt(jlpt) : 5
            const strokeCount = strokes ? parseInt(strokes) : null

            const kanjiData = {
              character: kanji,
              meaningKey: '', // Tạm thời để trống
              jlptLevel: jlptLevel,
              strokeCount: strokeCount || undefined
            }

            const newKanji = await this.kanjiRepository.create(kanjiData)

            // Tạo meaningKey từ ID
            const meaningKey = `kanji.${newKanji.id}.meaning`
            await this.kanjiRepository.update(newKanji.id, { meaningKey })

            // Tạo translations cho meaningKey
            const meaningValue = detail ? `${mean}. ${detail}` : mean
            await this.createTranslationsForLanguages(meaningKey, {
              [language]: meaningValue
            })

            // Tạo readings (kun và on)
            const readings: any[] = []
            if (kun) {
              const kunReadings = kun.split(/[\s,]+/).filter((r) => r.trim())
              for (const kunReading of kunReadings) {
                try {
                  const reading = await this.kanjiReadingService.create({
                    kanjiId: newKanji.id,
                    readingType: 'kunyomi',
                    reading: kunReading.trim()
                  })
                  readings.push(reading)
                } catch (err) {
                  this.logger.warn(`Failed to create kun reading: ${kunReading}`)
                }
              }
            }

            if (on) {
              const onReadings = on.split(/[\s,]+/).filter((r) => r.trim())
              for (const onReading of onReadings) {
                try {
                  const reading = await this.kanjiReadingService.create({
                    kanjiId: newKanji.id,
                    readingType: 'onyomi',
                    reading: onReading.trim()
                  })
                  readings.push(reading)
                } catch (err) {
                  this.logger.warn(`Failed to create on reading: ${onReading}`)
                }
              }
            }

            created.push({
              kanji: newKanji,
              readings,
              meaningKey,
              meaningValue,
              jlptLevel,
              strokeCount
            })
          }
        } catch (err: any) {
          skipped.push({ kanji, reason: err?.message || 'Lỗi không xác định' })
        }
      }

      return {
        statusCode: 201,
        message: `Import Kanji từ TXT (${language}) thành công: ${created.length} tạo mới, ${updated.length} cập nhật, ${skipped.length} bỏ qua`,
        data: {
          created,
          updated,
          skipped,
          totalLines: lines.length - 1,
          language
        }
      }
    } catch (error) {
      this.logger.error('Error importing kanji from txt:', error)
      throw InvalidKanjiDataException
    }
  }
  //#endregion

  //#region Delete All Kanji
  /**
   * Xóa toàn bộ dữ liệu Kanji và những thứ liên quan
   * Bao gồm: Kanji, Kanji_Reading, Vocabulary_Kanji, và các Translation liên quan
   */
  async deleteAllKanjiData(): Promise<{
    statusCode: number
    message: string
    data: any
  }> {
    try {
      this.logger.log('Starting to delete all Kanji data and related records')

      // Sử dụng repository method để xóa tất cả dữ liệu Kanji
      const result = await this.kanjiRepository.deleteAllKanjiData()

      this.logger.log(`Successfully deleted all Kanji data: ${JSON.stringify(result)}`)

      return {
        statusCode: 200,
        message: `Đã xóa toàn bộ dữ liệu Kanji thành công. Đã xóa ${result.kanjiDeleted} Kanji, ${result.readingDeleted} cách đọc, ${result.vocabularyKanjiDeleted} liên kết từ vựng, và ${result.translationDeleted} bản dịch.`,
        data: result
      }
    } catch (error) {
      this.logger.error('Error deleting all Kanji data:', error)
      throw InvalidKanjiDataException
    }
  }
  //#endregion
}
