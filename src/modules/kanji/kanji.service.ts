import { UploadService } from '@/modules/upload/upload.service'
import { isKanjiCharacter } from '@/common/utils/japanese-text'
import { KanjiMessage as M } from '@/i18n/message-keys'
import { KanjiReadingService } from '@/modules/kanji-reading/kanji-reading.service'
import { isUniqueConstraintPrismaError } from '@/shared/utils/prisma-errors'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import * as XLSX from 'xlsx'
import { CreateKanjiWithMeaningsBody } from './dto/kanji-with-meanings.dto'
import {
  InvalidKanjiDataException,
  KanjiAlreadyExistsException,
  KanjiCharacterInvalidException,
  KanjiNotFoundException
} from './dto/kanji.error'
import { GetKanjiListQuery } from './dto/kanji.zod-dto'
import { UpdateKanjiWithMeaningsBody } from './dto/update-kanji-with-meanings.dto'
import { KanjiImportService } from './kanji-import.service'
import { KanjiRepo } from './kanji.repo'

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
    private readonly importer: KanjiImportService
  ) {}

  // Admin table: the meaning in Vietnamese (else the first one), readings joined
  async getKanjiManagementList(params: GetKanjiListQuery) {
    const result = await this.kanjiRepository.findMany(this.listParams(params))
    const meaningsOf = await this.meaningsOf(result.data.map((k) => k.meaningKey))
    const readingsOf = (kanji: (typeof result.data)[number], type: string) =>
      (kanji.readings ?? [])
        .filter((r) => r.readingType === type)
        .map((r) => r.reading)
        .join(', ')
    return {
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

  // Each kanji with its meaning as { meaningKey, translations: { code: value } }
  async findMany(params: GetKanjiListQuery) {
    const result = await this.kanjiRepository.findMany({
      ...this.listParams(params),
      lessonId: params.lessonId
    })
    const meaningsOf = await this.meaningsOf(result.data.map((k) => k.meaningKey))
    return {
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

  // Also used by lesson-content
  async findById(id: number) {
    const kanji = await this.kanjiRepository.findById(id)
    if (!kanji) throw new KanjiNotFoundException()
    return kanji
  }

  // Also used by vocabulary (a missing kanji is a 404)
  async findByCharacter(character: string) {
    const kanji = await this.kanjiRepository.findByCharacter(character)
    if (!kanji) throw new KanjiNotFoundException()
    return kanji
  }

  // The schema checks the character (one kanji) and parses readings/meanings
  // sent as JSON strings by multipart forms. Only the first meaning is kept
  async createWithMeanings(
    data: CreateKanjiWithMeaningsBody,
    image?: Express.Multer.File
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
        kanji,
        readings: readings.length > 0 ? readings : undefined,
        meanings: meanings[0]?.translations
          ? [{ meaningKey, translations: meanings[0].translations }]
          : []
      }
    } catch (error) {
      throw this.toKanjiError(error)
    }
  }

  // identifier: the id, or the kanji itself. The character never changes
  async updateWithMeanings(
    identifier: string,
    data: UpdateKanjiWithMeaningsBody,
    image?: Express.Multer.File
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

      return { kanji, readings: readings.length > 0 ? readings : undefined, meanings }
    } catch (error) {
      throw this.toKanjiError(error)
    }
  }

  async delete(id: number) {
    try {
      if (!(await this.kanjiRepository.exists(id))) throw new KanjiNotFoundException()
      await this.kanjiRepository.delete(id)
      return
    } catch (error) {
      throw this.toKanjiError(error)
    }
  }

  getStats() {
    return this.kanjiRepository.getStats()
  }

  //#region helpers
  private listParams(params: GetKanjiListQuery) {
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

  //#endregion

  //#endregion

  //#region Delete All Kanji
  /**
   * Xóa toàn bộ dữ liệu Kanji và những thứ liên quan
   * Bao gồm: Kanji, Kanji_Reading, Vocabulary_Kanji, và các Translation liên quan
   */
  // ---- moved to KanjiImportService (phase 6 X5); the controller still calls these ----

  importFromXlsx(...args: Parameters<KanjiImportService['importFromXlsx']>) {
    return this.importer.importFromXlsx(...args)
  }

  importFromTxt(...args: Parameters<KanjiImportService['importFromTxt']>) {
    return this.importer.importFromTxt(...args)
  }

  async deleteAllKanjiData() {
    try {
      this.logger.log('Starting to delete all Kanji data and related records')

      // Sử dụng repository method để xóa tất cả dữ liệu Kanji
      const result = await this.kanjiRepository.deleteAllKanjiData()

      this.logger.log(`Successfully deleted all Kanji data: ${JSON.stringify(result)}`)

      return result
    } catch (error) {
      this.logger.error('Error deleting all Kanji data:', error)
      throw this.toKanjiError(error)
    }
  }
  //#endregion

  // ---- For other modules: Kanji found or created while saving a vocabulary (optional tx) (B7) ----

  findIdByCharacter(...args: Parameters<KanjiRepo['findIdByCharacter']>) {
    return this.kanjiRepository.findIdByCharacter(...args)
  }

  createWithMeaningKey(...args: Parameters<KanjiRepo['createWithMeaningKey']>) {
    return this.kanjiRepository.createWithMeaningKey(...args)
  }

  setMeaningKey(...args: Parameters<KanjiRepo['setMeaningKey']>) {
    return this.kanjiRepository.setMeaningKey(...args)
  }

  findRowByCharacter(...args: Parameters<KanjiRepo['findRowByCharacter']>) {
    return this.kanjiRepository.findRowByCharacter(...args)
  }
}
