import {
  CreateVocabularyBodyType,
  GetVocabularyByIdParamsType,
  GetVocabularyListQueryType,
  UpdateVocabularyBodyType,
  VocabularyType
} from '@/modules/vocabulary/entities/vocabulary.entity'
import {
  InvalidVocabularyDataException,
  VocabularyAlreadyExistsException,
  VocabularyNotFoundException,
  MeaningAlreadyExistsException,
  VocabularyJapaneseTextInvalidException
} from '@/modules/vocabulary/dto/vocabulary.error'
import { VocabularyRepo } from '@/modules/vocabulary/vocabulary.repo'
import { VocabularyHelperService } from '@/modules/vocabulary/vocabulary.helper.service'
import { MeaningService } from '@/modules/meaning/meaning.service'
import { VOCABULARY_MESSAGE } from '@/common/constants/message'
import { UploadService } from '@/3rdService/upload/upload.service'
import { TextToSpeechService } from '@/3rdService/speech/text-to-speech.service'
import { TranslationService } from '@/modules/translation/translation.service'
import { LanguagesService } from '@/modules/languages/languages.service'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'
import { Injectable, Logger } from '@nestjs/common'
import * as XLSX from 'xlsx'
import { WordTypeService } from '@/modules/wordtype/wordtype.service'
import e from 'express'

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
    private readonly languagesService: LanguagesService,
    private readonly wordTypeService: WordTypeService
  ) {}

  // Removed old create method - use createFullVocabularyWithFiles instead

  //#region Find All
  async findAll(query: GetVocabularyListQueryType, lang: string) {
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
        languageId = language?.data?.id
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
        statusCode: 200,
        message: VOCABULARY_MESSAGE.GET_LIST_SUCCESS,
        data: {
          results: resultsWithWordType,
          pagination: {
            current: result.page,
            pageSize: result.limit,
            totalPage: Math.ceil(result.total / result.limit),
            totalItem: result.total
          }
        }
      }
    } catch (error) {
      this.logger.error('Error in findAll vocabulary:', error)
      throw error
    }
  }
  //#endregion

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
                  if (meaningError === MeaningAlreadyExistsException) {
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

            const result = await this.createFullVocabularyWithFiles(
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

      return {
        statusCode: 201,
        message: `Import từ vựng thành công: ${created.length} mục, bỏ qua ${skipped.length} mục`,
        data: {
          created,
          skipped
        }
      }
    } catch (error) {
      this.logger.error('Error importing vocabularies from xlsx:', error)
      throw InvalidVocabularyDataException
    }
  }
  //#endregion

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
                if (e === MeaningAlreadyExistsException) {
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
          const result = await this.createFullVocabularyWithFiles(
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

      return {
        statusCode: 201,
        message: `Import TXT thành công: ${created.length} mục, bỏ qua ${skipped.length} mục`,
        data: { created, skipped }
      }
    } catch (error) {
      this.logger.error('Error importing vocabularies from txt:', error)
      throw InvalidVocabularyDataException
    }
  }
  //#endregion

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
          return r.data.id
        } catch {
          /* fallback */
        }
        const rAlias = await this.wordTypeService.findByNameKey(
          'wordtype.verb_ichidan.name'
        )
        return rAlias.data.id
      }
      if (type.includes('godan')) {
        try {
          const r = await this.wordTypeService.findByNameKey('wordtype.godan_verb.name')
          return r.data.id
        } catch {
          /* fallback */
        }
        const rAlias = await this.wordTypeService.findByNameKey(
          'wordtype.verb_godan.name'
        )
        return rAlias.data.id
      }
      if (type.includes('i_adjective') || type.includes('i-adjective')) {
        const r = await this.wordTypeService.findByNameKey('wordtype.i_adjective.name')
        return r.data.id
      }
      if (type.includes('na_adjective') || type.includes('na-adjective')) {
        const r = await this.wordTypeService.findByNameKey('wordtype.na_adjective.name')
        return r.data.id
      }
      if (type.includes('adverb')) {
        const r = await this.wordTypeService.findByNameKey('wordtype.adverb.name')
        return r.data.id
      }
      if (type.includes('particle')) {
        const r = await this.wordTypeService.findByNameKey('wordtype.particle.name')
        return r.data.id
      }
      if (type.includes('noun')) {
        const r = await this.wordTypeService.findByNameKey('wordtype.noun.name')
        return r.data.id
      }
    } catch {
      /* ignore */
    }
    return undefined
  }

  //#region Statistics
  async getStatistics() {
    const stats = await this.vocabularyRepository.getStatistics()

    return {
      statusCode: 200,
      message: VOCABULARY_MESSAGE.GET_STATS_SUCCESS,
      data: stats
    }
  }
  //#endregion

  //#region Find One
  async findOne(id: number, lang: string) {
    const vocabulary = await this.vocabularyRepository.findUnique({
      id
    })

    if (!vocabulary) {
      throw VocabularyNotFoundException
    }

    // Resolve wordType translation if present
    let vocabularyWithWordType = vocabulary
    if (vocabulary.wordType) {
      try {
        const language = await this.languagesService.findByCode({ code: lang })
        if (language?.data?.id) {
          const translation = await this.translationService.findByKeyAndLanguage(
            vocabulary.wordType.nameKey,
            language.data.id
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

    return {
      data: vocabularyWithWordType,
      message: VOCABULARY_MESSAGE.GET_SUCCESS
    }
  }

  async findByWordJp(wordJp: string) {
    const vocabulary = await this.vocabularyRepository.findFirst({
      wordJp
    })

    if (!vocabulary) {
      return null
    }

    return {
      data: vocabulary,
      message: VOCABULARY_MESSAGE.GET_SUCCESS
    }
  }

  async findOneDetail(id: number, lang: string, userId?: number) {
    const vocabulary = await this.vocabularyRepository.findUnique({
      id
    })

    if (!vocabulary) {
      throw VocabularyNotFoundException
    }

    // Get language ID
    let languageId: number | undefined
    try {
      const language = await this.languagesService.findByCode({ code: lang })
      languageId = language?.data?.id
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
              if (viLanguage?.data?.id) {
                const viTranslation = await this.translationService.findByKeyAndLanguage(
                  vocabulary.wordType.nameKey,
                  viLanguage.data.id
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
        viLanguageId = viLanguage?.data?.id
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
      statusCode: 200,
      message: VOCABULARY_MESSAGE.GET_SUCCESS,
      data: {
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
        languageId = language?.data?.id
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
        statusCode: 200,
        message: VOCABULARY_MESSAGE.GET_LIST_SUCCESS,
        data: {
          results,
          pagination: {
            current: result.page,
            pageSize: result.limit,
            totalPage: Math.ceil(result.total / result.limit),
            totalItem: result.total
          }
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
        languageId = language?.data?.id
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
        statusCode: 200,
        message: VOCABULARY_MESSAGE.GET_LIST_SUCCESS,
        data: {
          results,
          pagination: {
            current: result.page,
            pageSize: result.limit,
            totalPage: Math.ceil(result.total / result.limit),
            totalItem: result.total
          }
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
    body: UpdateVocabularyBodyType,
    imageFile?: Express.Multer.File,
    audioFile?: Express.Multer.File,
    regenerateAudio?: boolean
  ) {
    try {
      // Get existing vocabulary to get old URLs
      const existingVocabulary = await this.vocabularyRepository.findUnique({ id })
      if (!existingVocabulary) {
        throw VocabularyNotFoundException
      }

      // Upload new files if provided and get URLs
      const uploadResults = await this.uploadVocabularyFiles(
        imageFile,
        audioFile,
        existingVocabulary.imageUrl || undefined,
        existingVocabulary.audioUrl || undefined
      )

      let finalAudioUrl = uploadResults.data.audioUrl || existingVocabulary.audioUrl

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
        imageUrl: uploadResults.data.imageUrl || existingVocabulary.imageUrl,
        audioUrl: finalAudioUrl
      }

      // If wordJp is being updated, check for duplicates
      if (updateData.wordJp && updateData.wordJp !== existingVocabulary.wordJp) {
        const duplicateVocabulary = await this.vocabularyRepository.findFirst({
          wordJp: updateData.wordJp
        })
        if (duplicateVocabulary && duplicateVocabulary.id !== id) {
          throw VocabularyAlreadyExistsException
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

      return {
        data: vocabulary,
        message: VOCABULARY_MESSAGE.UPDATE_SUCCESS
      }
    } catch (error) {
      // If it's our custom exceptions, re-throw them
      if (
        error === VocabularyNotFoundException ||
        error === VocabularyAlreadyExistsException
      ) {
        throw error
      }
      // Handle database errors
      if (isNotFoundPrismaError(error)) {
        throw VocabularyNotFoundException
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw VocabularyAlreadyExistsException
      }
      this.logger.error('Error updating vocabulary:', error)
      throw InvalidVocabularyDataException
    }
  }
  //#endregion

  //#region Remove
  async remove(id: number) {
    try {
      const vocabulary = await this.vocabularyRepository.delete({ id })

      return {
        data: vocabulary,
        message: VOCABULARY_MESSAGE.DELETE_SUCCESS
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw VocabularyNotFoundException
      }
      this.logger.error('Error deleting vocabulary:', error)
      throw InvalidVocabularyDataException
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
      return {
        data: { imageUrl },
        message: 'Upload hình ảnh từ vựng thành công'
      }
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
      return {
        data: { audioUrl },
        message: 'Upload âm thanh từ vựng thành công'
      }
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
      return {
        data: results,
        message: 'Upload files từ vựng thành công'
      }
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
        throw VocabularyNotFoundException
      }

      // Thêm meaning mới
      const meaning = await this.vocabularyHelperService.addMeaningToVocabulary(
        vocabularyId,
        meaningData
      )

      return {
        data: meaning,
        message: 'Thêm nghĩa mới thành công'
      }
    } catch (error) {
      this.logger.error(`Error adding meaning to vocabulary ${vocabularyId}:`, error)
      if (error === VocabularyNotFoundException) {
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
        throw VocabularyJapaneseTextInvalidException
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
          throw VocabularyNotFoundException
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
          message: VOCABULARY_MESSAGE.ADD_MEANING_SUCCESS
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
          message: VOCABULARY_MESSAGE.CREATE_FULL_SUCCESS
        }
      }
    } catch (error) {
      this.logger.error('Error creating full vocabulary with files:', error)
      // Let specific exceptions bubble up
      if (
        error === VocabularyJapaneseTextInvalidException ||
        (error &&
          error.status === 409 &&
          error.response?.error === 'MEANING_ALREADY_EXISTS')
      ) {
        throw error
      }
      throw InvalidVocabularyDataException
    }
  }
  //#endregion

  // Helper: validate Japanese text (Hiragana/Katakana/Kanji)
  private isJapaneseText(text: string): boolean {
    if (!text || typeof text !== 'string') return false
    // Reject obvious Latin letters, digits, common symbols
    const hasNonJapanese = /[a-zA-Z0-9@#$%^&*()_+=\[\]{}|\\:\";'<>?,./`~]/.test(text)
    if (hasNonJapanese) return false
    // Require at least one Japanese character
    const japaneseRegex =
      /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF\u20000-\u2A6DF\u2A700-\u2B73F\u2B740-\u2B81F\u2B820-\u2CEAF\uF900-\uFAFF\u2F800-\u2FA1F]/
    return japaneseRegex.test(text)
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

          const result = await this.createFullVocabularyWithFiles(
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
        statusCode: 201,
        message: `${VOCABULARY_MESSAGE.CREATE_SAMPLE_SUCCESS}. Đã tạo ${createdVocabularies.length} từ vựng`,
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
      throw InvalidVocabularyDataException
    }
  }
  //#endregion
}
