import { Injectable } from '@nestjs/common'
import { UserType, WhereUniqueUserType } from 'src/shared/models/shared-user.model'
import { UserCoreRepo } from './user-core.repo'

// The User table for other modules (module-boundary plan B2, tier 0): reads
// and plain updates with the repo's signatures, nothing else. It depends on
// nothing above it, so wallet, auth, gateways and the like can use it without
// importing UserModule (which depends on wallet and more).
@Injectable()
export class UserCoreService {
  constructor(private readonly userCoreRepo: UserCoreRepo) {}

  findUnique(where: WhereUniqueUserType) {
    return this.userCoreRepo.findUnique(where)
  }

  findUniqueIncludeRole(where: WhereUniqueUserType) {
    return this.userCoreRepo.findUniqueIncludeRole(where)
  }

  findUniqueIncludeRolePermissions(where: WhereUniqueUserType) {
    return this.userCoreRepo.findUniqueIncludeRolePermissions(where)
  }

  findUniqueProfileWithStats(where: WhereUniqueUserType) {
    return this.userCoreRepo.findUniqueProfileWithStats(where)
  }

  update(where: { id: number }, data: Partial<UserType>) {
    return this.userCoreRepo.update(where, data)
  }

  addLevelForUser(userId: number, levelId: number) {
    return this.userCoreRepo.addLevelForUser(userId, levelId)
  }

  findUniqueWithLevel(where: WhereUniqueUserType) {
    return this.userCoreRepo.findUniqueWithLevel(where)
  }

  listIdsPage(currentPage: number, pageSize: number) {
    return this.userCoreRepo.listIdsPage(currentPage, pageSize)
  }

  // ---- For other modules: Elo after a battle (round-question completes the match, in its transaction) (B7) ----

  setEloscore(...args: Parameters<UserCoreRepo['setEloscore']>) {
    return this.userCoreRepo.setEloscore(...args)
  }

  // ---- For other modules: Elo of the players (battle question level) (B7) ----

  findElos(...args: Parameters<UserCoreRepo['findElos']>) {
    return this.userCoreRepo.findElos(...args)
  }

  // ---- For other modules: Device presence on the /user socket (UserGateway) (B7) ----

  markDeviceActive(...args: Parameters<UserCoreRepo['markDeviceActive']>) {
    return this.userCoreRepo.markDeviceActive(...args)
  }

  markUserDevicesActive(...args: Parameters<UserCoreRepo['markUserDevicesActive']>) {
    return this.userCoreRepo.markUserDevicesActive(...args)
  }

  touchActiveDevice(...args: Parameters<UserCoreRepo['touchActiveDevice']>) {
    return this.userCoreRepo.touchActiveDevice(...args)
  }

  touchActiveUserDevices(...args: Parameters<UserCoreRepo['touchActiveUserDevices']>) {
    return this.userCoreRepo.touchActiveUserDevices(...args)
  }
}
