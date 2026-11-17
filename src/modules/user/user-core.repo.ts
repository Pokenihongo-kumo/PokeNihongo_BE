import { LevelType } from '@/modules/level/entities/level.entity'
import { Injectable } from '@nestjs/common'
import { PermissionType } from 'src/shared/models/shared-permission.model'
import { RoleType } from 'src/shared/models/shared-role.model'
import { UserType, WhereUniqueUserType } from 'src/shared/models/shared-user.model'
import { PrismaService } from 'src/shared/services/prisma.service'

type UserIncludeRolePermissionsType = UserType & {
  role: RoleType & { permissions: PermissionType[] }
}
type UserIncludeRoleType = UserType & {
  role: RoleType
}

type UserProfileWithStatsType = UserType & {
  role: RoleType
  level: any | null
  _count: {
    userPokemons: number
  }
}

@Injectable()
// Reads and updates the User table for other modules, through UserCoreService
// (module-boundary plan B2; was shared/repositories/shared-user.repo.ts)
export class UserCoreRepo {
  constructor(private readonly prismaService: PrismaService) {}

  findUnique(where: WhereUniqueUserType): Promise<UserType | null> {
    return this.prismaService.user.findFirst({
      where: {
        ...where,
        deletedAt: null
      }
    })
  }
  findUniqueIncludeRole(where: WhereUniqueUserType): Promise<UserIncludeRoleType | null> {
    return this.prismaService.user.findFirst({
      where: {
        ...where,
        deletedAt: null
      },
      include: {
        role: true
      }
    })
  }

  findUniqueIncludeRolePermissions(
    where: WhereUniqueUserType
  ): Promise<UserIncludeRolePermissionsType | null> {
    return this.prismaService.user.findFirst({
      where: {
        ...where,
        deletedAt: null
      },
      include: {
        role: {
          include: {
            permissions: {
              where: {
                deletedAt: null
              }
            }
          }
        }
      }
    })
  }

  findUniqueProfileWithStats(
    where: WhereUniqueUserType
  ): Promise<UserProfileWithStatsType | null> {
    return this.prismaService.user.findFirst({
      where: {
        ...where,
        deletedAt: null
      },
      include: {
        role: true,
        level: {
          include: {
            nextLevel: true
          }
        },
        _count: {
          select: {
            userPokemons: {
              where: {
                deletedAt: null
              }
            }
          }
        }
      }
    })
  }

  update(where: { id: number }, data: Partial<UserType>): Promise<UserType | null> {
    return this.prismaService.user.update({
      where: {
        ...where,
        deletedAt: null
      },
      data
    })
  }

  addLevelForUser(userId: number, levelId: number) {
    return this.prismaService.user.update({
      where: {
        id: userId,
        deletedAt: null
      },
      data: {
        levelId
      }
    })
  }

  findUniqueWithLevel(
    where: WhereUniqueUserType
  ): Promise<
    (UserType & { level: Pick<LevelType, 'id' | 'levelNumber'> | null }) | null
  > {
    return this.prismaService.user.findFirst({
      where: {
        ...where,
        deletedAt: null
      },
      include: {
        level: true
      }
    })
  }

  // A page of active user ids (oldest first) and the number of pages
  async listIdsPage(currentPage: number, pageSize: number) {
    const [total, rows] = await Promise.all([
      this.prismaService.user.count({ where: { deletedAt: null } }),
      this.prismaService.user.findMany({
        where: { deletedAt: null },
        select: { id: true },
        orderBy: { id: 'asc' },
        skip: (currentPage - 1) * pageSize,
        take: pageSize
      })
    ])
    return { ids: rows.map((row) => row.id), totalPage: Math.ceil(total / pageSize) }
  }
}
