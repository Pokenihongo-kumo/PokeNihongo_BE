import { HttpException, Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import {
  ListSrsQueryDto,
  ReviewActionDto,
  UpsertSrsReviewDto
} from './dto/user-srs-review.zod-dto'
import { SrsReviewRepo } from './user-srs-review.repo'
import { TranslationHelperService } from '@/modules/translation/translation.helper.service'
import {
  ForbiddenSrsAccessException,
  InvalidSrsDataException,
  SrsNotFoundException
} from './dto/user-srs-review.error'
import { ListSrsTodayQuery } from './entities/user-srs-review.entity'
import { I18nService } from '@/i18n/i18n.service'
import { SrsReviewMessage as M } from '@/i18n/message-keys'
import { toPaginationMeta } from '@/shared/utils/pagination'
import { isNotFoundPrismaError } from '@/shared/utils/prisma-errors'
import { SrsContentType, UserSrsReview } from '@prisma/client'

// Days until the next review for each SRS level
const SCHEDULE_DAYS = [1, 3, 7, 14, 30, 60, 120]
// Wrong this many times in a row: a leech
const LEECH_STREAK = 5

@Injectable()
export class SrsReviewService {
  private readonly logger = new Logger(SrsReviewService.name)
  private static readonly HCM_TIMEZONE = 'Asia/Ho_Chi_Minh'
  private static readonly HCM_TIMEZONE_OFFSET = '+07:00'

  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: SrsReviewRepo,
    private readonly translationHelper: TranslationHelperService,
    private readonly i18nService: I18nService
  ) {}

  // Every review of the user (200 at most), optionally of one type or due now
  async list(userId: number, query: ListSrsQueryDto, lang: string = 'vi') {
    const rows = await this.repo.list({
      userId,
      ...(query.type && { contentType: query.type }),
      ...(query.dueOnly && { nextReviewDate: { lte: new Date() } })
    })
    return {
      statusCode: 200,
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang),
      data: {
        results: rows,
        pagination: toPaginationMeta(1, rows.length || 1, rows.length)
      }
    }
  }

  // Today's unread reviews (Ho Chi Minh day), each with its content in `lang`
  async listToday(userId: number, query?: ListSrsTodayQuery, lang: string = 'vi') {
    const currentPage = query?.currentPage ?? 1
    const pageSize = query?.pageSize ?? 20
    const { start, end } = this.getHcmDayRange(new Date())
    const { rows, total } = await this.repo.listForDate(userId, {
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      start,
      end
    })
    const results = await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        userId: row.userId,
        message: row.message,
        contentType: row.contentType,
        contentId: row.contentId,
        isRead: row.isRead,
        content: await this.getContentDetail(row.contentType, row.contentId, lang)
      }))
    )
    return {
      statusCode: 200,
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang),
      data: {
        results,
        pagination: toPaginationMeta(currentPage, pageSize, total)
      }
    }
  }

  async markRead(userId: number, srsId: number, lang: string = 'vi') {
    try {
      await this.ownedReview(userId, srsId)
      const updated = await this.repo.updateById(srsId, { isRead: true })
      return {
        statusCode: 200,
        message: this.i18nService.translate(M.UPDATE_SUCCESS, lang),
        data: updated
      }
    } catch (error) {
      throw this.toSrsError(error)
    }
  }

  async getDetailBySrsId(userId: number, srsId: number, lang: string = 'vi') {
    try {
      const srs = await this.ownedReview(userId, srsId)
      const content = await this.getContentDetail(srs.contentType, srs.contentId, lang)
      return {
        statusCode: 200,
        message: this.i18nService.translate(M.GET_SUCCESS, lang),
        data: {
          srs: {
            id: srs.id,
            userId: srs.userId,
            message: srs.message,
            srsLevel: srs.srsLevel,
            incorrectStreak: srs.incorrectStreak,
            isLeech: srs.isLeech,
            isRead: srs.isRead
          },
          content
        }
      }
    } catch (error) {
      throw this.toSrsError(error)
    }
  }

  // A new review is due now (nextReviewDate has no default: creating one used
  // to fail, so every upsert of new content answered 400)
  async upsert(userId: number, body: UpsertSrsReviewDto, lang: string = 'vi') {
    try {
      const data = await this.repo.upsert(
        userId,
        body.contentType,
        body.contentId,
        body.message
      )
      return {
        statusCode: 200,
        message: this.i18nService.translate(M.UPSERT_SUCCESS, lang),
        data
      }
    } catch (error) {
      throw this.toSrsError(error)
    }
  }

  // Used by flashcard. Correct: one level up, next review after SCHEDULE_DAYS
  // of that level. Wrong: back to level 0, review tomorrow
  async applyReview(userId: number, type: string, id: number, body: ReviewActionDto) {
    try {
      const contentType = String(type).toUpperCase() as SrsContentType
      const existing =
        (await this.repo.findUnique(userId, contentType, id)) ??
        (await this.repo.upsert(userId, contentType, id))
      const isCorrect = body.result === 'correct'
      const srsLevel = isCorrect
        ? Math.min(existing.srsLevel + 1, SCHEDULE_DAYS.length - 1)
        : 0
      const incorrectStreak = isCorrect ? 0 : existing.incorrectStreak + 1
      const nextReviewDate = new Date()
      nextReviewDate.setDate(
        nextReviewDate.getDate() + (isCorrect ? SCHEDULE_DAYS[srsLevel] || 1 : 1)
      )
      const updated = await this.repo.update(userId, contentType, id, {
        srsLevel,
        nextReviewDate,
        incorrectStreak,
        isLeech: incorrectStreak >= LEECH_STREAK,
        message: body.message ?? undefined
      })
      return {
        statusCode: 200,
        message: this.i18nService.translate(M.UPDATE_SUCCESS, 'vi'),
        data: updated
      }
    } catch (error) {
      throw this.toSrsError(error)
    }
  }

  // Grammar with its usages, kanji with its readings, or a word with its
  // meanings; texts in `lang`, else vi. null when the content is gone
  async getContentDetail(type: string, id: number, lang: string) {
    const t = String(type).toUpperCase()
    const language = (lang || 'vi').toLowerCase()
    const text = async (key?: string | null) =>
      key
        ? (await this.translationHelper.getTranslation(key, language)) ||
          (await this.translationHelper.getTranslation(key, 'vi'))
        : null

    if (t === 'GRAMMAR') {
      const grammar = await this.prisma.grammar.findUnique({ where: { id } })
      if (!grammar) return null
      const usages = await this.prisma.grammarUsage.findMany({
        where: { grammarId: id },
        orderBy: { id: 'asc' }
      })
      return {
        type: 'grammar',
        id: grammar.id,
        structure: grammar.structure,
        level: grammar.level,
        usages: await Promise.all(
          usages.map(async (u) => ({
            id: u.id,
            explanation: await text(u.explanationKey),
            exampleSentence: await text(u.exampleSentenceKey)
          }))
        )
      }
    }
    if (t === 'KANJI') {
      const kanji = await this.prisma.kanji.findUnique({
        where: { id },
        include: { readings: true }
      })
      if (!kanji) return null
      // Only the first sentence of the meaning
      const meaning = (await text(kanji.meaningKey))?.split('.')[0].trim() ?? null
      const readings = (type: string) =>
        kanji.readings
          .filter((r) => r.readingType?.toLowerCase() === type)
          .map((r) => r.reading)
          .join(', ')
      return {
        type: 'kanji',
        id: kanji.id,
        character: kanji.character,
        meaning,
        jlptLevel: kanji.jlptLevel,
        onReading: readings('onyomi'),
        kunReading: readings('kunyomi')
      }
    }
    if (t === 'VOCABULARY') {
      const vocabulary = await this.prisma.vocabulary.findUnique({
        where: { id },
        include: { meanings: true }
      })
      if (!vocabulary) return null
      const meanings = await Promise.all(
        vocabulary.meanings.map((m) => text(m.meaningKey))
      )
      return {
        type: 'vocabulary',
        id: vocabulary.id,
        wordJp: vocabulary.wordJp,
        reading: vocabulary.reading,
        meaning: meanings.filter(Boolean).join(', ') || null,
        audioUrl: vocabulary.audioUrl,
        imageUrl: vocabulary.imageUrl
      }
    }
    return { type: t.toLowerCase(), id }
  }

  //#region helpers
  private async ownedReview(userId: number, srsId: number): Promise<UserSrsReview> {
    const srs = await this.repo.findById(srsId)
    if (!srs) throw new SrsNotFoundException()
    if (srs.userId !== userId) throw new ForbiddenSrsAccessException()
    return srs
  }

  private getHcmDayRange(date: Date) {
    const day = new Intl.DateTimeFormat('en-CA', {
      timeZone: SrsReviewService.HCM_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date)
    const offset = SrsReviewService.HCM_TIMEZONE_OFFSET
    return {
      start: new Date(`${day}T00:00:00${offset}`),
      end: new Date(`${day}T23:59:59.999${offset}`)
    }
  }

  private toSrsError(error: unknown): HttpException {
    if (error instanceof HttpException) return error
    this.logger.error('SRS request failed', error instanceof Error ? error.stack : error)
    if (isNotFoundPrismaError(error)) return new SrsNotFoundException()
    return new InvalidSrsDataException()
  }
  //#endregion
}
