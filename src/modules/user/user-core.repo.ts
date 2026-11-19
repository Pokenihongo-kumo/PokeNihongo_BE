import { Level } from '@/modules/level/entities/level.entity'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { Permission } from 'src/shared/models/shared-permission.model'
import { Role } from 'src/shared/models/shared-role.model'
import { User, WhereUniqueUserType } from 'src/shared/models/shared-user.model'
import { PrismaService } from 'src/shared/services/prisma.service'

type UserIncludeRolePermissionsType = User & {
  role: Role & { permissions: Permission[] }
}
type UserIncludeRoleType = User & {
  role: Role
}

type UserProfileWithStatsType = User & {
  role: Role
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

  findUnique(where: WhereUniqueUserType): Promise<User | null> {
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

  update(where: { id: number }, data: Partial<User>): Promise<User | null> {
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
  ): Promise<(User & { level: Pick<Level, 'id' | 'levelNumber'> | null }) | null> {
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

  // ---- Elo after a battle (round-question completes the match, in its transaction) ----

  setEloscore(id: number, eloscore: number, prismaTx: PrismaClient) {
    return prismaTx.user.update({
      where: { id },
      data: { eloscore }
    })
  }

  // ---- Elo of the players (battle question level) ----

  findElos(ids: number[]) {
    return this.prismaService.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, eloscore: true }
    })
  }

  // ---- Device presence on the /user socket (UserGateway) ----

  // Connected: this device of the user is active now
  markDeviceActive(deviceId: number, userId: number) {
    return this.prismaService.device.updateMany({
      where: { id: deviceId, userId },
      data: { isActive: true, lastActive: new Date() }
    })
  }

  // Connected without a known device: all of the user's devices
  markUserDevicesActive(userId: number) {
    return this.prismaService.device.updateMany({
      where: { userId },
      data: { isActive: true, lastActive: new Date() }
    })
  }

  // Disconnected: last seen now (stays active)
  touchActiveDevice(deviceId: number, userId: number) {
    return this.prismaService.device.updateMany({
      where: { id: deviceId, userId, isActive: true },
      data: { lastActive: new Date() }
    })
  }

  // Disconnected without a known device
  touchActiveUserDevices(userId: number) {
    return this.prismaService.device.updateMany({
      where: { userId, isActive: true },
      data: { lastActive: new Date() }
    })
  }

  // Season end: every user not deleted loses `by` elo (not below 0), one transaction.
  // Returns how many users were updated.
  async lowerEloOfAllUsers(by: number): Promise<number> {
    const allUsers = await this.prismaService.user.findMany({
      where: { deletedAt: null },
      select: { id: true, eloscore: true }
    })
    await this.prismaService.$transaction(
      allUsers.map((u) =>
        this.prismaService.user.update({
          where: { id: u.id },
          data: { eloscore: Math.max(0, (u.eloscore || 0) - by) }
        })
      )
    )
    return allUsers.length
  }
}
