import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { GeminiConfigType as PrismaGeminiConfigType } from '@prisma/client'
import { parseQs } from '@/common/utils/qs-parser'
import { PrismaService } from 'src/shared/services/prisma.service'
import { GEMINI_CONFIG_FIELDS } from './entities/gemini-config.entity'
import { GEMINI_DEFAULT_CONFIGS } from '@/3rdService/gemini/config/gemini-default-configs'
import { GeminiConfigType as PrismaGeminiConfigTypeEnum } from '@prisma/client'
import { DEFAULT_GEMINI_MODELS } from '@/3rdService/gemini/config/gemini-default-configs'
import { parseQs as parseQsGeneric } from '@/common/utils/qs-parser'

@Injectable()
export class GeminiConfigRepo {
  constructor(private prismaService: PrismaService) {}

  create({ createdById, data }: { createdById: number | null; data: any }): Promise<any> {
    return this.prismaService.geminiConfig.create({
      data: {
        ...data,
        createdById
      }
    })
  }

  update({
    id,
    updatedById,
    data
  }: {
    id: number
    updatedById: number
    data: any
  }): Promise<any> {
    return this.prismaService.geminiConfig.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        ...data,
        updatedById
      }
    })
  }

  delete(
    {
      id,
      deletedById
    }: {
      id: number
      deletedById: number
    },
    isHard?: boolean
  ): Promise<any> {
    return isHard
      ? this.prismaService.geminiConfig.delete({
          where: {
            id
          }
        })
      : this.prismaService.geminiConfig.update({
          where: {
            id,
            deletedAt: null
          },
          data: {
            deletedAt: new Date(),
            deletedById
          }
        })
  }

  async list(pagination: PaginationQueryType) {
    const { where, orderBy } = parseQs(pagination.qs, GEMINI_CONFIG_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const [totalItems, data] = await Promise.all([
      this.prismaService.geminiConfig.count({
        where: { deletedAt: null, ...where }
      }),
      this.prismaService.geminiConfig.findMany({
        where: { deletedAt: null, ...where },
        orderBy,
        skip,
        take
      })
    ])

    return {
      results: data,
      pagination: {
        current: pagination.currentPage,
        pageSize: pagination.pageSize,
        totalPage: Math.ceil(totalItems / pagination.pageSize),
        totalItem: totalItems
      }
    }
  }

  findById(id: number): Promise<any | null> {
    return this.prismaService.geminiConfig.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  // Removed legacy findByConfigType/seedDefaultConfigs after schema refactor

  async listModels() {
    return this.prismaService.geminiModel.findMany({ orderBy: { key: 'asc' } })
  }

  async seedDefaultModels() {
    await (this.prismaService as any).geminiModel.createMany({
      data: DEFAULT_GEMINI_MODELS.map((key: string) => ({ key, displayName: key })),
      skipDuplicates: true
    })
    const all = await this.prismaService.geminiModel.findMany({ orderBy: { key: 'asc' } })
    return { total: all.length, models: all }
  }

  async listDistinctModelNamesFromConfigs(
    isActiveOnly: boolean = true
  ): Promise<string[]> {
    const rows = await this.prismaService.geminiConfig.findMany({
      where: {
        deletedAt: null,
        ...(isActiveOnly ? { isActive: true } : {})
      },
      select: {
        geminiConfigModel: { select: { geminiModel: { select: { key: true } } } }
      }
    })
    const distinct = Array.from(
      new Set(
        (rows || [])
          .map((r: any) => r.geminiConfigModel?.geminiModel?.key)
          .filter(Boolean)
      )
    ) as string[]
    distinct.sort((a, b) => a.localeCompare(b))
    return distinct
  }

  // Service ↔ Config mapping CRUD
  async createServiceConfig(data: {
    serviceType: PrismaGeminiConfigType
    geminiConfigId: number
    isDefault?: boolean
    isActive?: boolean
  }) {
    return this.prismaService.geminiServiceConfig.create({
      data: {
        serviceType: data.serviceType as any,
        geminiConfigId: data.geminiConfigId,
        isDefault: data.isDefault ?? false,
        isActive: data.isActive ?? true
      }
    })
  }

  async listServiceConfigs(serviceType?: PrismaGeminiConfigTypeEnum) {
    return this.prismaService.geminiServiceConfig.findMany({
      where: serviceType ? { serviceType: serviceType as any } : undefined,
      include: {
        geminiConfig: {
          include: { geminiConfigModel: { include: { geminiModel: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  async setDefaultServiceConfig(id: number) {
    const current = await this.prismaService.geminiServiceConfig.findUnique({
      where: { id }
    })
    if (!current) return null
    await this.prismaService.geminiServiceConfig.updateMany({
      where: { serviceType: current.serviceType },
      data: { isDefault: false }
    })
    return this.prismaService.geminiServiceConfig.update({
      where: { id },
      data: { isDefault: true, isActive: true }
    })
  }

  async updateServiceConfig(id: number, geminiConfigId: number) {
    return this.prismaService.geminiServiceConfig.update({
      where: { id },
      data: { geminiConfigId },
      include: {
        geminiConfig: {
          include: { geminiConfigModel: { include: { geminiModel: true } } }
        }
      }
    })
  }

  async toggleServiceConfig(id: number, isActive: boolean) {
    return this.prismaService.geminiServiceConfig.update({
      where: { id },
      data: { isActive }
    })
  }

  async deleteServiceConfig(id: number) {
    return this.prismaService.geminiServiceConfig.delete({ where: { id } })
  }

  async getDefaultConfigForService(serviceType: PrismaGeminiConfigTypeEnum) {
    // default first; fallback to first active
    const def = await this.prismaService.geminiServiceConfig.findFirst({
      where: { serviceType: serviceType as any, isDefault: true, isActive: true },
      include: {
        geminiConfig: {
          include: { geminiConfigModel: { include: { geminiModel: true } } }
        }
      }
    })
    if (def) return def
    return this.prismaService.geminiServiceConfig.findFirst({
      where: { serviceType: serviceType as any, isActive: true },
      include: {
        geminiConfig: {
          include: { geminiConfigModel: { include: { geminiModel: true } } }
        }
      },
      orderBy: { createdAt: 'asc' }
    })
  }

  // ConfigModel CRUD
  private static readonly GEMINI_CONFIG_MODEL_FIELDS = [
    'name',
    'geminiModelId',
    'presetId',
    'isEnabled',
    'createdAt',
    'updatedAt'
  ]

  async listConfigModels(pagination: PaginationQueryType) {
    const { where, orderBy } = parseQsGeneric(
      pagination.qs,
      GeminiConfigRepo.GEMINI_CONFIG_MODEL_FIELDS
    )
    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const [totalItems, data] = await Promise.all([
      this.prismaService.geminiConfigModel.count({
        where: { deletedAt: null, ...where }
      }),
      this.prismaService.geminiConfigModel.findMany({
        where: { deletedAt: null, ...where },
        include: { geminiModel: true, preset: true },
        orderBy,
        skip,
        take
      })
    ])

    return {
      results: data,
      pagination: {
        current: pagination.currentPage,
        pageSize: pagination.pageSize,
        totalPage: Math.ceil(totalItems / pagination.pageSize),
        totalItem: totalItems
      }
    }
  }

  findConfigModelById(id: number) {
    return this.prismaService.geminiConfigModel.findUnique({
      where: { id, deletedAt: null },
      include: { geminiModel: true, preset: true }
    })
  }

  createConfigModel({ createdById, data }: { createdById: number | null; data: any }) {
    return this.prismaService.geminiConfigModel.create({ data: { ...data, createdById } })
  }

  updateConfigModel({
    id,
    updatedById,
    data
  }: {
    id: number
    updatedById: number
    data: any
  }) {
    return this.prismaService.geminiConfigModel.update({
      where: { id, deletedAt: null },
      data: { ...data, updatedById }
    })
  }

  deleteConfigModel(
    { id, deletedById }: { id: number; deletedById: number },
    isHard?: boolean
  ) {
    return isHard
      ? this.prismaService.geminiConfigModel.delete({ where: { id } })
      : this.prismaService.geminiConfigModel.update({
          where: { id, deletedAt: null },
          data: { deletedAt: new Date(), deletedById }
        })
  }

  // Helpers
  async existsConfigModel(id: number): Promise<boolean> {
    const found = await this.prismaService.geminiConfigModel.findFirst({
      where: { id, deletedAt: null }
    })
    return !!found
  }
}

@Injectable()
export class GeminiPresetRepo {
  constructor(private prismaService: PrismaService) {}

  listPresets() {
    return (this.prismaService as any).geminiModelPreset.findMany({
      orderBy: { key: 'asc' }
    })
  }

  async upsertByKey(data: {
    key: string
    name: string
    description?: string
    temperature?: number | null
    topP?: number | null
    topK?: number | null
    isEnabled?: boolean
  }) {
    return (this.prismaService as any).geminiModelPreset.upsert({
      where: { key: data.key },
      update: { ...data },
      create: { ...data }
    })
  }

  findByKey(key: string) {
    return (this.prismaService as any).geminiModelPreset.findUnique({ where: { key } })
  }
}
