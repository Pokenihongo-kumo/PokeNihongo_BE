import { I18nService } from '@/i18n/i18n.service'
import { ElementalTypeMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import { PaginationQueryType } from '@/shared/models/request.model'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/utils/prisma-errors'
import { HttpStatus, Injectable } from '@nestjs/common'
import { ElementalTypeAlreadyExistsException } from './dto/elemental-type.error'
import { ElementalTypeRepo } from './elemental-type.repo'
import {
  CreateElementalTypeBodyType,
  UpdateElementalTypeBodyType
} from './entities/elemental-type.entity'

@Injectable()
export class ElementalTypeService {
  constructor(
    private readonly elementalTypeRepo: ElementalTypeRepo,
    private readonly i18nService: I18nService
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.elementalTypeRepo.list(pagination)
    return {
      statusCode: HttpStatus.OK,
      data,
      message: this.i18nService.translate(ElementalTypeMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const elementalType = await this.elementalTypeRepo.findById(id)
    if (!elementalType) {
      throw new NotFoundRecordException()
    }
    return {
      data: elementalType,
      message: this.i18nService.translate(ElementalTypeMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateElementalTypeBodyType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    try {
      // Kiểm tra xem type_name đã tồn tại chưa
      const existingType = await this.elementalTypeRepo.findByTypeName(data.type_name)
      if (existingType) {
        throw new ElementalTypeAlreadyExistsException()
      }

      const result = await this.elementalTypeRepo.create({
        createdById,
        data
      })
      return {
        statusCode: HttpStatus.CREATED,
        data: result,
        message: this.i18nService.translate(ElementalTypeMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new ElementalTypeAlreadyExistsException()
      }
      if (isNotFoundPrismaError(error)) {
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
      data: UpdateElementalTypeBodyType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    try {
      const existElementalType = await this.elementalTypeRepo.findById(id)
      if (!existElementalType) {
        throw new NotFoundRecordException()
      }

      // Nếu update type_name, kiểm tra xem có trùng với type khác không
      if (data.type_name && data.type_name !== existElementalType.type_name) {
        const existingType = await this.elementalTypeRepo.findByTypeName(data.type_name)
        if (existingType) {
          throw new ElementalTypeAlreadyExistsException()
        }
      }

      const elementalType = await this.elementalTypeRepo.update({
        id,
        updatedById,
        data
      })
      return {
        statusCode: HttpStatus.OK,
        data: elementalType,
        message: this.i18nService.translate(ElementalTypeMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new ElementalTypeAlreadyExistsException()
      }
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
      await this.elementalTypeRepo.delete({
        id,
        deletedById
      })
      return {
        statusCode: HttpStatus.OK,
        data: null,
        message: this.i18nService.translate(ElementalTypeMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async getAllActiveTypes(lang: string = 'vi') {
    const data = await this.elementalTypeRepo.getAllActiveTypes()
    return {
      statusCode: HttpStatus.OK,
      data,
      message: this.i18nService.translate(ElementalTypeMessage.GET_LIST_SUCCESS, lang)
    }
  }
}
