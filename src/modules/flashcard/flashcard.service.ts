import {
  CreateFlashcardCardBody,
  CreateFlashcardDeckBody,
  FlashcardCard,
  FlashcardContentType,
  FlashcardDeckDetail,
  FlashcardDeckSummary,
  FlashcardImportContentTypeEnum,
  FlashcardImportResult,
  FlashcardReviewActionBody,
  FlashcardReviewItem,
  FlashcardReviewQuery,
  GetFlashcardCardListQuery,
  GetFlashcardDeckListQuery,
  ImportFlashcardCardsBody,
  UpdateFlashcardCardBody,
  UpdateFlashcardDeckBody
} from './entities/flashcard.entities'
import {
  FlashcardCardNotFoundException,
  FlashcardContentAlreadyExistsException,
  FlashcardDeckNotFoundException,
  InvalidFlashcardImportException
} from './dto/flashcard.error'
import { FlashcardMessage } from '@/i18n/message-keys'
import { FlashcardRepository } from './flashcard.repo'
import { I18nService } from '@/i18n/i18n.service'
import { Injectable, Logger } from '@nestjs/common'
import {
  Prisma,
  FlashcardContentType as PrismaFlashcardContentType
} from '@prisma/client'
import { SrsReviewService } from '@/modules/user-srs-review/user-srs-review.service'
import { TranslationHelperService } from '@/modules/translation/translation.helper.service'

const DEFAULT_LANG = 'vi'

@Injectable()
export class FlashcardService {
  private readonly logger = new Logger(FlashcardService.name)

  constructor(
    private readonly flashcardRepository: FlashcardRepository,
    private readonly srsReviewService: SrsReviewService,
    private readonly i18n: I18nService,
    private readonly translationHelper: TranslationHelperService
  ) {}

  private translate(key: string, lang: string) {
    return this.i18n.translate(key, lang)
  }

  private async translateMeanings(meanings: any[], lang: string): Promise<string> {
    if (!meanings || meanings.length === 0) {
      return ''
    }

    const translatedMeanings = await Promise.all(
      meanings.map(async (meaning: any) => {
        if (meaning.meaningKey) {
          const translated = await this.translationHelper.getTranslation(
            meaning.meaningKey,
            lang
          )
          return translated || ''
        }
        return null
      })
    )

    // Filter out null and empty values and join with comma
    return translatedMeanings
      .filter((m): m is string => m !== null && m !== '')
      .join(', ')
  }

  private mapDeck(deck: any, totalCards: number): FlashcardDeckSummary {
    return {
      id: deck.id,
      userId: deck.userId,
      name: deck.name,
      status: deck.status,
      source: deck.source,
      metadata: deck.metadata ?? null,
      deletedAt: deck.deletedAt,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
      totalCards
    }
  }

  private normalizeMetadataMeaning(value: any): string | null {
    if (!value) return null
    if (typeof value === 'string') return value
    if (Array.isArray(value)) {
      return (
        value
          .map((v) => {
            if (typeof v === 'string') return v
            if (typeof v === 'object' && v !== null) {
              return v.meaning || v.text || v.value || null
            }
            return null
          })
          .filter((v): v is string => !!v)
          .join(', ') || null
      )
    }
    if (typeof value === 'object') {
      if (Array.isArray(value.values)) {
        return value.values.filter((v: any) => typeof v === 'string').join(', ') || null
      }
      if (typeof value.meaning === 'string') return value.meaning
    }
    return null
  }

  private async mapCard(card: any, lang: string = DEFAULT_LANG): Promise<FlashcardCard> {
    const metadata = card.metadata as Record<string, any> | null

    const vocabularyId = card.vocabularyId ?? null

    const vocabulary = card.vocabulary
      ? {
          id: vocabularyId ?? card.vocabulary.id,
          wordJp: metadata?.wordJp ?? card.vocabulary.wordJp,
          reading: metadata?.reading ?? card.vocabulary.reading,
          levelN: card.vocabulary.levelN,
          audioUrl: metadata?.audioUrl ?? card.vocabulary.audioUrl ?? null,
          imageUrl: metadata?.imageUrl ?? card.vocabulary.imageUrl ?? null,
          meanings:
            metadata?.meanings ??
            (await this.translateMeanings(card.vocabulary.meanings || [], lang))
        }
      : card.contentType === 'VOCABULARY' && metadata
        ? {
            id: vocabularyId,
            wordJp: metadata.wordJp ?? metadata.word ?? '',
            reading: metadata.reading ?? metadata.kana ?? null,
            levelN: metadata.levelN ?? null,
            audioUrl: metadata.audioUrl ?? null,
            imageUrl: metadata.imageUrl ?? null,
            meanings: this.normalizeMetadataMeaning(metadata.meanings)
          }
        : null

    return {
      id: card.id,
      deckId: card.deckId,
      contentType: card.contentType,
      status: card.status,
      vocabularyId: card.vocabularyId,
      kanjiId: card.kanjiId,
      grammarId: card.grammarId,
      vocabulary,
      kanji: card.kanji
        ? {
            id: card.kanji.id,
            character: card.kanji.character,
            meaningKey: card.kanji.meaningKey,
            jlptLevel: card.kanji.jlptLevel,
            img: card.kanji.img ?? null
          }
        : null,
      grammar: card.grammar
        ? {
            id: card.grammar.id,
            structure: card.grammar.structure,
            level: card.grammar.level
          }
        : null,
      notes: card.notes,
      read: card.read ?? false,
      deletedAt: card.deletedAt,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt
    }
  }

  private resolveContentId(card: any): number | null {
    if (card.contentType === 'VOCABULARY') {
      return card.vocabularyId ?? null
    }
    if (card.contentType === 'KANJI') {
      return card.kanjiId ?? null
    }
    if (card.contentType === 'GRAMMAR') {
      return card.grammarId ?? null
    }
    return null
  }

  private mapSrsEntry(entry: any) {
    if (!entry) return null
    return {
      id: entry.id,
      srsLevel: entry.srsLevel,
      nextReviewDate: entry.nextReviewDate,
      incorrectStreak: entry.incorrectStreak,
      isLeech: entry.isLeech,
      message: entry.message ?? null
    }
  }

  async createDeck(
    userId: number,
    body: CreateFlashcardDeckBody,
    lang: string = DEFAULT_LANG
  ) {
    const deck = await this.flashcardRepository.createDeck(userId, body)

    return {
      statusCode: 201,
      message: this.translate(FlashcardMessage.CREATE_DECK_SUCCESS, lang),
      data: this.mapDeck(deck, 0)
    }
  }

  async getDecks(
    userId: number,
    query: GetFlashcardDeckListQuery,
    lang: string = DEFAULT_LANG
  ) {
    const { currentPage, pageSize } = query
    const { total, decks, cardCountMap } = await this.flashcardRepository.findDecks(
      userId,
      query
    )

    const results: FlashcardDeckSummary[] = decks.map((deck) =>
      this.mapDeck(deck, cardCountMap.get(deck.id) ?? 0)
    )

    return {
      statusCode: 200,
      message: this.translate(FlashcardMessage.GET_DECK_LIST_SUCCESS, lang),
      data: {
        results,
        pagination: {
          current: currentPage,
          pageSize,
          totalItem: total,
          totalPage: Math.ceil(total / pageSize)
        }
      }
    }
  }

  async getDeckById(deckId: number, userId: number, lang: string = DEFAULT_LANG) {
    const deckWithCards = await this.flashcardRepository.findDeckWithRelations(
      deckId,
      userId
    )
    if (!deckWithCards) {
      throw new FlashcardDeckNotFoundException()
    }

    const totalCards = deckWithCards.cards?.length ?? 0
    const payload: FlashcardDeckDetail = {
      ...this.mapDeck(deckWithCards, totalCards),
      cards: await Promise.all(
        deckWithCards.cards?.map((card) => this.mapCard(card, lang)) || []
      )
    }

    return {
      statusCode: 200,
      message: this.translate(FlashcardMessage.GET_DECK_SUCCESS, lang),
      data: payload
    }
  }

  async updateDeck(
    deckId: number,
    userId: number,
    body: UpdateFlashcardDeckBody,
    lang: string = DEFAULT_LANG
  ) {
    const existingDeck = await this.flashcardRepository.findDeckById(deckId, userId)
    if (!existingDeck) {
      throw new FlashcardDeckNotFoundException()
    }

    const updatedDeck = await this.flashcardRepository.updateDeck(deckId, body)
    const totalCards = await this.flashcardRepository.countDeckCards(deckId)

    return {
      statusCode: 200,
      message: this.translate(FlashcardMessage.UPDATE_DECK_SUCCESS, lang),
      data: this.mapDeck(updatedDeck, totalCards)
    }
  }

  async deleteDeck(deckId: number, userId: number, lang: string = DEFAULT_LANG) {
    const existingDeck = await this.flashcardRepository.findDeckById(deckId, userId)
    if (!existingDeck) {
      throw new FlashcardDeckNotFoundException()
    }

    await this.flashcardRepository.softDeleteDeck(deckId)

    return {
      statusCode: 200,
      message: this.translate(FlashcardMessage.DELETE_DECK_SUCCESS, lang),
      data: null
    }
  }

  async getDeckCards(
    deckId: number,
    userId: number,
    query: GetFlashcardCardListQuery,
    lang: string = DEFAULT_LANG
  ) {
    const deck = await this.flashcardRepository.findDeckById(deckId, userId)
    if (!deck) {
      throw new FlashcardDeckNotFoundException()
    }

    const { currentPage, pageSize } = query
    const { total, cards } = await this.flashcardRepository.findDeckCards(deckId, query)

    return {
      statusCode: 200,
      message: this.translate(FlashcardMessage.GET_DECK_SUCCESS, lang),
      data: {
        results: await Promise.all(cards.map((card) => this.mapCard(card, lang))),
        pagination: {
          current: currentPage,
          pageSize,
          totalItem: total,
          totalPage: Math.ceil(total / pageSize)
        }
      }
    }
  }

  private async ensureContentAvailability(
    deckId: number,
    contentType: string,
    contentId: number
  ): Promise<{
    vocabulary?: {
      id: number
      wordJp: string
      reading: string | null
      levelN: number | null
    }
    kanji?: {
      id: number
      character: string
      meaningKey: string
      jlptLevel: number | null
    }
    grammar?: { id: number; structure: string; level: string | null }
  }> {
    if (contentType === 'CUSTOM') {
      return {}
    }

    if (contentType === 'VOCABULARY') {
      const duplicates = await this.flashcardRepository.findExistingContentCards(
        deckId,
        contentType,
        [contentId]
      )
      if (duplicates.length > 0) {
        throw new FlashcardContentAlreadyExistsException()
      }

      const [record] = await this.flashcardRepository.findVocabularyByIds([contentId])
      if (!record) {
        throw new InvalidFlashcardImportException('Vocabulary', contentId)
      }

      return { vocabulary: record }
    }

    if (contentType === 'KANJI') {
      const duplicates = await this.flashcardRepository.findExistingContentCards(
        deckId,
        contentType,
        [contentId]
      )
      if (duplicates.length > 0) {
        throw new FlashcardContentAlreadyExistsException()
      }

      const [record] = await this.flashcardRepository.findKanjiByIds([contentId])
      if (!record) {
        throw new InvalidFlashcardImportException('Kanji', contentId)
      }

      return { kanji: record }
    }

    if (contentType === 'GRAMMAR') {
      const duplicates = await this.flashcardRepository.findExistingContentCards(
        deckId,
        contentType,
        [contentId]
      )
      if (duplicates.length > 0) {
        throw new FlashcardContentAlreadyExistsException()
      }

      const [record] = await this.flashcardRepository.findGrammarByIds([contentId])
      if (!record) {
        throw new InvalidFlashcardImportException('Grammar', contentId)
      }

      return { grammar: record }
    }

    throw new InvalidFlashcardImportException()
  }

  async createCard(
    deckId: number,
    userId: number,
    body: CreateFlashcardCardBody,
    lang: string = DEFAULT_LANG
  ) {
    try {
      const deck = await this.flashcardRepository.findDeckById(deckId, userId)
      if (!deck) {
        throw new FlashcardDeckNotFoundException()
      }

      // Nếu có id, validate và kiểm tra content availability
      if (body.id && body.id !== null && body.id !== undefined) {
        // Validate id là số nguyên hợp lệ
        if (body.contentType !== 'CUSTOM') {
          if (
            !Number.isInteger(body.id) ||
            body.id < 1 ||
            body.id > Number.MAX_SAFE_INTEGER
          ) {
            throw new InvalidFlashcardImportException(body.contentType, body.id)
          }
        }

        // Map id + contentType thành vocabularyId/kanjiId/grammarId
        let contentRef: {
          vocabulary?: {
            id: number
            wordJp: string
            reading: string | null
            levelN: number | null
          }
          kanji?: {
            id: number
            character: string
            meaningKey: string
            jlptLevel: number | null
          }
          grammar?: { id: number; structure: string; level: string | null }
        } = {}

        if (body.contentType !== 'CUSTOM') {
          contentRef = await this.ensureContentAvailability(
            deckId,
            body.contentType,
            body.id
          )
        }
      }

      // Tạo payload với vocabularyId/kanjiId/grammarId được map từ id (nếu có)
      const payload: any = {
        contentType: body.contentType,
        notes: body.notes,
        metadata: body.metadata ?? undefined
      }

      // Map id thành đúng field dựa vào contentType (chỉ khi có id)
      if (body.id && body.id !== null && body.id !== undefined) {
        if (body.contentType === 'VOCABULARY') {
          payload.vocabularyId = body.id
        } else if (body.contentType === 'KANJI') {
          payload.kanjiId = body.id
        } else if (body.contentType === 'GRAMMAR') {
          payload.grammarId = body.id
        }
      }
      // Nếu không có id, tạo card tùy chỉnh với metadata (vocabularyId/kanjiId/grammarId sẽ là null)

      const card = await this.flashcardRepository.createCard(deckId, payload)

      return {
        statusCode: 201,
        message: this.translate(FlashcardMessage.CREATE_CARD_SUCCESS, lang),
        data: await this.mapCard(card, lang)
      }
    } catch (error) {
      // Re-throw các exception đã được định nghĩa
      if (
        error instanceof FlashcardDeckNotFoundException ||
        error instanceof FlashcardContentAlreadyExistsException ||
        error instanceof InvalidFlashcardImportException
      ) {
        throw error
      }
      // Catch Prisma validation errors và convert thành InvalidFlashcardImportException
      if (error instanceof Prisma.PrismaClientValidationError) {
        const contentType = body.contentType
        const id = body.id ?? undefined
        throw new InvalidFlashcardImportException(contentType, id)
      }
      // Log và throw lại các lỗi khác
      this.logger.error(`Error creating flashcard card: ${error.message}`, error.stack)
      throw error
    }
  }

  async updateCard(
    deckId: number,
    cardId: number,
    userId: number,
    body: UpdateFlashcardCardBody,
    lang: string = DEFAULT_LANG
  ) {
    // Kiểm tra deck tồn tại và thuộc về user trước
    const deck = await this.flashcardRepository.findDeckById(deckId, userId)
    if (!deck) {
      throw new FlashcardDeckNotFoundException()
    }

    // Kiểm tra card tồn tại và thuộc về deck (bao gồm cả cards đã bị soft delete)
    const card = await this.flashcardRepository.findCardByIdForUpdate(
      cardId,
      deckId,
      userId
    )
    if (!card) {
      throw new FlashcardCardNotFoundException()
    }

    // Nếu contentType thay đổi, set null TẤT CẢ các id không phải của type mới
    if (body.contentType !== undefined && body.contentType !== card.contentType) {
      const newContentType = body.contentType

      // Set null TẤT CẢ các id không phải của type mới (kể cả các id hiện tại là null)
      if (newContentType !== 'VOCABULARY') {
        ;(body as any).vocabularyId = null
      }
      if (newContentType !== 'KANJI') {
        ;(body as any).kanjiId = null
      }
      if (newContentType !== 'GRAMMAR') {
        ;(body as any).grammarId = null
      }
    }

    // Nếu có metadata trong body (được update), set tất cả các id thành null
    const bodyAny = body as any
    if (bodyAny.metadata !== undefined) {
      bodyAny.vocabularyId = null
      bodyAny.kanjiId = null
      bodyAny.grammarId = null
    }

    const updated = await this.flashcardRepository.updateCard(cardId, body)

    return {
      statusCode: 200,
      message: this.translate(FlashcardMessage.UPDATE_CARD_SUCCESS, lang),
      data: await this.mapCard(updated, lang)
    }
  }

  async deleteCard(
    deckId: number,
    cardId: number,
    userId: number,
    lang: string = DEFAULT_LANG
  ) {
    const card = await this.flashcardRepository.findCardById(cardId, deckId, userId)
    if (!card) {
      throw new FlashcardCardNotFoundException()
    }

    await this.flashcardRepository.softDeleteCard(cardId)

    return {
      statusCode: 200,
      message: this.translate(FlashcardMessage.DELETE_CARD_SUCCESS, lang),
      data: null
    }
  }

  async markRead(
    deckId: number,
    cardId: number,
    read: boolean,
    userId: number,
    lang: string = DEFAULT_LANG
  ) {
    // Kiểm tra deck tồn tại và thuộc về user trước
    const deck = await this.flashcardRepository.findDeckById(deckId, userId)
    if (!deck) {
      throw new FlashcardDeckNotFoundException()
    }

    // Kiểm tra card tồn tại và thuộc về deck
    const card = await this.flashcardRepository.findCardByIdForUpdate(
      cardId,
      deckId,
      userId
    )
    if (!card) {
      throw new FlashcardCardNotFoundException()
    }

    // Cập nhật read
    const updated = await this.flashcardRepository.updateCardRead(cardId, read)

    return {
      statusCode: 200,
      message: this.translate(FlashcardMessage.UPDATE_CARD_SUCCESS, lang),
      data: await this.mapCard(updated, lang)
    }
  }

  async deleteCards(
    deckId: number,
    cardIds: number[],
    userId: number,
    lang: string = DEFAULT_LANG
  ) {
    // Kiểm tra deck tồn tại và thuộc về user
    const deck = await this.flashcardRepository.findDeckById(deckId, userId)
    if (!deck) {
      throw new FlashcardDeckNotFoundException()
    }

    // Kiểm tra các cards tồn tại và thuộc về deck (bao gồm cả cards đã bị soft delete)
    const cards = await this.flashcardRepository.findCardsByIdsForDelete(
      deckId,
      cardIds,
      userId
    )
    if (cards.length === 0) {
      throw new FlashcardCardNotFoundException()
    }

    // Chỉ xóa các cards tồn tại (lấy id từ cards tìm được)
    const validCardIds = cards.map((card) => card.id)
    await this.flashcardRepository.deleteCards(deckId, validCardIds)

    return {
      statusCode: 200,
      message: this.translate(FlashcardMessage.DELETE_CARD_SUCCESS, lang),
      data: null
    }
  }

  async importCards(
    deckId: number,
    userId: number,
    body: ImportFlashcardCardsBody,
    lang: string = DEFAULT_LANG
  ) {
    const deck = await this.flashcardRepository.findDeckById(deckId, userId)
    if (!deck) {
      throw new FlashcardDeckNotFoundException()
    }

    const summary: FlashcardImportResult = {
      imported: 0,
      skipped: 0,
      missing: 0,
      duplicates: []
    }

    const createPayloads: Prisma.FlashcardCardUncheckedCreateInput[] = []

    const groupByType = body.items.reduce<Record<FlashcardContentType, number[]>>(
      (acc, item) => {
        const type = item.contentType as FlashcardContentType
        if (!acc[type]) {
          acc[type] = []
        }
        acc[type].push(item.contentId)
        return acc
      },
      {} as Record<FlashcardContentType, number[]>
    )

    for (const [type, ids] of Object.entries(groupByType) as [
      FlashcardContentType,
      number[]
    ][]) {
      const uniqueIds = Array.from(new Set(ids))
      if (uniqueIds.length === 0) {
        continue
      }

      const existingCards = await this.flashcardRepository.findExistingContentCards(
        deckId,
        type,
        uniqueIds
      )

      const existingIdSet = new Set<number>()
      existingCards.forEach((card) => {
        const contentId = card.vocabularyId ?? card.kanjiId ?? card.grammarId
        if (contentId) {
          existingIdSet.add(contentId)
          summary.duplicates.push({
            contentType: FlashcardImportContentTypeEnum.parse(type),
            contentId
          })
        }
      })

      summary.skipped += existingIdSet.size

      let records: Array<{ id: number }> = []
      if (type === 'VOCABULARY') {
        records = await this.flashcardRepository.findVocabularyByIds(uniqueIds)
      }
      if (type === 'KANJI') {
        records = await this.flashcardRepository.findKanjiByIds(uniqueIds)
      }
      if (type === 'GRAMMAR') {
        records = await this.flashcardRepository.findGrammarByIds(uniqueIds)
      }

      const availableMap = new Map<number, any>()
      records.forEach((record) => {
        availableMap.set(record.id, record)
      })

      const missingIds = uniqueIds.filter((id) => !availableMap.has(id))
      summary.missing += missingIds.length

      const creatableIds = uniqueIds.filter(
        (id) => availableMap.has(id) && !existingIdSet.has(id)
      )

      creatableIds.forEach((contentId) => {
        const baseData: Prisma.FlashcardCardUncheckedCreateInput = {
          deckId,
          contentType: type as PrismaFlashcardContentType,
          vocabularyId: type === 'VOCABULARY' ? contentId : null,
          kanjiId: type === 'KANJI' ? contentId : null,
          grammarId: type === 'GRAMMAR' ? contentId : null,
          notes: null
        }

        createPayloads.push(baseData)
      })
    }

    const createdCards = await this.flashcardRepository.createManyCards(createPayloads)
    summary.imported = createdCards.length

    return {
      statusCode: 200,
      message: this.translate(FlashcardMessage.IMPORT_CARD_SUCCESS, lang),
      data: {
        summary,
        results: await Promise.all(createdCards.map((card) => this.mapCard(card, lang)))
      }
    }
  }

  async getReviewCards(
    deckId: number,
    userId: number,
    query: FlashcardReviewQuery,
    lang: string = DEFAULT_LANG
  ) {
    const deck = await this.flashcardRepository.findDeckById(deckId, userId)
    if (!deck) {
      throw new FlashcardDeckNotFoundException()
    }

    const limit = query.limit ?? 20
    const targetTypes: Array<Exclude<FlashcardContentType, 'CUSTOM'>> = [
      'VOCABULARY',
      'KANJI',
      'GRAMMAR'
    ]
    const rawCards = await this.flashcardRepository.findCardsForReview(
      deckId,
      targetTypes,
      limit
    )

    type NonCustomType = Exclude<FlashcardContentType, 'CUSTOM'>
    const typeToIds: Record<NonCustomType, number[]> = {
      VOCABULARY: [],
      KANJI: [],
      GRAMMAR: []
    }

    for (const card of rawCards) {
      if (card.contentType === 'CUSTOM') continue
      const type = card.contentType as NonCustomType
      const contentId = this.resolveContentId(card)
      if (contentId) {
        typeToIds[type].push(contentId)
      }
    }

    const srsMap = new Map<string, any>()
    for (const type of targetTypes) {
      const ids = Array.from(new Set(typeToIds[type]))
      if (!ids.length) continue
      const entries = await this.flashcardRepository.findSrsEntries(userId, type, ids)
      entries.forEach((entry) => {
        const key = `${type}:${entry.contentId}`
        srsMap.set(key, entry)
      })
    }

    const now = new Date()
    const dueCards: FlashcardReviewItem[] = []

    for (const card of rawCards) {
      if (dueCards.length >= limit) break

      if (card.contentType === 'CUSTOM') {
        dueCards.push({
          ...(await this.mapCard(card, lang)),
          srs: null
        })
        continue
      }

      const contentId = this.resolveContentId(card)
      if (!contentId) continue

      const key = `${card.contentType}:${contentId}`
      const srsEntry = srsMap.get(key)
      const isDue = !srsEntry || srsEntry.nextReviewDate <= now
      if (!isDue) continue

      dueCards.push({
        ...(await this.mapCard(card, lang)),
        srs: this.mapSrsEntry(srsEntry)
      })
    }

    return {
      statusCode: 200,
      message: this.translate(FlashcardMessage.GET_REVIEW_LIST_SUCCESS, lang),
      data: {
        results: dueCards,
        pagination: {
          current: 1,
          pageSize: dueCards.length,
          totalPage: 1,
          totalItem: dueCards.length
        }
      }
    }
  }

  async reviewCard(
    deckId: number,
    cardId: number,
    userId: number,
    body: FlashcardReviewActionBody,
    lang: string = DEFAULT_LANG
  ) {
    const card = await this.flashcardRepository.findCardById(cardId, deckId, userId)
    if (!card) {
      throw new FlashcardCardNotFoundException()
    }

    const contentId = this.resolveContentId(card)

    if (card.contentType !== 'CUSTOM' && contentId) {
      await this.srsReviewService.applyReview(userId, card.contentType, contentId, {
        result: body.result,
        message: body.message
      })
    }

    const updatedEntry =
      card.contentType !== 'CUSTOM' && contentId
        ? (
            await this.flashcardRepository.findSrsEntries(
              userId,
              card.contentType as Exclude<FlashcardContentType, 'CUSTOM'>,
              [contentId]
            )
          )[0]
        : null

    return {
      statusCode: 200,
      message: this.translate(FlashcardMessage.REVIEW_CARD_SUCCESS, lang),
      data: {
        card: await this.mapCard(card, lang),
        srs: this.mapSrsEntry(updatedEntry)
      }
    }
  }

  async exportDeck(deckId: number, userId: number, lang: string = DEFAULT_LANG) {
    const deckWithCards = await this.flashcardRepository.findDeckWithRelations(
      deckId,
      userId
    )
    if (!deckWithCards) {
      throw new FlashcardDeckNotFoundException()
    }

    const cards = await Promise.all(
      deckWithCards.cards?.map((card) => this.mapCard(card, lang)) || []
    )
    const audioAssets = new Set<string>()
    const imageAssets = new Set<string>()

    for (const card of cards) {
      if (card.vocabulary?.audioUrl) audioAssets.add(card.vocabulary.audioUrl)
      if (card.kanji?.img) imageAssets.add(card.kanji.img)
    }

    return {
      statusCode: 200,
      message: this.translate(FlashcardMessage.EXPORT_DECK_SUCCESS, lang),
      data: {
        deck: this.mapDeck(deckWithCards, cards.length),
        cards,
        assets: {
          audio: Array.from(audioAssets).filter(Boolean),
          images: Array.from(imageAssets).filter(Boolean)
        },
        generatedAt: new Date()
      }
    }
  }
}
