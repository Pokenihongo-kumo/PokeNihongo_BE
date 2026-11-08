import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
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
  }) {
    const { currentPage, pageSize, search, code } = params
    const skip = (currentPage - 1) * pageSize

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (code) {
      where.code = { contains: code, mode: 'insensitive' }
    }

    const [data, total] = await Promise.all([
      this.prismaService.languages.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { code: 'asc' }
      }),
      this.prismaService.languages.count({ where })
    ])

    return {
      data: data.map((item) => this.transformLanguages(item)),
      total,
      page: currentPage,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  }

  async findById(id: number): Promise<LanguagesType | null> {
    const languages = await this.prismaService.languages.findUnique({
      where: { id }
    })

    if (!languages) {
      return null
    }

    return this.transformLanguages(languages)
  }

  async findByCode(code: string): Promise<LanguagesType | null> {
    const languages = await this.prismaService.languages.findUnique({
      where: { code }
    })

    if (!languages) {
      return null
    }

    return this.transformLanguages(languages)
  }

  async create(data: CreateLanguagesBodyType): Promise<LanguagesType> {
    const createData: any = {
      code: data.code,
      name: data.name
    }

    // Nếu có ID, thêm vào data
    if (data.id) {
      createData.id = data.id
    }

    // Nếu có flag, thêm vào data
    if (data.flag) {
      createData.flag = data.flag
    }

    const result = await this.prismaService.languages.create({
      data: createData
    })

    return this.transformLanguages(result)
  }

  async update(id: number, data: UpdateLanguagesBodyType): Promise<LanguagesType> {
    const result = await this.prismaService.languages.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name
      }
    })

    return this.transformLanguages(result)
  }

  async updateByCode(
    code: string,
    data: UpdateLanguagesBodyType
  ): Promise<LanguagesType> {
    const result = await this.prismaService.languages.update({
      where: { code },
      data: {
        code: data.code,
        name: data.name
      }
    })

    return this.transformLanguages(result)
  }

  async delete(id: number): Promise<void> {
    await this.prismaService.languages.delete({
      where: { id }
    })
  }

  async deleteByCode(code: string): Promise<void> {
    await this.prismaService.languages.delete({
      where: { code }
    })
  }

  async count(where?: any): Promise<number> {
    return this.prismaService.languages.count({ where })
  }

  private transformLanguages(languages: any): LanguagesType {
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
      where: {
        code: { in: codes }
      }
    })

    return count === codes.length
  }

  async getWithListCode(
    codes: string[]
  ): Promise<Pick<LanguagesType, 'id' | 'code'>[] | []> {
    if (!codes || codes.length === 0) return []

    const languages = await this.prismaService.languages.findMany({
      where: {
        code: { in: codes }
      },
      select: {
        id: true,
        code: true
      }
    })

    return languages
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

    const languages = await this.prismaService.languages.findMany({
      where: { id: { in: ids } },
      select: { id: true, code: true }
    })

    return languages
  }
}
