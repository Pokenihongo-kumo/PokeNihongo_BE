import { GetKanjiListQueryType } from './entities/kanji.entity'
import { CreateKanjiWithMeaningsBodyType } from './dto/kanji-with-meanings.dto'
import { UpdateKanjiWithMeaningsBodyType } from './dto/update-kanji-with-meanings.dto'
import { KanjiRepo } from './kanji.repo'
import { KanjiReadingService } from '@/modules/kanji-reading/kanji-reading.service'
import { UploadService } from '@/3rdService/upload/upload.service'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import * as XLSX from 'xlsx'
import {
  KanjiNotFoundException,
  KanjiAlreadyExistsException,
  InvalidKanjiDataException,
  KanjiCharacterInvalidException
} from './dto/kanji.error'
import { I18nService } from '@/i18n/i18n.service'
import { KanjiMessage as M } from '@/i18n/message-keys'
import { isKanjiCharacter } from '@/common/utils/japanese-text'
import { isUniqueConstraintPrismaError } from '@/shared/utils/prisma-errors'

// The meaning of kanji {id} lives in translations under kanji.{id}.meaning
const meaningKeyOf = (id: number) => `kanji.${id}.meaning`

type Reading = { id?: number; readingType?: string; reading?: string }

@Injectable()
export class KanjiService {
  private readonly logger = new Logger(KanjiService.name)

  constructor(
    private readonly kanjiRepository: KanjiRepo,
    private readonly kanjiReadingService: KanjiReadingService,
    private readonly uploadService: UploadService,
    private readonly i18nService: I18nService
  ) {}

  // Admin table: the meaning in Vietnamese (else the first one), readings joined
  async getKanjiManagementList(params: GetKanjiListQueryType, lang: string = 'vi') {
    const result = await this.kanjiRepository.findMany(this.listParams(params))
    const meaningsOf = await this.meaningsOf(result.data.map((k) => k.meaningKey))
    const readingsOf = (kanji: (typeof result.data)[number], type: string) =>
      (kanji.readings ?? [])
        .filter((r) => r.readingType === type)
        .map((r) => r.reading)
        .join(', ')
    return {
      statusCode: 200,
      message: this.i18nService.translate(M.GET_MANAGEMENT_LIST_SUCCESS, lang),
      data: {
        results: result.data.map((kanji) => {
          const meanings = meaningsOf(kanji.meaningKey)
          return {
            id: kanji.id,
            kanji: kanji.character,
            // Was the translation of languageId 1, assumed to be Vietnamese
            meaning: meanings.vi ?? Object.values(meanings)[0] ?? '',
            strokeCount: kanji.strokeCount,
            jlptLevel: kanji.jlptLevel,
            onyomi: readingsOf(kanji, 'onyomi'),
            kunyomi: readingsOf(kanji, 'kunyomi'),
            createdAt: kanji.createdAt,
            updatedAt: kanji.updatedAt
          }
        }),
        pagination: this.pagination(result)
      }
    }
  }

  // Each kanji with its meaning as { meaningKey, translations: { code: value } }
  async findMany(params: GetKanjiListQueryType, lang: string = 'vi') {
    const result = await this.kanjiRepository.findMany({
      ...this.listParams(params),
      lessonId: params.lessonId
    })
    const meaningsOf = await this.meaningsOf(result.data.map((k) => k.meaningKey))
    return {
      statusCode: 200,
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang),
      data: {
        results: result.data.map((kanji) => {
          const translations = meaningsOf(kanji.meaningKey)
          return {
            ...kanji,
            meanings: Object.keys(translations).length
              ? [{ meaningKey: kanji.meaningKey, translations }]
              : []
          }
        }),
        pagination: this.pagination(result)
      }
    }
  }

  // Also used by lesson-content
  async findById(id: number, lang: string = 'vi') {
    const kanji = await this.kanjiRepository.findById(id)
    if (!kanji) throw new KanjiNotFoundException()
    return { data: kanji, message: this.i18nService.translate(M.GET_SUCCESS, lang) }
  }

  // Also used by vocabulary (a missing kanji is a 404)
  async findByCharacter(character: string, lang: string = 'vi') {
    const kanji = await this.kanjiRepository.findByCharacter(character)
    if (!kanji) throw new KanjiNotFoundException()
    return { data: kanji, message: this.i18nService.translate(M.GET_SUCCESS, lang) }
  }

  // The schema checks the character (one kanji) and parses readings/meanings
  // sent as JSON strings by multipart forms. Only the first meaning is kept
  async createWithMeanings(
    data: CreateKanjiWithMeaningsBodyType,
    image?: Express.Multer.File,
    lang: string = 'vi'
  ) {
    try {
      if (await this.kanjiRepository.findByCharacter(data.character)) {
        throw new KanjiAlreadyExistsException()
      }
      const img = image
        ? (await this.uploadService.uploadFile(image, 'kanji')).url
        : data.img
      const created = await this.kanjiRepository.create({
        character: data.character,
        meaningKey: '',
        strokeCount: data.strokeCount || undefined,
        jlptLevel: data.jlptLevel || undefined,
        img
      })
      const meaningKey = meaningKeyOf(created.id)
      const kanji = await this.kanjiRepository.update(created.id, { meaningKey, img })

      // vi and en only; a missing one gets the key as a placeholder
      const meanings = data.meanings ? [data.meanings].flat() : []
      const given = meanings[0]?.translations ?? {}
      await this.kanjiRepository.writeTranslations(meaningKey, {
        vi: given.vi ?? meaningKey,
        en: given.en ?? meaningKey
      })
      const readings = await this.saveReadings(created.id, data.readings ?? [])

      return {
        statusCode: 201,
        data: {
          kanji,
          readings: readings.length > 0 ? readings : undefined,
          meanings: meanings[0]?.translations
            ? [{ meaningKey, translations: meanings[0].translations }]
            : []
        },
        message: this.i18nService.translate(M.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toKanjiError(error)
    }
  }

  // identifier: the id, or the kanji itself. The character never changes
  async updateWithMeanings(
    identifier: string,
    data: UpdateKanjiWithMeaningsBodyType,
    image?: Express.Multer.File,
    lang: string = 'vi'
  ) {
    try {
      const isId = String(Number(identifier)) === identifier
      if (!isId && !isKanjiCharacter(identifier))
        throw new KanjiCharacterInvalidException()
      const existing = isId
        ? await this.kanjiRepository.findById(Number(identifier))
        : await this.kanjiRepository.findByCharacter(identifier)
      if (!existing) throw new KanjiNotFoundException()

      const img = image
        ? (await this.uploadService.uploadFile(image, 'kanji')).url
        : existing.img
      const kanji = await this.kanjiRepository.updatePartial(existing.id, {
        strokeCount: data.strokeCount || undefined,
        jlptLevel: data.jlptLevel || undefined,
        img: img ?? undefined
      })
      if (existing.meaningKey) await this.placeholderMeaning(existing.meaningKey)

      const readings = await this.saveReadings(existing.id, data.readings ?? [])
      const meanings: {
        id?: number
        meaningKey: string
        translations?: Record<string, string>
      }[] = []
      for (const meaning of data.meanings ?? []) {
        const meaningKey = meaning.meaningKey || meaningKeyOf(existing.id)
        try {
          if (meaning.translations) {
            await this.kanjiRepository.writeTranslations(meaningKey, meaning.translations)
          } else {
            await this.placeholderMeaning(meaningKey)
          }
          meanings.push({
            id: meaning.id,
            meaningKey,
            translations: meaning.translations
          })
        } catch (error) {
          this.logger.warn(`Saving meaning ${meaningKey} failed`, error)
        }
      }

      return {
        statusCode: 200,
        data: { kanji, readings: readings.length > 0 ? readings : undefined, meanings },
        message: this.i18nService.translate(M.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toKanjiError(error)
    }
  }

  async delete(id: number, lang: string = 'vi') {
    try {
      if (!(await this.kanjiRepository.exists(id))) throw new KanjiNotFoundException()
      await this.kanjiRepository.delete(id)
      return { message: this.i18nService.translate(M.DELETE_SUCCESS, lang) }
    } catch (error) {
      throw this.toKanjiError(error)
    }
  }

  getStats() {
    return this.kanjiRepository.getStats()
  }

  //#region helpers
  private listParams(params: GetKanjiListQueryType) {
    return {
      currentPage: params.currentPage || 1,
      pageSize: params.pageSize || 10,
      search: params.search,
      jlptLevel: params.jlptLevel,
      strokeCount: params.strokeCount,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder
    }
  }

  private pagination(result: {
    currentPage: number
    pageSize: number
    totalPages: number
    total: number
  }) {
    return {
      current: result.currentPage,
      pageSize: result.pageSize,
      totalPage: result.totalPages,
      totalItem: result.total
    }
  }

  // One query for every meaning; the function gives { code: value } of a key
  private async meaningsOf(keys: (string | null | undefined)[]) {
    const own = keys.filter((k): k is string => !!k)
    const rows = own.length ? await this.kanjiRepository.translationsByKeys(own) : []
    return (key: string | null | undefined): Record<string, string> =>
      Object.fromEntries(
        rows.filter((r) => r.key === key).map((r) => [r.language.code, r.value])
      )
  }

  // vi/en get the key itself as their value when they have no translation yet
  private placeholderMeaning(meaningKey: string) {
    return this.kanjiRepository.writeTranslations(
      meaningKey,
      { vi: meaningKey, en: meaningKey },
      true
    )
  }

  // With an id: update that reading; without: create it. A reading that fails
  // (or lacks its type/text) is skipped
  private async saveReadings(kanjiId: number, readings: Reading[]) {
    const saved: unknown[] = []
    for (const r of readings) {
      const readingType = r.readingType?.trim()
      const reading = r.reading?.trim()
      if (!readingType || !reading) continue
      try {
        saved.push(
          r.id
            ? await this.kanjiReadingService.update(r.id, { readingType, reading })
            : await this.kanjiReadingService.create({ kanjiId, readingType, reading })
        )
      } catch (error) {
        this.logger.warn(
          `Saving reading ${readingType} ${reading} of kanji ${kanjiId} failed`,
          error
        )
      }
    }
    return saved
  }

  // Import: the vi/en translations of a meaning; a failure is only logged
  private async writeImportedMeaning(
    meaningKey: string,
    translations: Record<string, string>
  ) {
    try {
      const { vi, en } = translations
      await this.kanjiRepository.writeTranslations(meaningKey, {
        ...(vi && { vi }),
        ...(en && { en })
      })
    } catch (error) {
      this.logger.warn('Saving the meaning ' + meaningKey + ' failed', error)
    }
  }

  private toKanjiError(error: unknown): HttpException {
    if (error instanceof HttpException) return error
    this.logger.error(
      'Kanji request failed',
      error instanceof Error ? error.stack : error
    )
    if (isUniqueConstraintPrismaError(error)) return new KanjiAlreadyExistsException()
    return new InvalidKanjiDataException()
  }
  //#endregion

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
        throw new InvalidKanjiDataException(M.INVALID_FILE)
      }

      // Validate language
      if (!['vi', 'en'].includes(language)) {
        throw new InvalidKanjiDataException(M.INVALID_IMPORT_LANGUAGE)
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
        if (!isKanjiCharacter(kanji)) {
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
              await this.writeImportedMeaning(existing.meaningKey, translations)
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
              await this.writeImportedMeaning(meaningKey, translations)
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
        message: this.i18nService.translate(M.IMPORT_XLSX_SUCCESS, 'vi', {
          created: created.length,
          updated: updated.length,
          skipped: skipped.length
        }),
        data: {
          created,
          updated,
          skipped,
          supportedLanguages: ['en', 'vi']
        }
      }
    } catch (error) {
      this.logger.error('Error importing kanji from xlsx:', error)
      throw this.toKanjiError(error)
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
        throw new InvalidKanjiDataException(M.INVALID_FILE)
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
        if (!isKanjiCharacter(kanji)) {
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
            await this.writeImportedMeaning(existing.meaningKey, {
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
            await this.writeImportedMeaning(meaningKey, {
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
        message: this.i18nService.translate(M.IMPORT_TXT_SUCCESS, 'vi', {
          language,
          created: created.length,
          updated: updated.length,
          skipped: skipped.length
        }),
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
      throw this.toKanjiError(error)
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
        message: this.i18nService.translate(M.DELETE_ALL_SUCCESS, 'vi', {
          kanji: result.kanjiDeleted,
          readings: result.readingDeleted,
          translations: result.translationDeleted
        }),
        data: result
      }
    } catch (error) {
      this.logger.error('Error deleting all Kanji data:', error)
      throw this.toKanjiError(error)
    }
  }
  //#endregion
}
