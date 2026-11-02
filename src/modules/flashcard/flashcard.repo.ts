import {
  CreateFlashcardCardBody,
  CreateFlashcardDeckBody,
  FlashcardContentType,
  FlashcardDeckStatus,
  GetFlashcardCardListQuery,
  GetFlashcardDeckListQuery,
  UpdateFlashcardCardBody,
  UpdateFlashcardDeckBody
} from './entities/flashcard.entities'
import { Injectable } from '@nestjs/common'
import {
  Prisma,
  FlashcardContentType as PrismaFlashcardContentType,
  FlashcardDeckStatus as PrismaFlashcardDeckStatus,
  FlashcardCardStatus as PrismaFlashcardCardStatus,
  SrsContentType as PrismaSrsContentType
} from '@prisma/client'
import { PrismaService } from '@/shared/services/prisma.service'

const CARD_RELATION_INCLUDE = {
  vocabulary: {
    select: {
      id: true,
      wordJp: true,
      reading: true,
      levelN: true,
      audioUrl: true,
      imageUrl: true,
      meanings: {
        select: {
          id: true,
          meaningKey: true,
          exampleSentenceKey: true,
          explanationKey: true,
          exampleSentenceJp: true
        }
      }
    }
  },
  kanji: {
    select: {
      id: true,
      character: true,
      meaningKey: true,
      jlptLevel: true,
      img: true
    }
  },
  grammar: {
    select: {
      id: true,
      structure: true,
      level: true
    }
  }
} satisfies Prisma.FlashcardCardInclude

@Injectable()
export class FlashcardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createDeck(userId: number, data: CreateFlashcardDeckBody) {
    return this.prisma.flashcardDeck.create({
      data: {
        userId,
        name: data.name,
        metadata: data.metadata ?? undefined
      }
    })
  }

  async updateDeck(deckId: number, data: UpdateFlashcardDeckBody) {
    const updateData: Prisma.FlashcardDeckUpdateInput = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.metadata !== undefined) updateData.metadata = data.metadata ?? undefined

    return this.prisma.flashcardDeck.update({
      where: { id: deckId },
      data: updateData
    })
  }

  async updateDeckStatus(deckId: number, status: FlashcardDeckStatus) {
    return this.prisma.flashcardDeck.update({
      where: { id: deckId },
      data: {
        status: status as PrismaFlashcardDeckStatus
      }
    })
  }

  async findDeckById(deckId: number, userId: number) {
    if (!deckId || !Number.isInteger(deckId) || deckId < 1) {
      return null
    }
    return this.prisma.flashcardDeck.findFirst({
      where: {
        id: deckId,
        userId,
        deletedAt: null
      }
    })
  }

  async findDeckWithRelations(deckId: number, userId: number) {
    return this.prisma.flashcardDeck.findFirst({
      where: {
        id: deckId,
        userId,
        deletedAt: null
      },
      include: {
        cards: {
          where: {
            deletedAt: null
          },
          include: CARD_RELATION_INCLUDE
        }
      }
    })
  }

  async countDeckCards(deckId: number) {
    return this.prisma.flashcardCard.count({
      where: {
        deckId,
        deletedAt: null
      }
    })
  }

  async findDecks(userId: number, query: GetFlashcardDeckListQuery) {
    const { currentPage, pageSize, search, status } = query
    const skip = (currentPage - 1) * pageSize

    const where: Prisma.FlashcardDeckWhereInput = {
      userId,
      deletedAt: null
    }

    if (search) {
      where.OR = [{ name: { contains: search, mode: 'insensitive' } }]
    }

    if (status) {
      where.status = status as PrismaFlashcardDeckStatus
    }

    const [total, decks] = await this.prisma.$transaction([
      this.prisma.flashcardDeck.count({ where }),
      this.prisma.flashcardDeck.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc'
        }
      })
    ])

    let cardCountMap = new Map<number, number>()

    if (decks.length > 0) {
      const counts = await this.prisma.flashcardCard.groupBy({
        by: ['deckId'],
        where: {
          deckId: {
            in: decks.map((deck) => deck.id)
          },
          deletedAt: null
        },
        _count: {
          deckId: true
        }
      })

      cardCountMap = counts.reduce((acc, item) => {
        acc.set(item.deckId, item._count.deckId)
        return acc
      }, new Map<number, number>())
    }

    return {
      total,
      decks,
      cardCountMap
    }
  }

  async findDeckCards(deckId: number, query: GetFlashcardCardListQuery) {
    const { currentPage, pageSize, contentType, search } = query
    const skip = (currentPage - 1) * pageSize

    const where: Prisma.FlashcardCardWhereInput = {
      deckId,
      deletedAt: null
    }

    if (contentType) {
      where.contentType = contentType as PrismaFlashcardContentType
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { notes: { contains: search, mode: 'insensitive' } },
            {
              vocabulary: {
                is: {
                  OR: [
                    { wordJp: { contains: search, mode: 'insensitive' } },
                    { reading: { contains: search, mode: 'insensitive' } }
                  ]
                }
              }
            },
            {
              kanji: {
                is: {
                  OR: [
                    { character: { contains: search, mode: 'insensitive' } },
                    { meaningKey: { contains: search, mode: 'insensitive' } }
                  ]
                }
              }
            },
            {
              grammar: {
                is: {
                  OR: [
                    { structure: { contains: search, mode: 'insensitive' } },
                    { level: { contains: search, mode: 'insensitive' } }
                  ]
                }
              }
            }
          ]
        }
      ]
    }

    const [total, cards] = await this.prisma.$transaction([
      this.prisma.flashcardCard.count({ where }),
      this.prisma.flashcardCard.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc'
        },
        include: CARD_RELATION_INCLUDE
      })
    ])

    return {
      total,
      cards
    }
  }

  async findCardById(cardId: number, deckId: number, userId: number) {
    return this.prisma.flashcardCard.findFirst({
      where: {
        id: cardId,
        deckId,
        deletedAt: null,
        deck: {
          userId,
          deletedAt: null
        }
      },
      include: CARD_RELATION_INCLUDE
    })
  }

  async findCardByIdForUpdate(cardId: number, deckId: number, userId: number) {
    return this.prisma.flashcardCard.findFirst({
      where: {
        id: cardId,
        deckId,
        deck: {
          userId,
          deletedAt: null
        }
      },
      include: CARD_RELATION_INCLUDE
    })
  }

  async findExistingContentCards(
    deckId: number,
    contentType: FlashcardContentType,
    ids: number[]
  ) {
    if (!ids.length) {
      return []
    }

    const where: Prisma.FlashcardCardWhereInput = {
      deckId,
      deletedAt: null,
      contentType: contentType as PrismaFlashcardContentType
    }

    if (contentType === 'VOCABULARY') {
      where.vocabularyId = { in: ids }
    } else if (contentType === 'KANJI') {
      where.kanjiId = { in: ids }
    } else if (contentType === 'GRAMMAR') {
      where.grammarId = { in: ids }
    }

    return this.prisma.flashcardCard.findMany({
      where,
      select: {
        id: true,
        vocabularyId: true,
        kanjiId: true,
        grammarId: true
      }
    })
  }

  async createCard(
    deckId: number,
    body: {
      contentType: string
      vocabularyId?: number | null
      kanjiId?: number | null
      grammarId?: number | null
      notes?: string | null
      metadata?: any
    }
  ) {
    return this.prisma.flashcardCard.create({
      data: {
        deckId,
        contentType: body.contentType as PrismaFlashcardContentType,
        vocabularyId: body.vocabularyId ?? null,
        kanjiId: body.kanjiId ?? null,
        grammarId: body.grammarId ?? null,
        notes: body.notes ?? null,
        metadata: body.metadata ?? undefined
      } as Prisma.FlashcardCardUncheckedCreateInput,
      include: CARD_RELATION_INCLUDE
    })
  }

  async createManyCards(cards: Prisma.FlashcardCardUncheckedCreateInput[]) {
    if (cards.length === 0) {
      return []
    }

    return this.prisma.$transaction(
      cards.map((data) =>
        this.prisma.flashcardCard.create({
          data,
          include: CARD_RELATION_INCLUDE
        })
      )
    )
  }

  async updateCard(cardId: number, data: UpdateFlashcardCardBody) {
    const updateData: Prisma.FlashcardCardUncheckedUpdateInput = {}

    if (data.contentType !== undefined)
      updateData.contentType = data.contentType as PrismaFlashcardContentType
    if (data.status !== undefined)
      updateData.status = data.status as PrismaFlashcardCardStatus
    if (data.notes !== undefined) updateData.notes = data.notes ?? null
    if (data.read !== undefined) updateData.read = data.read
    if (data.metadata !== undefined) updateData.metadata = data.metadata ?? undefined

    // Nếu có vocabularyId, kanjiId, hoặc grammarId trong data (có thể là null để clear)
    const dataAny = data as any
    if ('vocabularyId' in dataAny) {
      updateData.vocabularyId = dataAny.vocabularyId
    }
    if ('kanjiId' in dataAny) {
      updateData.kanjiId = dataAny.kanjiId
    }
    if ('grammarId' in dataAny) {
      updateData.grammarId = dataAny.grammarId
    }

    return this.prisma.flashcardCard.update({
      where: { id: cardId },
      data: updateData,
      include: CARD_RELATION_INCLUDE
    })
  }

  async updateCardRead(cardId: number, read: boolean) {
    return this.prisma.flashcardCard.update({
      where: { id: cardId },
      data: { read },
      include: CARD_RELATION_INCLUDE
    })
  }

  async softDeleteDeck(deckId: number) {
    const deletedAt = new Date()

    return this.prisma.$transaction(async (tx) => {
      const deck = await tx.flashcardDeck.findUnique({
        where: { id: deckId, deletedAt: null }
      })

      if (!deck) {
        return null
      }

      await tx.flashcardDeck.update({
        where: { id: deckId },
        data: {
          deletedAt,
          status: 'ARCHIVED' as PrismaFlashcardDeckStatus
        }
      })

      await tx.flashcardCard.updateMany({
        where: {
          deckId,
          deletedAt: null
        },
        data: {
          deletedAt,
          status: 'ARCHIVED' as PrismaFlashcardCardStatus
        }
      })

      return deck
    })
  }

  async softDeleteCard(cardId: number) {
    return this.prisma.flashcardCard.update({
      where: { id: cardId },
      data: {
        deletedAt: new Date(),
        status: 'ARCHIVED' as PrismaFlashcardCardStatus
      },
      include: CARD_RELATION_INCLUDE
    })
  }

  async deleteCards(deckId: number, cardIds: number[]) {
    return this.prisma.flashcardCard.deleteMany({
      where: {
        id: { in: cardIds },
        deckId
      }
    })
  }

  async findCardsByIds(deckId: number, cardIds: number[], userId: number) {
    return this.prisma.flashcardCard.findMany({
      where: {
        id: { in: cardIds },
        deckId,
        deletedAt: null,
        deck: {
          userId,
          deletedAt: null
        }
      },
      include: CARD_RELATION_INCLUDE
    })
  }

  async findCardsByIdsForDelete(deckId: number, cardIds: number[], userId: number) {
    return this.prisma.flashcardCard.findMany({
      where: {
        id: { in: cardIds },
        deckId,
        deck: {
          userId,
          deletedAt: null
        }
      },
      include: CARD_RELATION_INCLUDE
    })
  }

  async findVocabularyByIds(ids: number[]) {
    if (!ids.length) return []
    return this.prisma.vocabulary.findMany({
      where: {
        id: {
          in: ids
        }
      },
      select: {
        id: true,
        wordJp: true,
        reading: true,
        levelN: true
      }
    })
  }

  async findKanjiByIds(ids: number[]) {
    if (!ids.length) return []
    return this.prisma.kanji.findMany({
      where: {
        id: {
          in: ids
        }
      },
      select: {
        id: true,
        character: true,
        meaningKey: true,
        jlptLevel: true
      }
    })
  }

  async findGrammarByIds(ids: number[]) {
    if (!ids.length) return []
    return this.prisma.grammar.findMany({
      where: {
        id: {
          in: ids
        }
      },
      select: {
        id: true,
        structure: true,
        level: true
      }
    })
  }

  async searchVocabulary(params: {
    skip: number
    take: number
    search?: string
    jlptLevel?: number
  }) {
    const { skip, take, search, jlptLevel } = params

    const where: Prisma.VocabularyWhereInput = {}

    if (search) {
      where.OR = [
        { wordJp: { contains: search, mode: 'insensitive' } },
        { reading: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (jlptLevel) {
      where.levelN = jlptLevel
    }

    const [total, results] = await this.prisma.$transaction([
      this.prisma.vocabulary.count({ where }),
      this.prisma.vocabulary.findMany({
        where,
        skip,
        take,
        orderBy: {
          wordJp: 'asc'
        },
        select: {
          id: true,
          wordJp: true,
          reading: true,
          levelN: true,
          audioUrl: true
        }
      })
    ])

    return { total, results }
  }

  async searchKanji(params: {
    skip: number
    take: number
    search?: string
    jlptLevel?: number
  }) {
    const { skip, take, search, jlptLevel } = params

    const where: Prisma.KanjiWhereInput = {}

    if (search) {
      where.OR = [
        { character: { contains: search, mode: 'insensitive' } },
        { meaningKey: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (jlptLevel) {
      where.jlptLevel = jlptLevel
    }

    const [total, results] = await this.prisma.$transaction([
      this.prisma.kanji.count({ where }),
      this.prisma.kanji.findMany({
        where,
        skip,
        take,
        orderBy: {
          character: 'asc'
        },
        select: {
          id: true,
          character: true,
          meaningKey: true,
          jlptLevel: true,
          img: true
        }
      })
    ])

    return { total, results }
  }

  async searchGrammar(params: {
    skip: number
    take: number
    search?: string
    level?: string
  }) {
    const { skip, take, search, level } = params

    const where: Prisma.GrammarWhereInput = {}

    if (search) {
      where.structure = { contains: search, mode: 'insensitive' }
    }

    if (level) {
      where.level = { contains: level, mode: 'insensitive' }
    }

    const [total, results] = await this.prisma.$transaction([
      this.prisma.grammar.count({ where }),
      this.prisma.grammar.findMany({
        where,
        skip,
        take,
        orderBy: {
          structure: 'asc'
        },
        select: {
          id: true,
          structure: true,
          level: true
        }
      })
    ])

    return { total, results }
  }

  async findCardsForReview(
    deckId: number,
    types: Array<Exclude<FlashcardContentType, 'CUSTOM'>>,
    limit: number
  ) {
    if (!types.length) return []

    const prismaTypes = types.map((type) => type as PrismaFlashcardContentType)
    const take = Math.max(limit * 3, limit)

    return this.prisma.flashcardCard.findMany({
      where: {
        deckId,
        deletedAt: null,
        contentType: {
          in: prismaTypes
        }
      },
      orderBy: {
        updatedAt: 'asc'
      },
      take,
      include: CARD_RELATION_INCLUDE
    })
  }

  async findSrsEntries(
    userId: number,
    type: Exclude<FlashcardContentType, 'CUSTOM'>,
    ids: number[]
  ): Promise<
    Array<{
      id: number
      contentId: number
      srsLevel: number
      nextReviewDate: Date
      incorrectStreak: number
      isLeech: boolean
      message: string | null
    }>
  > {
    if (!ids.length) return []

    return this.prisma.userSrsReview.findMany({
      where: {
        userId,
        contentType: type as PrismaSrsContentType,
        contentId: {
          in: ids
        }
      },
      select: {
        id: true,
        contentId: true,
        srsLevel: true,
        nextReviewDate: true,
        incorrectStreak: true,
        isLeech: true,
        message: true
      }
    })
  }
}
