import { PrismaService } from '@/shared/services/prisma.service'
import { toSkipTake } from '@/shared/utils/pagination'
import { Injectable } from '@nestjs/common'
import { Meaning, Prisma } from '@prisma/client'
import {
  CreateMeaningServiceType,
  GetMeaningListQueryType,
  MeaningType,
  UpdateMeaningBodyType
} from './entities/meaning.entity'

@Injectable()
export class MeaningRepo {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(
    params: GetMeaningListQueryType
  ): Promise<{ data: MeaningType[]; total: number }> {
    const { page, limit, search, vocabularyId, wordTypeId } = params
    const where: Prisma.MeaningWhereInput = {
      ...(search && {
        OR: [
          { meaningKey: { contains: search, mode: 'insensitive' } },
          { exampleSentenceKey: { contains: search, mode: 'insensitive' } },
          { explanationKey: { contains: search, mode: 'insensitive' } },
          { exampleSentenceJp: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(vocabularyId && { vocabularyId }),
      ...(wordTypeId && { wordTypeId })
    }

    const [data, total] = await Promise.all([
      this.prismaService.meaning.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...toSkipTake(page, limit)
      }),
      this.prismaService.meaning.count({ where })
    ])

    return { data: data.map((item) => this.toMeaning(item)), total }
  }

  async findById(id: number): Promise<MeaningType | null> {
    const meaning = await this.prismaService.meaning.findUnique({ where: { id } })
    return meaning && this.toMeaning(meaning)
  }

  async findByVocabularyId(vocabularyId: number): Promise<MeaningType[]> {
    const meanings = await this.prismaService.meaning.findMany({
      where: { vocabularyId },
      orderBy: { createdAt: 'asc' }
    })
    return meanings.map((item) => this.toMeaning(item))
  }

  async create(data: CreateMeaningServiceType): Promise<MeaningType> {
    const meaning = await this.prismaService.meaning.create({
      data: {
        vocabularyId: data.vocabularyId,
        wordTypeId: data.wordTypeId,
        meaningKey: data.meaningKey || '',
        exampleSentenceKey: data.exampleSentenceKey || '',
        explanationKey: data.explanationKey || '',
        exampleSentenceJp: data.exampleSentenceJp
      }
    })
    return this.toMeaning(meaning)
  }

  async update(id: number, data: UpdateMeaningBodyType): Promise<MeaningType> {
    const meaning = await this.prismaService.meaning.update({ where: { id }, data })
    return this.toMeaning(meaning)
  }

  async delete(id: number): Promise<void> {
    await this.prismaService.meaning.delete({ where: { id } })
  }

  deleteByVocabularyId(vocabularyId: number): Promise<{ count: number }> {
    return this.prismaService.meaning.deleteMany({ where: { vocabularyId } })
  }

  // Empty keys and nulls come back as undefined (unchanged answer shape)
  private toMeaning(meaning: Meaning): MeaningType {
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
