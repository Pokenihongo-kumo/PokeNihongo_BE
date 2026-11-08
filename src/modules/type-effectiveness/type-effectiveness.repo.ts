import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQueryType } from '@/shared/models/request.model'
import { PrismaService } from '@/shared/services/prisma.service'
import { toPaginationMeta, toSkipTake } from '@/shared/utils/pagination'
import { Injectable } from '@nestjs/common'
import { Prisma, TypeEffectiveness } from '@prisma/client'
import {
  CreateTypeEffectivenessBodyType,
  TYPE_EFFECTIVENESS_FIELDS,
  UpdateTypeEffectivenessBodyType
} from './entities/type-effectiveness.entity'

// Every read returns both elemental types with these fields
const TYPE_SELECT = {
  select: { id: true, type_name: true, display_name: true, color_hex: true }
} satisfies Prisma.ElementalTypeDefaultArgs
const WITH_TYPES = {
  attacker: TYPE_SELECT,
  defender: TYPE_SELECT
} satisfies Prisma.TypeEffectivenessInclude

export type TypeEffectivenessWithTypes = Prisma.TypeEffectivenessGetPayload<{
  include: typeof WITH_TYPES
}>

@Injectable()
export class TypeEffectivenessRepo {
  constructor(private readonly prismaService: PrismaService) {}

  create({
    createdById,
    data
  }: {
    createdById: number | null
    data: CreateTypeEffectivenessBodyType
  }): Promise<TypeEffectivenessWithTypes> {
    return this.prismaService.typeEffectiveness.create({
      data: { ...data, createdById },
      include: WITH_TYPES
    })
  }

  update({
    id,
    updatedById,
    data
  }: {
    id: number
    updatedById: number
    data: UpdateTypeEffectivenessBodyType
  }): Promise<TypeEffectivenessWithTypes> {
    return this.prismaService.typeEffectiveness.update({
      where: { id, deletedAt: null },
      data: { ...data, updatedById },
      include: WITH_TYPES
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
  ): Promise<TypeEffectiveness> {
    return isHard
      ? this.prismaService.typeEffectiveness.delete({ where: { id } })
      : this.prismaService.typeEffectiveness.update({
          where: { id, deletedAt: null },
          data: { deletedAt: new Date(), deletedById }
        })
  }

  async list(pagination: PaginationQueryType) {
    const { where, orderBy } = parseQs(pagination.qs, TYPE_EFFECTIVENESS_FIELDS)
    const { skip, take } = toSkipTake(pagination.currentPage, pagination.pageSize)

    const [totalItems, data] = await Promise.all([
      this.prismaService.typeEffectiveness.count({
        where: { deletedAt: null, ...where }
      }),
      this.prismaService.typeEffectiveness.findMany({
        where: { deletedAt: null, ...where },
        include: WITH_TYPES,
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

  findById(id: number): Promise<TypeEffectivenessWithTypes | null> {
    return this.prismaService.typeEffectiveness.findFirst({
      where: { id, deletedAt: null },
      include: WITH_TYPES
    })
  }

  findByAttackerDefender(
    attackerId: number,
    defenderId: number
  ): Promise<TypeEffectivenessWithTypes | null> {
    return this.prismaService.typeEffectiveness.findFirst({
      where: { attackerId, defenderId, deletedAt: null },
      include: WITH_TYPES
    })
  }

  getAllActiveEffectiveness(): Promise<TypeEffectivenessWithTypes[]> {
    return this.prismaService.typeEffectiveness.findMany({
      where: { deletedAt: null },
      include: WITH_TYPES,
      orderBy: [{ attacker: { type_name: 'asc' } }, { defender: { type_name: 'asc' } }]
    })
  }

  async getEffectivenessMatrix(): Promise<{
    [attackerType: string]: {
      [defenderType: string]: number
    }
  }> {
    const effectiveness = await this.getAllActiveEffectiveness()

    const matrix: { [attackerType: string]: { [defenderType: string]: number } } = {}

    effectiveness.forEach((eff) => {
      if (!matrix[eff.attacker.type_name]) {
        matrix[eff.attacker.type_name] = {}
      }
      matrix[eff.attacker.type_name][eff.defender.type_name] = eff.multiplier
    })

    return matrix
  }

  getWeaknessesForDefender(defenderId: number): Promise<TypeEffectivenessWithTypes[]> {
    return this.prismaService.typeEffectiveness.findMany({
      where: {
        defenderId,
        multiplier: { gt: 1 }, // Chỉ lấy những type effectiveness > 1 (super effective)
        deletedAt: null
      },
      include: WITH_TYPES,
      orderBy: [{ multiplier: 'desc' }, { attacker: { type_name: 'asc' } }]
    })
  }

  getResistancesForDefender(defenderId: number): Promise<TypeEffectivenessWithTypes[]> {
    return this.prismaService.typeEffectiveness.findMany({
      where: {
        defenderId,
        multiplier: { lt: 1 }, // Chỉ lấy những type effectiveness < 1 (not very effective)
        deletedAt: null
      },
      include: WITH_TYPES,
      orderBy: [{ multiplier: 'asc' }, { attacker: { type_name: 'asc' } }]
    })
  }

  // type_name for each id in order (repeats kept, deleted/unknown ids skipped),
  // in one query instead of one per id
  async findActiveTypeNames(ids: number[]): Promise<string[]> {
    const types = await this.prismaService.elementalType.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, type_name: true }
    })
    const nameById = new Map(types.map((t) => [t.id, t.type_name]))
    return ids.flatMap((id) => {
      const name = nameById.get(id)
      return name ? [name] : []
    })
  }
}
