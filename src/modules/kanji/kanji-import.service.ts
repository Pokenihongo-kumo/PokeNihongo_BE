import { isKanjiCharacter } from '@/common/utils/japanese-text'
import { KanjiMessage as M } from '@/i18n/message-keys'
import { KanjiReadingService } from '@/modules/kanji-reading/kanji-reading.service'
import { isUniqueConstraintPrismaError } from '@/shared/utils/prisma-errors'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import * as XLSX from 'xlsx'
import { InvalidKanjiDataException, KanjiAlreadyExistsException } from './dto/kanji.error'
import { KanjiRepo } from './kanji.repo'

// Importing kanji from xlsx/txt files: new kanji with readings and meanings,
// missing fields of existing ones filled in. KanjiService forwards here.
@Injectable()
export class KanjiImportService {
  private readonly logger = new Logger(KanjiImportService.name)

  constructor(
    private readonly kanjiRepository: KanjiRepo,
    private readonly kanjiReadingService: KanjiReadingService
  ) {}

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

  //#region Import from TXT
  /**
   * Import Kanji từ file TXT (tab-separated)
   * Cấu trúc: kanji	mean	detail	kun	on	jlpt	strokes
   */
  async importFromTxt(file: Express.Multer.File, language: string = 'en') {
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
}
