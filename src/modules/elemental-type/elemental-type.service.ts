import { NotFoundRecordException } from '@/shared/error'
import { PaginationQuery } from '@/shared/models/request.model'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/utils/prisma-errors'
import { HttpStatus, Injectable } from '@nestjs/common'
import { ElementalTypeAlreadyExistsException } from './dto/elemental-type.error'
import {
  CreateElementalTypeBody,
  UpdateElementalTypeBody
} from './dto/elemental-type.zod-dto'
import { ElementalTypeRepo } from './elemental-type.repo'

@Injectable()
export class ElementalTypeService {
  constructor(private readonly elementalTypeRepo: ElementalTypeRepo) {}

  async list(pagination: PaginationQuery) {
    const data = await this.elementalTypeRepo.list(pagination)
    return data
  }

  async findById(id: number) {
    const elementalType = await this.elementalTypeRepo.findById(id)
    if (!elementalType) {
      throw new NotFoundRecordException()
    }
    return elementalType
  }

  async create({
    data,
    createdById
  }: {
    data: CreateElementalTypeBody
    createdById: number
  }) {
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
      return result
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

  async update({
    id,
    data,
    updatedById
  }: {
    id: number
    data: UpdateElementalTypeBody
    updatedById: number
  }) {
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
      return elementalType
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

  async delete({ id, deletedById }: { id: number; deletedById: number }) {
    try {
      await this.elementalTypeRepo.delete({
        id,
        deletedById
      })
      return
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async getAllActiveTypes() {
    const data = await this.elementalTypeRepo.getAllActiveTypes()
    return data
  }
}
