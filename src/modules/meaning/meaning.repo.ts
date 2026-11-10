import {
  MeaningType,
  CreateMeaningBodyType,
  UpdateMeaningBodyType,
  CreateMeaningServiceType
} from './entities/meaning.entity'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class MeaningRepo {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(params: {
    page: number
    limit: number
    search?: string
    vocabularyId?: number
    wordTypeId?: number
  }) {
    const { page, limit, search, vocabularyId, wordTypeId } = params
    const skip = (page - 1) * limit

    const where: any = {}

    if (search) {
      where.OR = [
        { meaningKey: { contains: search, mode: 'insensitive' } },
        { exampleSentenceKey: { contains: search, mode: 'insensitive' } },
        { explanationKey: { contains: search, mode: 'insensitive' } },
        { exampleSentenceJp: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (vocabularyId) {
      where.vocabularyId = vocabularyId
    }

    if (wordTypeId) {
      where.wordTypeId = wordTypeId
    }

    const [data, total] = await Promise.all([
      this.prismaService.meaning.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vocabulary: {
            select: {
              id: true,
              wordJp: true,
              reading: true
            }
          },
          wordType: {
            select: {
              id: true,
              nameKey: true
            }
          }
        }
      }),
      this.prismaService.meaning.count({ where })
    ])

    return {
      data: data.map((item) => this.transformMeaning(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  async findById(id: number): Promise<MeaningType | null> {
    const meaning = await this.prismaService.meaning.findUnique({
      where: { id },
      include: {
        vocabulary: {
          select: {
            id: true,
            wordJp: true,
            reading: true
          }
        },
        wordType: {
          select: {
            id: true,
            nameKey: true
          }
        }
      }
    })

    if (!meaning) {
      return null
    }

    return this.transformMeaning(meaning)
  }

  async findByVocabularyId(vocabularyId: number) {
    const meanings = await this.prismaService.meaning.findMany({
      where: { vocabularyId },
      orderBy: { createdAt: 'asc' },
      include: {
        wordType: {
          select: {
            id: true,
            nameKey: true
          }
        }
      }
    })

    return meanings.map((item) => this.transformMeaning(item))
  }

  async create(data: CreateMeaningServiceType): Promise<MeaningType> {
    const result = await this.prismaService.meaning.create({
      data: {
        vocabularyId: data.vocabularyId,
        wordTypeId: data.wordTypeId,
        meaningKey: data.meaningKey || '',
        exampleSentenceKey: data.exampleSentenceKey || '',
        explanationKey: data.explanationKey || '',
        exampleSentenceJp: data.exampleSentenceJp
      },
      include: {
        vocabulary: {
          select: {
            id: true,
            wordJp: true,
            reading: true
          }
        },
        wordType: {
          select: {
            id: true,
            nameKey: true
          }
        }
      }
    })

    return this.transformMeaning(result)
  }

  async update(id: number, data: UpdateMeaningBodyType): Promise<MeaningType> {
    const result = await this.prismaService.meaning.update({
      where: { id },
      data: {
        vocabularyId: data.vocabularyId,
        wordTypeId: data.wordTypeId,
        meaningKey: data.meaningKey,
        exampleSentenceKey: data.exampleSentenceKey,
        explanationKey: data.explanationKey,
        exampleSentenceJp: data.exampleSentenceJp
      },
      include: {
        vocabulary: {
          select: {
            id: true,
            wordJp: true,
            reading: true
          }
        },
        wordType: {
          select: {
            id: true,
            nameKey: true
          }
        }
      }
    })

    return this.transformMeaning(result)
  }

  async delete(id: number): Promise<void> {
    await this.prismaService.meaning.delete({
      where: { id }
    })
  }

  async deleteByVocabularyId(vocabularyId: number): Promise<{ count: number }> {
    return await this.prismaService.meaning.deleteMany({
      where: { vocabularyId }
    })
  }

  async count(where?: any): Promise<number> {
    return this.prismaService.meaning.count({ where })
  }

  private transformMeaning(meaning: any): MeaningType {
    return {
      id: meaning.id,
      vocabularyId: meaning.vocabularyId,
      wordTypeId: meaning.wordTypeId || undefined,
      meaningKey: meaning.meaningKey || undefined,
      exampleSentenceKey: meaning.exampleSentenceKey || undefined,
      explanationKey: meaning.explanationKey || undefined,
      exampleSentenceJp: meaning.exampleSentenceJp || undefined,
      createdAt: meaning.createdAt,
      updatedAt: meaning.updatedAt
    }
  }
}
