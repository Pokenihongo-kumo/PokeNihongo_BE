import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQueryType } from '@/shared/models/request.model'
import { PrismaService } from '@/shared/services/prisma.service'
import { toPaginationMeta, toSkipTake } from '@/shared/utils/pagination'
import { Injectable } from '@nestjs/common'
import { ElementalType } from '@prisma/client'
import {
  CreateElementalTypeBodyType,
  ELEMENTAL_TYPE_FIELDS,
  UpdateElementalTypeBodyType
} from './entities/elemental-type.entity'

@Injectable()
export class ElementalTypeRepo {
  constructor(private readonly prismaService: PrismaService) {}

  create({
    createdById,
    data
  }: {
    createdById: number | null
    data: CreateElementalTypeBodyType
  }): Promise<ElementalType> {
    return this.prismaService.elementalType.create({
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
    data: UpdateElementalTypeBodyType
  }): Promise<ElementalType> {
    return this.prismaService.elementalType.update({
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
  ): Promise<ElementalType> {
    return isHard
      ? this.prismaService.elementalType.delete({
          where: {
            id
          }
        })
      : this.prismaService.elementalType.update({
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
    const { where, orderBy } = parseQs(pagination.qs, ELEMENTAL_TYPE_FIELDS)

    const { skip, take } = toSkipTake(pagination.currentPage, pagination.pageSize)

    const [totalItems, data] = await Promise.all([
      this.prismaService.elementalType.count({
        where: { deletedAt: null, ...where }
      }),
      this.prismaService.elementalType.findMany({
        where: { deletedAt: null, ...where },
        orderBy,
        skip,
        take
      })
    ])

    return {
      results: data,
      pagination: toPaginationMeta(
        pagination.currentPage,
        pagination.pageSize,
        totalItems
      )
    }
  }

  findById(id: number): Promise<ElementalType | null> {
    return this.prismaService.elementalType.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  findByTypeName(type_name: string): Promise<ElementalType | null> {
    return this.prismaService.elementalType.findFirst({
      where: {
        type_name,
        deletedAt: null
      }
    })
  }

  async getAllActiveTypes(): Promise<ElementalType[]> {
    return this.prismaService.elementalType.findMany({
      where: {
        deletedAt: null
      },
      orderBy: {
        type_name: 'asc'
      }
    })
  }
}
