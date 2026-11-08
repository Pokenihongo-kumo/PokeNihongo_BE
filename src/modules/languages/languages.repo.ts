import { PrismaService } from '@/shared/services/prisma.service'
import { toSkipTake } from '@/shared/utils/pagination'
import { Injectable } from '@nestjs/common'
import { Languages, Prisma } from '@prisma/client'
import {
  CreateLanguagesBodyType,
  LanguagesType,
  UpdateLanguagesBodyType
} from './entities/languages.entity'

@Injectable()
export class LanguagesRepo {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(params: {
    currentPage: number
    pageSize: number
    search?: string
    code?: string
  }): Promise<{ data: LanguagesType[]; total: number }> {
    const { currentPage, pageSize, search, code } = params

    const where: Prisma.LanguagesWhereInput = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(code && { code: { contains: code, mode: 'insensitive' } })
    }

    const [data, total] = await Promise.all([
      this.prismaService.languages.findMany({
        where,
        ...toSkipTake(currentPage, pageSize),
        orderBy: { code: 'asc' }
      }),
      this.prismaService.languages.count({ where })
    ])

    return { data: data.map((item) => this.transformLanguages(item)), total }
  }

  async findById(id: number): Promise<LanguagesType | null> {
    const languages = await this.prismaService.languages.findUnique({ where: { id } })
    return languages ? this.transformLanguages(languages) : null
  }

  async findByCode(code: string): Promise<LanguagesType | null> {
    const languages = await this.prismaService.languages.findUnique({ where: { code } })
    return languages ? this.transformLanguages(languages) : null
  }

  async create(data: CreateLanguagesBodyType): Promise<LanguagesType> {
    // `flag` is accepted by the body but Languages has no such column; passing it
    // made Prisma reject every create that sent it (500)
    const createData: Prisma.LanguagesCreateInput = {
      code: data.code,
      name: data.name,
      ...(data.id && { id: data.id })
    }

    const result = await this.prismaService.languages.create({ data: createData })

    // An explicit id (default languages) does not move the id sequence
    if (data.id) {
      await this.syncIdSequence()
    }

    return this.transformLanguages(result)
  }

  async update(id: number, data: UpdateLanguagesBodyType): Promise<LanguagesType> {
    const result = await this.prismaService.languages.update({
      where: { id },
      data: { code: data.code, name: data.name }
    })
    return this.transformLanguages(result)
  }

  async updateByCode(
    code: string,
    data: UpdateLanguagesBodyType
  ): Promise<LanguagesType> {
    const result = await this.prismaService.languages.update({
      where: { code },
      data: { code: data.code, name: data.name }
    })
    return this.transformLanguages(result)
  }

  async delete(id: number): Promise<void> {
    await this.prismaService.languages.delete({ where: { id } })
  }

  async deleteByCode(code: string): Promise<void> {
    await this.prismaService.languages.delete({ where: { code } })
  }

  async count(where?: Prisma.LanguagesWhereInput): Promise<number> {
    return this.prismaService.languages.count({ where })
  }

  // Moves the id sequence past the highest id (rows inserted with explicit ids)
  async syncIdSequence(): Promise<void> {
    await this.prismaService.$executeRaw`
      SELECT setval(
        pg_get_serial_sequence('"Languages"', 'id'),
        GREATEST((SELECT MAX(id) FROM "Languages"), 1)
      )`
  }

  private transformLanguages(languages: Languages): LanguagesType {
    return {
      id: languages.id,
      code: languages.code,
      name: languages.name,
      createdAt: languages.createdAt,
      updatedAt: languages.updatedAt
    }
  }

  async checkExistWithListCode(codes: string[]): Promise<boolean> {
    if (!codes || codes.length === 0) return true

    const count = await this.prismaService.languages.count({
      where: { code: { in: codes } }
    })

    return count === codes.length
  }

  async getWithListCode(codes: string[]): Promise<Pick<LanguagesType, 'id' | 'code'>[]> {
    if (!codes || codes.length === 0) return []

    return this.prismaService.languages.findMany({
      where: { code: { in: codes } },
      select: { id: true, code: true }
    })
  }

  async getIdByCode(code: string): Promise<number | null> {
    const language = await this.prismaService.languages.findUnique({
      where: { code },
      select: { id: true }
    })

    return language?.id ?? null
  }

  async getWithListId(ids: number[]): Promise<Array<Pick<LanguagesType, 'id' | 'code'>>> {
    if (!ids || ids.length === 0) return []

    return this.prismaService.languages.findMany({
      where: { id: { in: ids } },
      select: { id: true, code: true }
    })
  }
}
