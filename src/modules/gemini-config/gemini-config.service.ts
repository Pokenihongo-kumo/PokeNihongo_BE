import { GEMINI_PRESETS, getPresetByKey } from '@/modules/gemini/config/gemini-presets'
import { I18nService } from '@/i18n/i18n.service'
import { LanguagesService } from '@/modules/languages/languages.service'
import { PaginationQuery } from '@/shared/models/request.model'
import { HttpStatus, Injectable } from '@nestjs/common'
import { GeminiConfigType as PrismaGeminiConfigType } from '@prisma/client'
import { NotFoundRecordException } from '@/shared/error'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'
import { GeminiConfigAlreadyExistsException } from './dto/gemini-config.error'
import {
  CreateGeminiConfigBody,
  UpdateGeminiConfigBody
} from './dto/gemini-config.zod-dto'
import { GeminiConfigRepo, GeminiPresetRepo } from './gemini-config.repo'

@Injectable()
export class GeminiConfigService {
  constructor(
    private geminiConfigRepo: GeminiConfigRepo,
    private readonly geminiPresetRepo: GeminiPresetRepo,
    private readonly i18nService: I18nService,
    private readonly languagesService: LanguagesService
  ) {}

  async list(pagination: PaginationQuery, lang: string = 'vi') {
    await this.getLang(lang)
    const data = await this.geminiConfigRepo.list(pagination)
    return data
  }

  async findById(id: number, lang: string = 'vi') {
    await this.getLang(lang)
    const geminiConfig = await this.geminiConfigRepo.findById(id)
    if (!geminiConfig) {
      throw new NotFoundRecordException()
    }
    return geminiConfig
  }

  // removed legacy findByConfigType; use service-config mapping APIs instead

  async create(
    {
      data,
      createdById
    }: {
      data: CreateGeminiConfigBody
      createdById: number
    },
    lang: string = 'vi'
  ) {
    try {
      await this.getLang(lang)
      if (
        data.geminiConfigModelId &&
        !(await this.geminiConfigRepo.existsConfigModel(data.geminiConfigModelId))
      ) {
        throw new NotFoundRecordException()
      }
      const geminiConfig = await this.geminiConfigRepo.create({
        createdById,
        data
      })
      return geminiConfig
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new GeminiConfigAlreadyExistsException()
      }
      throw error
    }
  }

  async update(
    {
      id,
      data,
      updatedById
    }: {
      id: number
      data: UpdateGeminiConfigBody
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    try {
      await this.getLang(lang)
      if (
        data.geminiConfigModelId &&
        !(await this.geminiConfigRepo.existsConfigModel(data.geminiConfigModelId))
      ) {
        throw new NotFoundRecordException()
      }
      const updatedGeminiConfig = await this.geminiConfigRepo.update({
        id,
        updatedById,
        data
      })
      return updatedGeminiConfig
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new GeminiConfigAlreadyExistsException()
      }
      throw error
    }
  }

  async delete(
    { id, deletedById }: { id: number; deletedById: number },
    lang: string = 'vi'
  ) {
    try {
      await this.getLang(lang)
      await this.geminiConfigRepo.delete({
        id,
        deletedById
      })
      return null
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async getLang(lang: string) {
    const langId = await this.languagesService.getIdByCode(lang)
    if (!langId) {
      throw new NotFoundRecordException()
    }
    return langId
  }

  // removed legacy seedDefaultConfigs; configs are created explicitly with geminiConfigModelId

  async listModels(lang: string = 'vi') {
    await this.getLang(lang)
    const data = await this.geminiConfigRepo.listModels()
    return data
  }

  async seedDefaultModels(lang: string = 'vi') {
    await this.getLang(lang)
    const data = await this.geminiConfigRepo.seedDefaultModels()
    return data
  }

  async listDistinctModelNames(fromActiveOnly: boolean = true, lang: string = 'vi') {
    await this.getLang(lang)
    const data =
      await this.geminiConfigRepo.listDistinctModelNamesFromConfigs(fromActiveOnly)
    return {
      statusCode: HttpStatus.OK,
      data,
      message: this.i18nService.translate('GET_SUCCESS', lang)
    }
  }

  async listAllModelNames(lang: string = 'vi') {
    await this.getLang(lang)
    const models = await this.geminiConfigRepo.listModels()
    const names = (models || [])
      .map((m: any) => m.key)
      .filter(Boolean)
      .sort((a: string, b: string) => a.localeCompare(b))
    return {
      statusCode: HttpStatus.OK,
      data: names,
      message: this.i18nService.translate('GET_SUCCESS', lang)
    }
  }

  // GeminiConfigModel CRUD
  async listConfigModels(pagination: PaginationQuery, lang: string = 'vi') {
    await this.getLang(lang)
    const data = await this.geminiConfigRepo.listConfigModels(pagination)
    return data
  }

  async findConfigModelById(id: number, lang: string = 'vi') {
    await this.getLang(lang)
    const item = await this.geminiConfigRepo.findConfigModelById(id)
    if (!item) throw new NotFoundRecordException()
    return item
  }

  async createConfigModel(
    { data, createdById }: { data: any; createdById: number },
    lang: string = 'vi'
  ) {
    try {
      await this.getLang(lang)
      const created = await this.geminiConfigRepo.createConfigModel({ data, createdById })
      return created
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new GeminiConfigAlreadyExistsException()
      }
      throw error
    }
  }

  async updateConfigModel(
    { id, data, updatedById }: { id: number; data: any; updatedById: number },
    lang: string = 'vi'
  ) {
    try {
      await this.getLang(lang)
      const updated = await this.geminiConfigRepo.updateConfigModel({
        id,
        data,
        updatedById
      })
      return updated
    } catch (error) {
      if (isNotFoundPrismaError(error)) throw new NotFoundRecordException()
      if (isUniqueConstraintPrismaError(error))
        throw new GeminiConfigAlreadyExistsException()
      throw error
    }
  }

  async updateConfigModelPolicy(
    { id, policy, updatedById }: { id: number; policy: any; updatedById: number },
    lang: string = 'vi'
  ) {
    try {
      await this.getLang(lang)
      // Fetch existing for merge
      const current = await this.geminiConfigRepo.findConfigModelById(id)
      if (!current) throw new NotFoundRecordException()
      const currentExtra = (current as any)?.extraParams
      const baseExtra =
        currentExtra && typeof currentExtra === 'object' && !Array.isArray(currentExtra)
          ? currentExtra
          : {}
      const nextExtra = { ...(baseExtra as Record<string, any>), policy }
      const updated = await this.geminiConfigRepo.updateConfigModel({
        id,
        data: { extraParams: nextExtra },
        updatedById
      })
      return updated
    } catch (error) {
      if (isNotFoundPrismaError(error)) throw new NotFoundRecordException()
      throw error
    }
  }

  async deleteConfigModel(
    { id, deletedById }: { id: number; deletedById: number },
    lang: string = 'vi'
  ) {
    try {
      await this.getLang(lang)
      await this.geminiConfigRepo.deleteConfigModel({ id, deletedById })
      return null
    } catch (error) {
      if (isNotFoundPrismaError(error)) throw new NotFoundRecordException()
      throw error
    }
  }

  // GeminiServiceConfig mapping APIs
  async createServiceConfig(data: {
    serviceType: PrismaGeminiConfigType
    geminiConfigId: number
    isDefault?: boolean
    isActive?: boolean
  }) {
    try {
      return await this.geminiConfigRepo.createServiceConfig(data)
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        // Friendly message when mapping already exists
        throw new (require('@nestjs/common').BadRequestException)(
          'Mapping serviceType + geminiConfigId đã tồn tại'
        )
      }
      throw error
    }
  }

  async listServiceConfigs(serviceType?: PrismaGeminiConfigType) {
    return this.geminiConfigRepo.listServiceConfigs(serviceType as any)
  }

  async setDefaultServiceConfig(id: number) {
    return this.geminiConfigRepo.setDefaultServiceConfig(id)
  }

  async updateServiceConfig(id: number, geminiConfigId: number) {
    try {
      const updated = await this.geminiConfigRepo.updateServiceConfig(id, geminiConfigId)
      return updated
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new (require('@nestjs/common').BadRequestException)(
          'Mapping serviceType + geminiConfigId đã tồn tại'
        )
      }
      throw error
    }
  }

  async toggleServiceConfig(id: number, isActive: boolean) {
    return this.geminiConfigRepo.toggleServiceConfig(id, isActive)
  }

  async deleteServiceConfig(id: number) {
    return this.geminiConfigRepo.deleteServiceConfig(id)
  }

  async getDefaultConfigForService(serviceType: PrismaGeminiConfigType) {
    return this.geminiConfigRepo.getDefaultConfigForService(serviceType as any)
  }

  // Apply a preset to a GeminiConfigModel (by id)
  async applyPresetToConfigModel(
    {
      id,
      presetKey,
      updatedById
    }: { id: number; presetKey: string; updatedById: number },
    lang: string = 'vi'
  ) {
    await this.getLang(lang)
    const preset = getPresetByKey(presetKey)
    if (!preset) {
      throw new NotFoundRecordException()
    }
    // Upsert preset to DB then link by id
    const upserted = await this.geminiPresetRepo.upsertByKey({
      key: preset.key,
      name: preset.name,
      description: preset.description,
      temperature: preset.config.temperature ?? null,
      topP: preset.config.topP ?? null,
      topK: preset.config.topK ?? null,
      isEnabled: true
    })
    const updated = await this.geminiConfigRepo.updateConfigModel({
      id,
      data: { presetId: upserted.id },
      updatedById
    })
    return { updated, preset: upserted }
  }

  async listPresets(lang: string = 'vi') {
    await this.getLang(lang)
    const data = await this.geminiPresetRepo.listPresets()
    return data
  }

  async seedDefaultPresets(lang: string = 'vi') {
    await this.getLang(lang)
    for (const p of GEMINI_PRESETS) {
      await this.geminiPresetRepo.upsertByKey({
        key: p.key,
        name: p.name,
        description: p.description,
        temperature: p.config.temperature ?? null,
        topP: p.config.topP ?? null,
        topK: p.config.topK ?? null,
        isEnabled: true
      })
    }
    const data = await this.geminiPresetRepo.listPresets()
    return data
  }
}
