import { TextToSpeechService } from '@/modules/speech/text-to-speech.service'
import { UploadService } from '@/modules/upload/upload.service'
import { WordTypeService } from '@/modules/wordtype/wordtype.service'
import { Injectable, Logger } from '@nestjs/common'
import * as XLSX from 'xlsx'
import {
  InvalidVocabularyDataException,
  MeaningAlreadyExistsException
} from './dto/vocabulary.error'
import { VocabularyHelperService } from './vocabulary.helper.service'
import { VocabularyRepo } from './vocabulary.repo'
import { VocabularyService } from './vocabulary.service'

// Importing words from xlsx/txt files and creating the sample set: each row
// goes through VocabularyService.createFullVocabularyWithFiles. The
// controller calls this service directly (VocabularyService forwarding here
// would close a dependency cycle).
@Injectable()
export class VocabularyImportService {
  private readonly logger = new Logger(VocabularyImportService.name)

  constructor(
    private readonly vocabularyRepository: VocabularyRepo,
    private readonly uploadService: UploadService,
    private readonly textToSpeechService: TextToSpeechService,
    private readonly vocabularyHelperService: VocabularyHelperService,
    private readonly wordTypeService: WordTypeService,
    private readonly vocabularyService: VocabularyService
  ) {}

  //#region Import from XLSX
  /**
   * Import vocabularies from an Excel file (.xlsx) with columns:
   * word (Japanese word), phonetic (reading), mean (English meaning)
   *
   * Xử lý đặc biệt:
   * - Bỏ qua dòng có word trống hoặc là dấu '-'
   * - Nếu phonetic trống, sử dụng word làm reading
   * - Nếu phonetic có nhiều cách đọc (có dấu '・'), lấy cách đọc đầu tiên
   * - Tách cột mean bằng dấu ';' thành nhiều meanings riêng biệt
   */
  async importFromXlsxFiles(
    files: Express.Multer.File[],
    createdById?: number,
    languageCode: string = 'vi',
    allowUpdateLevelN: boolean = false,
    forcedLevelN?: number
  ) {
    try {
      if (!files || files.length === 0) {
        throw new Error('Cần upload ít nhất 1 file')
      }

      const normalizedLanguage = (languageCode || 'vi').toLowerCase()

      const created: any[] = []
      const skipped: Array<{ word: string; reason: string }> = []

      for (const file of files) {
        if (!file || !file.buffer) {
          continue
        }

        const workbook = XLSX.read(file.buffer, { type: 'buffer' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const rows: Array<Record<string, any>> = XLSX.utils.sheet_to_json(sheet, {
          defval: ''
        })

        for (const row of rows) {
          const wordJp = (row.word || '').toString().trim()
          const phonetic = (row.phonetic || '').toString().trim()
          const meanEn = (row.mean || '').toString().trim()
          const levelNFromRow =
            row.level_n !== undefined && row.level_n !== null && row.level_n !== ''
              ? Number(row.level_n)
              : undefined
          const targetLevelN = forcedLevelN !== undefined ? forcedLevelN : levelNFromRow

          // Bỏ qua các dòng trống hoặc không có word
          if (!wordJp || wordJp === '-') {
            continue
          }

          if (!meanEn) {
            skipped.push({ word: wordJp, reason: 'Thiếu nghĩa tiếng Anh' })
            continue
          }

          try {
            // Tạo danh sách nghĩa từ cột mean - tách các nghĩa khác nhau
            const meanings: Array<{ language_code: string; value: string }> = []

            if (meanEn) {
              // Tách các nghĩa bằng dấu chấm phẩy
              const meaningParts = meanEn
                .split(';')
                .map((part) => part.trim())
                .filter((part) => part.length > 0)

              // Nếu có nhiều nghĩa, tạo từng nghĩa riêng biệt
              if (meaningParts.length > 1) {
                meaningParts.forEach((meaning) => {
                  meanings.push({ language_code: normalizedLanguage, value: meaning })
                })
              } else {
                // Nếu chỉ có một nghĩa, lưu nguyên
                meanings.push({ language_code: normalizedLanguage, value: meanEn })
              }
            }

            // Xử lý reading: nếu có phonetic thì dùng, nếu không thì dùng wordJp
            let reading = phonetic || wordJp

            // Nếu phonetic có nhiều cách đọc, lấy cách đọc đầu tiên
            if (phonetic && phonetic.includes('・')) {
              reading = phonetic.split('・')[0]
            }

            const existing =
              await this.vocabularyHelperService.checkVocabularyExists(wordJp)
            let vocabId = existing.vocabularyId

            if (!existing.exists || !vocabId) {
              const fallback = await this.vocabularyRepository.findFirst({ wordJp })
              if (fallback) {
                vocabId = fallback.id
              }
            }

            if (vocabId) {
              if (
                targetLevelN !== undefined &&
                (allowUpdateLevelN || forcedLevelN !== undefined)
              ) {
                await this.vocabularyRepository.update(
                  { id: vocabId },
                  { levelN: targetLevelN }
                )
              }

              if (meanings.length === 0) {
                skipped.push({ word: wordJp, reason: 'Không có nghĩa để thêm' })
                continue
              }

              for (const meaningEntry of meanings) {
                try {
                  const result =
                    await this.vocabularyHelperService.addMeaningWithTranslations(
                      vocabId,
                      { meaning: [meaningEntry] }
                    )
                  created.push({
                    vocabulary: { id: vocabId, wordJp },
                    meaning: meaningEntry,
                    translationsCreated: result.translationsCreated,
                    isNew: false
                  })
                } catch (meaningError: any) {
                  if (meaningError instanceof MeaningAlreadyExistsException) {
                    skipped.push({
                      word: wordJp,
                      reason: `Meaning already exists (${meaningEntry.value})`
                    })
                  } else {
                    skipped.push({
                      word: wordJp,
                      reason: meaningError?.message || 'Lỗi không xác định'
                    })
                  }
                }
              }
              continue
            }

            const result = await this.vocabularyService.createFullVocabularyWithFiles(
              {
                word_jp: wordJp,
                reading: reading,
                translations: {
                  meaning: meanings
                },
                level_n: targetLevelN
              },
              undefined,
              undefined,
              createdById,
              allowUpdateLevelN || forcedLevelN !== undefined
            )
            created.push(result.data)
          } catch (err: any) {
            skipped.push({ word: wordJp, reason: err?.message || 'Lỗi không xác định' })
          }
        }
      }

      return { created, skipped }
    } catch (error) {
      this.logger.error('Error importing vocabularies from xlsx:', error)
      throw new InvalidVocabularyDataException()
    }
  }

  //#region Import from TXT (tab-separated)
  /**
   * Import vocabularies from a tab-separated TXT file with columns:
   * Category	word	reading	meaning	example_jp	example_vi
   */
  async importFromTxt(
    file: Express.Multer.File,
    createdById?: number,
    languageCode: string = 'vi'
  ) {
    try {
      if (!file || !file.buffer) {
        throw new Error('File không hợp lệ')
      }

      const normalizedLanguage = (languageCode || 'vi').toLowerCase()

      const content = file.buffer.toString('utf8')
      const linesAll = content.split(/\r?\n/)
      const lines = linesAll.filter((l) => l.trim().length > 0)

      const created: any[] = []
      const skipped: Array<{ word: string; reason: string }> = []

      // Detect header
      const headerCols = lines[0]?.split('\t') || []
      const hasHeaderWord = headerCols.some((h) => /^(word|từ|kanji)$/i.test(h.trim()))

      let startIndex = 0
      let idxWord = 0
      let idxReading = 1
      let idxMeaning = 2
      let idxExampleJp = 3
      let idxExampleVi = 4
      let idxJlpt = -1
      let idxWordType = -1
      let legacyCategory = false

      if (hasHeaderWord) {
        // New cleaned format with header
        startIndex = 1
        const map = new Map<string, number>()
        headerCols.forEach((h, i) => map.set(h.trim().toLowerCase(), i))
        idxWord = map.get('word') ?? 0
        idxReading = map.get('reading') ?? 1
        idxMeaning = map.get('meaning') ?? 2
        idxExampleJp = map.get('example_jp') ?? 3
        idxExampleVi = map.get('example_vi') ?? 4
        idxJlpt = map.get('jlpt') ?? -1
        idxWordType = map.get('word_type') ?? -1
      } else {
        // Legacy format: Category, word, reading, meaning, example_jp, example_vi
        legacyCategory = true
        startIndex = 0
      }

      // (moved) resolveWordTypeId helper is now a class method

      for (let li = startIndex; li < lines.length; li++) {
        const line = lines[li]
        const cols = line.split('\t')
        if (legacyCategory) {
          if (cols.length < 4) {
            skipped.push({ word: '', reason: 'Dòng không đúng định dạng (>=4 cột)' })
            continue
          }
        } else {
          if (cols.length < 3) {
            skipped.push({ word: '', reason: 'Dòng không đúng định dạng (>=3 cột)' })
            continue
          }
        }

        let levelN: number | undefined
        let wordTypeId: number | undefined
        let exampleJp: string | undefined
        let exampleVi: string | undefined

        let word = ''
        let reading = ''
        let meaningVi = ''

        if (legacyCategory) {
          const category = (cols[0] || '').trim()
          word = (cols[1] || '').trim()
          reading = (cols[2] || '').trim()
          meaningVi = (cols[3] || '').trim()
          exampleJp = (cols[4] || '').trim() || undefined
          exampleVi = (cols[5] || '').trim() || undefined

          const m = category.match(/N([1-5])/i)
          if (m) levelN = parseInt(m[1], 10)
        } else {
          word = (cols[idxWord] || '').trim()
          reading = (cols[idxReading] || '').trim()
          meaningVi = (cols[idxMeaning] || '').trim()
          exampleJp = idxExampleJp >= 0 ? (cols[idxExampleJp] || '').trim() : ''
          exampleVi = idxExampleVi >= 0 ? (cols[idxExampleVi] || '').trim() : ''
          if (idxJlpt >= 0) {
            const j = (cols[idxJlpt] || '').trim()
            if (/^[1-5]$/.test(j)) levelN = parseInt(j, 10)
          }
          if (idxWordType >= 0) {
            const wt = (cols[idxWordType] || '').trim()
            wordTypeId = await this.resolveWordTypeId(wt)
            if (wt && !wordTypeId) {
              throw new Error(`Word type not found in system: '${wt}' at line ${li + 1}`)
            }
          }
        }

        if (!word || !reading || !meaningVi) {
          skipped.push({ word, reason: 'Thiếu dữ liệu (word/reading/meaning)' })
          continue
        }

        try {
          // Check if vocabulary exists (same word_jp )
          const existingCheck2 =
            await this.vocabularyHelperService.checkVocabularyExists(word)

          if (existingCheck2.exists && existingCheck2.vocabularyId) {
            const existing = await this.vocabularyRepository.findUnique({
              id: existingCheck2.vocabularyId
            })
            if (!existing) {
              // fallback: proceed to create
            } else {
              this.logger.log(
                `[Import TXT] Found existing vocab ${existing.id}: word="${existing.wordJp}", reading_db="${existing.reading}", reading_file="${reading}"`
              )
              // Prepare updates for NULL fields or changed reading
              const updateData: any = {}
              if (existing.levelN == null && typeof levelN === 'number') {
                updateData.levelN = levelN
                this.logger.log(
                  `[Vocab ${existing.id}] Updating levelN: null → ${levelN}`
                )
              }
              if (
                (existing as any).wordTypeId == null &&
                typeof wordTypeId === 'number'
              ) {
                updateData.wordTypeId = wordTypeId
                this.logger.log(
                  `[Vocab ${existing.id}] Updating wordTypeId: null → ${wordTypeId}`
                )
              }
              // Update reading if different (và không rỗng)
              if (reading && existing.reading !== reading) {
                updateData.reading = reading
                this.logger.log(
                  `[Vocab ${existing.id}] Updating reading: "${existing.reading}" → "${reading}"`
                )
              }
              if (!existing.audioUrl) {
                try {
                  const tts = await this.textToSpeechService.convertTextToSpeech(word, {
                    languageCode: 'ja-JP',
                    audioEncoding: 'MP3'
                  })
                  const audioBuffer = tts.audioContent
                  const fileName = `vocabulary_${word}_${Date.now()}.mp3`
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
                  const upload = await this.uploadService.uploadFile(
                    generatedAudioFile,
                    'vocabulary/audio'
                  )
                  updateData.audioUrl = upload.url
                } catch {
                  /* ignore TTS failure */
                }
              }

              if (Object.keys(updateData).length > 0) {
                this.logger.log(
                  `[Vocab ${existing.id}] Applying updates: ${JSON.stringify(updateData)}`
                )
                await this.vocabularyRepository.update({ id: existing.id }, updateData)
                this.logger.log(`[Vocab ${existing.id}] Update completed successfully`)
              } else {
                this.logger.log(`[Vocab ${existing.id}] No fields to update`)
              }

              // Skip adding meaning if it already exists (helper throws MeaningAlreadyExistsException)
              try {
                await this.vocabularyHelperService.addMeaningWithTranslations(
                  existing.id,
                  {
                    meaning: [{ language_code: normalizedLanguage, value: meaningVi }],
                    examples: exampleVi
                      ? [
                          {
                            original_sentence: exampleJp || '',
                            translations: [
                              { language_code: normalizedLanguage, sentence: exampleVi }
                            ]
                          }
                        ]
                      : undefined
                  },
                  wordTypeId
                )
              } catch (e: any) {
                // If meaning already exists, silently skip (don't create duplicate)
                if (e instanceof MeaningAlreadyExistsException) {
                  this.logger.log(
                    `Meaning already exists for vocabulary ${existing.id}, skipping`
                  )
                } else {
                  throw e
                }
              }

              created.push({
                vocabulary: { ...existing },
                message:
                  'Skipped create; updated null fields and/or added translations if needed'
              })
              continue
            }
          }

          // Not existing → create full
          const result = await this.vocabularyService.createFullVocabularyWithFiles(
            {
              word_jp: word,
              reading,
              level_n: levelN,
              word_type_id: wordTypeId,
              translations: {
                meaning: [{ language_code: normalizedLanguage, value: meaningVi }],
                examples: exampleVi
                  ? [
                      {
                        original_sentence: exampleJp || '',
                        translations: [
                          { language_code: normalizedLanguage, sentence: exampleVi }
                        ]
                      }
                    ]
                  : undefined
              }
            },
            undefined,
            undefined,
            createdById
          )
          created.push(result.data)
        } catch (err: any) {
          skipped.push({ word, reason: err?.message || 'Lỗi không xác định' })
        }
      }

      return { created, skipped }
    } catch (error) {
      this.logger.error('Error importing vocabularies from txt:', error)
      throw new InvalidVocabularyDataException()
    }
  }

  //#region Create Sample Vocabularies
  /**
   * Tạo nhiều từ vựng mẫu với dữ liệu mặc định
   */
  async createSampleVocabularies(userId?: number) {
    try {
      this.logger.log('Creating sample vocabularies...')

      // Dữ liệu mẫu cho các từ vựng tiếng Nhật cơ bản
      // word_jp: Hán tự (Kanji) hoặc Hiragana/Katakana nếu không có Kanji
      // reading: Hiragana (cách đọc)
      const sampleVocabularies = [
        {
          word_jp: '水',
          reading: 'みず',
          level_n: 5,
          translations: {
            meaning: [
              { language_code: 'vi', value: 'Nước' },
              { language_code: 'en', value: 'Water' }
            ]
          }
        },
        {
          word_jp: '山',
          reading: 'やま',
          level_n: 5,
          translations: {
            meaning: [
              { language_code: 'vi', value: 'Núi' },
              { language_code: 'en', value: 'Mountain' }
            ]
          }
        },
        {
          word_jp: '人',
          reading: 'ひと',
          level_n: 5,
          translations: {
            meaning: [
              { language_code: 'vi', value: 'Người' },
              { language_code: 'en', value: 'Person' }
            ]
          }
        },
        {
          word_jp: '家',
          reading: 'いえ',
          level_n: 5,
          translations: {
            meaning: [
              { language_code: 'vi', value: 'Nhà' },
              { language_code: 'en', value: 'House / Home' }
            ]
          }
        },
        {
          word_jp: '学校',
          reading: 'がっこう',
          level_n: 5,
          translations: {
            meaning: [
              { language_code: 'vi', value: 'Trường học' },
              { language_code: 'en', value: 'School' }
            ]
          }
        },
        {
          word_jp: '電話',
          reading: 'でんわ',
          level_n: 4,
          translations: {
            meaning: [
              { language_code: 'vi', value: 'Điện thoại' },
              { language_code: 'en', value: 'Telephone' }
            ]
          }
        },
        {
          word_jp: '車',
          reading: 'くるま',
          level_n: 4,
          translations: {
            meaning: [
              { language_code: 'vi', value: 'Xe ô tô' },
              { language_code: 'en', value: 'Car' }
            ]
          }
        },
        {
          word_jp: '飛行機',
          reading: 'ひこうき',
          level_n: 4,
          translations: {
            meaning: [
              { language_code: 'vi', value: 'Máy bay' },
              { language_code: 'en', value: 'Airplane' }
            ]
          }
        },
        {
          word_jp: '犬',
          reading: 'いぬ',
          level_n: 5,
          translations: {
            meaning: [
              { language_code: 'vi', value: 'Con chó' },
              { language_code: 'en', value: 'Dog' }
            ]
          }
        },
        {
          word_jp: '猫',
          reading: 'ねこ',
          level_n: 5,
          translations: {
            meaning: [
              { language_code: 'vi', value: 'Con mèo' },
              { language_code: 'en', value: 'Cat' }
            ]
          }
        },
        {
          word_jp: '食べ物',
          reading: 'たべもの',
          level_n: 5,
          translations: {
            meaning: [
              { language_code: 'vi', value: 'Đồ ăn' },
              { language_code: 'en', value: 'Food' }
            ]
          }
        },
        {
          word_jp: '私',
          reading: 'わたし',
          level_n: 5,
          translations: {
            meaning: [
              { language_code: 'vi', value: 'Tôi' },
              { language_code: 'en', value: 'I / Me' }
            ]
          }
        },
        {
          word_jp: 'あなた',
          reading: 'あなた',
          level_n: 5,
          translations: {
            meaning: [
              { language_code: 'vi', value: 'Bạn / Anh / Chị' },
              { language_code: 'en', value: 'You' }
            ]
          }
        },
        {
          word_jp: '本',
          reading: 'ほん',
          level_n: 5,
          translations: {
            meaning: [
              { language_code: 'vi', value: 'Sách' },
              { language_code: 'en', value: 'Book' }
            ]
          }
        },
        {
          word_jp: '友達',
          reading: 'ともだち',
          level_n: 5,
          translations: {
            meaning: [
              { language_code: 'vi', value: 'Bạn bè' },
              { language_code: 'en', value: 'Friend' }
            ]
          }
        },
        {
          word_jp: '先生',
          reading: 'せんせい',
          level_n: 4,
          translations: {
            meaning: [
              { language_code: 'vi', value: 'Giáo viên / Thầy cô' },
              { language_code: 'en', value: 'Teacher' }
            ]
          }
        },
        {
          word_jp: '学生',
          reading: 'がくせい',
          level_n: 4,
          translations: {
            meaning: [
              { language_code: 'vi', value: 'Học sinh / Sinh viên' },
              { language_code: 'en', value: 'Student' }
            ]
          }
        },
        {
          word_jp: '日本語',
          reading: 'にほんご',
          level_n: 4,
          translations: {
            meaning: [
              { language_code: 'vi', value: 'Tiếng Nhật' },
              { language_code: 'en', value: 'Japanese language' }
            ]
          }
        },
        {
          word_jp: '英語',
          reading: 'えいご',
          level_n: 4,
          translations: {
            meaning: [
              { language_code: 'vi', value: 'Tiếng Anh' },
              { language_code: 'en', value: 'English language' }
            ]
          }
        },
        {
          word_jp: '時間',
          reading: 'じかん',
          level_n: 4,
          translations: {
            meaning: [
              { language_code: 'vi', value: 'Thời gian' },
              { language_code: 'en', value: 'Time' }
            ]
          }
        }
      ]

      const createdVocabularies: any[] = []
      const errors: Array<{ word: string; error: string }> = []

      // Tạo từng từ vựng một cách tuần tự để tránh conflict
      for (const vocabData of sampleVocabularies) {
        try {
          this.logger.log(`Creating vocabulary: ${vocabData.word_jp}`)

          const result = await this.vocabularyService.createFullVocabularyWithFiles(
            vocabData,
            undefined, // no audio file
            undefined, // no image file
            userId
          )

          createdVocabularies.push(result.data)
          this.logger.log(`Successfully created: ${vocabData.word_jp}`)
        } catch (error) {
          this.logger.warn(
            `Failed to create vocabulary ${vocabData.word_jp}:`,
            error.message
          )
          errors.push({
            word: vocabData.word_jp,
            error: error.message || 'Unknown error'
          })
        }
      }

      this.logger.log(
        `Sample vocabularies creation completed. Created: ${createdVocabularies.length}, Errors: ${errors.length}`
      )

      return {
        data: {
          results: createdVocabularies,
          pagination: {
            current: 1,
            pageSize: createdVocabularies.length,
            totalPage: 1,
            totalItem: createdVocabularies.length
          },
          summary: {
            totalAttempted: sampleVocabularies.length,
            successfullyCreated: createdVocabularies.length,
            failed: errors.length,
            errors: errors
          }
        }
      }
    } catch (error) {
      this.logger.error('Error creating sample vocabularies:', error)
      throw new InvalidVocabularyDataException()
    }
  }

  /**
   * Chuẩn hóa và ánh xạ chuỗi word_type từ file TXT sang WordTypeId trong hệ thống.
   */
  private async resolveWordTypeId(wordType?: string): Promise<number | undefined> {
    if (!wordType) return undefined
    const type = wordType.toLowerCase()
    try {
      if (type.includes('ichidan')) {
        try {
          const r = await this.wordTypeService.findByNameKey('wordtype.ichidan_verb.name')
          return r.id
        } catch {
          /* fallback */
        }
        const rAlias = await this.wordTypeService.findByNameKey(
          'wordtype.verb_ichidan.name'
        )
        return rAlias.id
      }
      if (type.includes('godan')) {
        try {
          const r = await this.wordTypeService.findByNameKey('wordtype.godan_verb.name')
          return r.id
        } catch {
          /* fallback */
        }
        const rAlias = await this.wordTypeService.findByNameKey(
          'wordtype.verb_godan.name'
        )
        return rAlias.id
      }
      if (type.includes('i_adjective') || type.includes('i-adjective')) {
        const r = await this.wordTypeService.findByNameKey('wordtype.i_adjective.name')
        return r.id
      }
      if (type.includes('na_adjective') || type.includes('na-adjective')) {
        const r = await this.wordTypeService.findByNameKey('wordtype.na_adjective.name')
        return r.id
      }
      if (type.includes('adverb')) {
        const r = await this.wordTypeService.findByNameKey('wordtype.adverb.name')
        return r.id
      }
      if (type.includes('particle')) {
        const r = await this.wordTypeService.findByNameKey('wordtype.particle.name')
        return r.id
      }
      if (type.includes('noun')) {
        const r = await this.wordTypeService.findByNameKey('wordtype.noun.name')
        return r.id
      }
    } catch {
      /* ignore */
    }
    return undefined
  }
}
