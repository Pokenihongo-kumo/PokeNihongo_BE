import { RoleName } from '@/common/constants/role.constant'
import { Injectable } from '@nestjs/common'
import { RoleType } from 'src/shared/models/shared-role.model'
import { PrismaService } from 'src/shared/services/prisma.service'

@Injectable()
// Role ids used by sign-up and admin checks, through RoleService (module-
// boundary plan B2; was shared/repositories/shared-role.repo.ts)
export class RoleCoreRepo {
  private clientRoleId: number | null = null
  private adminRoleId: number | null = null

  constructor(private readonly prismaService: PrismaService) {}

  private async getRole(roleName: string) {
    const role: RoleType = await this.prismaService.$queryRaw`
    SELECT * FROM "Role" WHERE name = ${roleName} AND "deletedAt" IS NULL LIMIT 1;
  `.then((res: RoleType[]) => {
      if (res.length === 0) {
        throw new Error('Role not found')
      }
      return res[0]
    })
    return role
  }

  // async getManagerRoleId() {
  //   if (this.clientRoleId) {
  //     return this.clientRoleId
  //   }
  //   const role = await this.getRole(RoleName.Manager)

  //   this.clientRoleId = role.id
  //   return role.id
  // }

  async getAdminRoleId() {
    if (this.adminRoleId) {
      return this.adminRoleId
    }
    const role = await this.getRole(RoleName.Admin)

    this.adminRoleId = role.id
    return role.id
  }

  async getCustomerRoleId() {
    if (this.clientRoleId) {
      return this.clientRoleId
    }
    const role = await this.getRole(RoleName.Learner)
    this.clientRoleId = role.id
    return role.id
  }

  async getRoleById(roleId: number) {
    return this.prismaService.role.findFirst({
      where: {
        id: roleId,
        deletedAt: null
      }
    })
  }
}
