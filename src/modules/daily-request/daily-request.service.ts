import { I18nService } from '@/i18n/i18n.service'
import { DailyRequestMessage } from '@/i18n/message-keys'
import {
  LanguageNotExistToTranslateException,
  NotFoundRecordException
} from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { HttpStatus, Injectable } from '@nestjs/common'
import { LanguagesRepo } from '../languages/languages.repo'
import { CreateTranslationBodyType } from '../translation/entities/translation.entity'
import { TranslationRepo } from '../translation/translation.repo'
import { DailyRequestRepo } from './daily-request.repo'
import { DailyRequestAlreadyExistsException } from './dto/daily-request.error'
import {
  CreateDailyRequestBodyInputType,
  CreateDailyRequestBodyType,
  UpdateDailyRequestBodyInputType,
  UpdateDailyRequestBodyType
} from './entities/daily-request.entity'

@Injectable()
export class DailyRequestService {
  constructor(
    private dailyRequestRepo: DailyRequestRepo,
    private readonly i18nService: I18nService,
    private readonly languageRepo: LanguagesRepo,
    private readonly translationRepo: TranslationRepo
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)
    if (!langId) {
      throw new NotFoundRecordException()
    }
    const data = await this.dailyRequestRepo.list(pagination, langId)
    return {
      status: HttpStatus.OK,
      data,
      message: this.i18nService.translate(DailyRequestMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async getListwithAllLang(pagination: PaginationQueryType, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)
    const data = await this.dailyRequestRepo.getListwithAllLang(
      pagination,
      langId ?? undefined
    )
    // Build language code map for all referenced languageIds
    const allLangIds = new Set<number>()
    for (const item of data.results as any[]) {
      for (const t of item.nameTranslations ?? []) allLangIds.add(t.languageId)
      for (const t of item.descriptionTranslations ?? []) allLangIds.add(t.languageId)
    }
    const languages = await this.languageRepo.getWithListId(Array.from(allLangIds))
    const codeMap = Object.fromEntries(languages.map((l) => [l.id, l.code]))

    const results = (data.results as any[]).map((item) => ({
      ...item,
      nameTranslations: (item.nameTranslations ?? []).map((t: any) => ({
        key: codeMap[t.languageId] ?? String(t.languageId),
        value: t.value
      })),
      descriptionTranslations: (item.descriptionTranslations ?? []).map((t: any) => ({
        key: codeMap[t.languageId] ?? String(t.languageId),
        value: t.value
      }))
    }))

    return {
      status: HttpStatus.OK,
      data: { ...data, results },
      message: this.i18nService.translate(DailyRequestMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)
    if (!langId) {
      throw new NotFoundRecordException()
    }
    const dailyRequest = await this.dailyRequestRepo.findByIdwithLangId(id, langId)
    if (!dailyRequest) {
      throw new NotFoundRecordException()
    }
    const dr: any = dailyRequest
    const resultRes = {
      ...dailyRequest,
      nameTranslation: dr.nameTranslations?.[0]?.value ?? null,
      descriptionTranslation: dr.descriptionTranslations?.[0]?.value ?? null
    }
    return {
      statusCode: HttpStatus.OK,
      data: resultRes,
      message: this.i18nService.translate(DailyRequestMessage.GET_SUCCESS, lang)
    }
  }

  async findByIdWithAllLang(id: number, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)
    const dailyRequest: any = await this.dailyRequestRepo.findByIdWithAllLang(id)
    if (!dailyRequest) {
      throw new NotFoundRecordException()
    }
    // derive single-language translations
    const nameTranslation = langId
      ? (dailyRequest.nameTranslations?.find((t: any) => t.languageId === langId)
          ?.value ?? null)
      : null
    const descriptionTranslation = langId
      ? (dailyRequest.descriptionTranslations?.find((t: any) => t.languageId === langId)
          ?.value ?? null)
      : null

    // map arrays to { key: code, value }
    const langIds = new Set<number>([
      ...(dailyRequest.nameTranslations ?? []).map((t: any) => t.languageId),
      ...(dailyRequest.descriptionTranslations ?? []).map((t: any) => t.languageId)
    ])
    const languages = await this.languageRepo.getWithListId(Array.from(langIds))
    const codeMap = Object.fromEntries(languages.map((l) => [l.id, l.code]))

    const resultRes = {
      ...dailyRequest,
      nameTranslations: (dailyRequest.nameTranslations ?? []).map((t: any) => ({
        key: codeMap[t.languageId] ?? String(t.languageId),
        value: t.value
      })),
      descriptionTranslations: (dailyRequest.descriptionTranslations ?? []).map(
        (t: any) => ({
          key: codeMap[t.languageId] ?? String(t.languageId),
          value: t.value
        })
      ),
      nameTranslation,
      descriptionTranslation
    }
    return {
      statusCode: HttpStatus.OK,
      data: resultRes,
      message: this.i18nService.translate(DailyRequestMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateDailyRequestBodyInputType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    let createdDailyRequest: any = null

    try {
      return await this.dailyRequestRepo.withTransaction(async (prismaTx) => {
        const nameKey = `daily_request.name.${Date.now()}`
        const descKey = `daily_request.description.${Date.now()}`

        //convert data cho create
        const dataCreate: CreateDailyRequestBodyType = {
          conditionValue: data.conditionValue,
          nameKey,
          descriptionKey: descKey,
          dailyRequestType: data.dailyRequestType,
          rewardId: data.rewardId,
          isActive: data.isActive,
          isStreak: data.isStreak
        }

        createdDailyRequest = await this.dailyRequestRepo.create(
          {
            createdById,
            data: dataCreate
          },
          prismaTx
        )

        // co id, tao nameKey chuan
        const fNameKey = `daily_request.name.${createdDailyRequest.id}`
        const fDescKey = `daily_request.description.${createdDailyRequest.id}`

        const nameList = data.nameTranslations.map((t) => t.key)
        const desList = data.descriptionTranslations?.map((t) => t.key) ?? []

        // Gộp & loại bỏ trùng key
        const allLangCodes = Array.from(new Set([...nameList, ...desList]))

        // Lấy danh sách ngôn ngữ tương ứng với các key
        const languages = await this.languageRepo.getWithListCode(allLangCodes)

        // Tạo map { code: id } để truy cập nhanh
        const langMap = Object.fromEntries(languages.map((l) => [l.code, l.id]))

        // Kiểm tra có ngôn ngữ nào bị thiếu không
        const missingLangs = allLangCodes.filter((code) => !langMap[code])
        if (missingLangs.length > 0) {
          throw new LanguageNotExistToTranslateException()
        }

        // Tạo danh sách bản dịch
        const translationRecords: CreateTranslationBodyType[] = []

        // nameTranslations → key = nameKey
        for (const item of data.nameTranslations) {
          translationRecords.push({
            languageId: langMap[item.key],
            key: fNameKey,
            value: item.value
          })
        }

        //check khong cho trung name
        await this.translationRepo.validateTranslationRecords(translationRecords)

        // descriptionTranslations → key = descriptionKey
        for (const item of data.descriptionTranslations ?? []) {
          translationRecords.push({
            languageId: langMap[item.key],
            key: fDescKey,
            value: item.value
          })
        }

        // Tạo nested upsert cho translations (giống Reward)
        const nameUpserts = data.nameTranslations.map((item) => ({
          where: {
            languageId_key: { languageId: langMap[item.key], key: fNameKey }
          },
          update: { value: item.value },
          create: { languageId: langMap[item.key], key: fNameKey, value: item.value }
        }))

        const descUpserts = (data.descriptionTranslations ?? []).map((item) => ({
          where: {
            languageId_key: { languageId: langMap[item.key], key: fDescKey }
          },
          update: { value: item.value },
          create: { languageId: langMap[item.key], key: fDescKey, value: item.value }
        }))

        // Update lại DailyRequest với key cuối cùng và nested translations
        const result = await this.dailyRequestRepo.update(
          {
            id: createdDailyRequest.id,
            data: {
              nameKey: fNameKey,
              descriptionKey: fDescKey,
              ...(nameUpserts.length
                ? { nameTranslations: { upsert: nameUpserts as any } }
                : {}),
              ...(descUpserts.length
                ? { descriptionTranslations: { upsert: descUpserts as any } }
                : {})
            } as any
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.CREATED,
          data: result,
          message: this.i18nService.translate(DailyRequestMessage.CREATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      // Rollback: Xóa daily request đã tạo nếu có lỗi
      if (createdDailyRequest?.id) {
        try {
          await this.dailyRequestRepo.delete(
            {
              id: createdDailyRequest.id,
              deletedById: createdById
            },
            true
          )
        } catch (rollbackError) {}
      }

      // if (isUniqueConstraintPrismaError(error)) {
      //   throw new DailyRequestAlreadyExistsException()
      // }
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
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
      data: UpdateDailyRequestBodyInputType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    let existingDailyRequest: any = null

    try {
      return await this.dailyRequestRepo.withTransaction(async (prismaTx) => {
        // --- 1. Lấy bản ghi hiện tại ---
        existingDailyRequest = await this.dailyRequestRepo.findById(id)
        if (!existingDailyRequest) throw new NotFoundRecordException()

        // --- 2. Chuẩn bị data update ---
        // Chỉ include những field thực sự được gửi (không để undefined)
        const dataUpdate: Partial<UpdateDailyRequestBodyType> = {}

        if (data.isStreak !== undefined) dataUpdate.isStreak = data.isStreak
        if (data.conditionValue !== undefined)
          dataUpdate.conditionValue = data.conditionValue
        if (data.dailyRequestType !== undefined)
          dataUpdate.dailyRequestType = data.dailyRequestType
        if (data.rewardId !== undefined) dataUpdate.rewardId = data.rewardId
        if (data.isActive !== undefined) dataUpdate.isActive = data.isActive

        // --- 3. Handle translations nếu có ---
        let nameUpserts: any[] = []
        let descUpserts: any[] = []
        if (data.nameTranslations || data.descriptionTranslations) {
          const nameList = data.nameTranslations?.map((t) => t.key) ?? []
          const descList = data.descriptionTranslations?.map((t) => t.key) ?? []

          const allLangCodes = Array.from(new Set([...nameList, ...descList]))

          if (allLangCodes.length > 0) {
            // Lấy languages tương ứng
            const languages = await this.languageRepo.getWithListCode(allLangCodes)
            const langMap = Object.fromEntries(languages.map((l) => [l.code, l.id]))

            // Kiểm tra missing language
            const missingLangs = allLangCodes.filter((code) => !langMap[code])
            if (missingLangs.length > 0) throw new LanguageNotExistToTranslateException()

            // --- 4. Tạo translation records ---
            const translationRecords: CreateTranslationBodyType[] = []

            // nameTranslations
            for (const t of data.nameTranslations ?? []) {
              translationRecords.push({
                languageId: langMap[t.key],
                key: existingDailyRequest.nameKey,
                value: t.value
              })
            }

            // --- 5. Validate translation records: check name la dc, desc cho trung---
            await this.translationRepo.validateTranslationRecords(translationRecords)

            // descriptionTranslations
            for (const t of data.descriptionTranslations ?? []) {
              translationRecords.push({
                languageId: langMap[t.key],
                key: existingDailyRequest.descriptionKey,
                value: t.value
              })
            }

            // --- 6. Thực hiện nested upsert translations thay vì gọi repo translation ---
            nameUpserts = (data.nameTranslations ?? []).map((t) => ({
              where: {
                languageId_key: {
                  languageId: (t.key && (langMap as any)[t.key]) as number,
                  key: existingDailyRequest.nameKey
                }
              },
              update: { value: t.value },
              create: {
                languageId: (t.key && (langMap as any)[t.key]) as number,
                key: existingDailyRequest.nameKey,
                value: t.value
              }
            }))

            descUpserts = (data.descriptionTranslations ?? []).map((t) => ({
              where: {
                languageId_key: {
                  languageId: (t.key && (langMap as any)[t.key]) as number,
                  key: existingDailyRequest.descriptionKey
                }
              },
              update: { value: t.value },
              create: {
                languageId: (t.key && (langMap as any)[t.key]) as number,
                key: existingDailyRequest.descriptionKey,
                value: t.value
              }
            }))
          }
        }

        // --- 7. Update DailyRequest chính ---
        const updatedDailyRequest = await this.dailyRequestRepo.update(
          {
            id,
            updatedById,
            data: {
              // ...existingDailyRequest,
              ...dataUpdate,
              ...(nameUpserts.length
                ? { nameTranslations: { upsert: nameUpserts as any } }
                : {}),
              ...(descUpserts.length
                ? { descriptionTranslations: { upsert: descUpserts as any } }
                : {})
            } as any
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.OK,
          data: updatedDailyRequest,
          message: this.i18nService.translate(DailyRequestMessage.UPDATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      // --- 8. Xử lý lỗi ---
      if (isNotFoundPrismaError(error)) throw new NotFoundRecordException()
      if (isUniqueConstraintPrismaError(error))
        throw new DailyRequestAlreadyExistsException()
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete(
    { id, deletedById }: { id: number; deletedById: number },
    lang: string = 'vi'
  ) {
    try {
      const [langId, existingDailyRequest] = await Promise.all([
        this.languageRepo.getIdByCode(lang),
        this.dailyRequestRepo.findById(id)
      ])
      if (!langId) {
        throw new NotFoundRecordException()
      }

      if (!existingDailyRequest) {
        throw new NotFoundRecordException()
      }

      const [,] = await Promise.all([
        this.dailyRequestRepo.delete({
          id,
          deletedById
        }),
        this.translationRepo.deleteByKey(existingDailyRequest.nameKey),
        this.translationRepo.deleteByKey(existingDailyRequest.descriptionKey)
      ])

      return {
        statusCode: HttpStatus.OK,
        data: null,
        message: this.i18nService.translate(DailyRequestMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }
}
