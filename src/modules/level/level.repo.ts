import { LEVEL_TYPE, LevelTypeType } from '@/common/constants/level.constant'
import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQueryType } from '@/shared/models/request.model'
import { PrismaService } from '@/shared/services/prisma.service'
import { toPaginationMeta, toSkipTake } from '@/shared/utils/pagination'
import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import {
  CreateLevelBodyType,
  LEVEL_FIELDS,
  LevelType,
  UpdateLevelBodyType
} from './entities/level.entity'

// Detail and list rows carry their reward and next level
const WITH_RELATIONS = { reward: true, nextLevel: true } satisfies Prisma.LevelInclude
export type LevelWithRelations = Prisma.LevelGetPayload<{
  include: typeof WITH_RELATIONS
}>

@Injectable()
export class LevelRepo {
  constructor(private readonly prismaService: PrismaService) {}

  create({
    createdById,
    data
  }: {
    createdById: number | null
    data: CreateLevelBodyType
  }): Promise<LevelType> {
    return this.prismaService.level.create({
      data: {
        ...data,
        createdById // nằm trong data
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
    data: UpdateLevelBodyType
  }): Promise<LevelType> {
    return this.prismaService.level.update({
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
  ): Promise<LevelType> {
    return isHard
      ? this.prismaService.level.delete({
          where: {
            id
          }
        })
      : this.prismaService.level.update({
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
    const { where, orderBy } = parseQs(pagination.qs, LEVEL_FIELDS)

    const { skip, take } = toSkipTake(pagination.currentPage, pagination.pageSize)

    const [totalItems, data] = await Promise.all([
      this.prismaService.level.count({
        where: { deletedAt: null, ...where }
      }),
      this.prismaService.level.findMany({
        where: { deletedAt: null, ...where },
        include: WITH_RELATIONS,
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

  findById(id: number): Promise<LevelWithRelations | null> {
    return this.prismaService.level.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: WITH_RELATIONS
    })
  }

  findByLevelAndType(
    levelNumber: number,
    levelType: LevelTypeType
  ): Promise<LevelType | null> {
    return this.prismaService.level.findFirst({
      where: {
        levelNumber,
        levelType,
        deletedAt: null
      }
    })
  }

  getFirstLevelUser(): Promise<LevelType | null> {
    return this.prismaService.level.findFirst({
      where: {
        levelType: LEVEL_TYPE.USER,
        deletedAt: null,
        levelNumber: 1
      }
    })
  }

  // Tìm level kế tiếp dựa trên levelNumber + 1
  findNextLevelByNumber(
    levelNumber: number,
    levelType: LevelTypeType
  ): Promise<LevelType | null> {
    return this.prismaService.level.findFirst({
      where: {
        levelNumber: levelNumber + 1,
        levelType,
        deletedAt: null
      }
    })
  }

  // Tìm level trước đó dựa trên levelNumber - 1
  findPrevLevelByNumber(
    levelNumber: number,
    levelType: LevelTypeType
  ): Promise<LevelType | null> {
    return this.prismaService.level.findFirst({
      where: {
        levelNumber: levelNumber - 1,
        levelType,
        deletedAt: null
      }
    })
  }

  // Cập nhật nextLevelId cho một level
  updateNextLevel(levelId: number, nextLevelId: number | null): Promise<LevelType> {
    return this.prismaService.level.update({
      where: { id: levelId },
      data: { nextLevelId }
    })
  }
}
