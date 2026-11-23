import { UserStatus } from '@/common/constants/auth.constant'
import { Device, RefreshToken } from '@/modules/auth/entities/auth.entity'
import { WhereUniqueUserType } from '@/shared/models/shared-user.model'
import { Injectable } from '@nestjs/common'
import { Role } from '@/shared/models/shared-role.model'
import { User } from '@/shared/models/shared-user.model'
import { PrismaService } from '@/shared/services/prisma.service'

@Injectable()
export class AuthRepo {
  constructor(private readonly prismaService: PrismaService) {}

  async findUniqueUser(where: WhereUniqueUserType): Promise<User | null> {
    return this.prismaService.user.findFirst({
      where: {
        ...where,
        deletedAt: null
      }
    })
  }

  async createUser(
    user: Pick<User, 'email' | 'name' | 'password' | 'phoneNumber' | 'roleId' | 'avatar'>
  ): Promise<Omit<User, 'password'>> {
    const { password, ...userData } = user
    const createdUser = await this.prismaService.user.create({
      data: user
    })
    // Loại bỏ password khỏi kết quả trả về
    const { password: _, ...result } = createdUser
    return result as Omit<User, 'password'>
  }

  async createUserInclueRole(
    user: Pick<User, 'email' | 'name' | 'password' | 'phoneNumber' | 'avatar' | 'roleId'>
  ): Promise<User & { role: Role }> {
    return this.prismaService.user.create({
      data: {
        email: user.email,
        name: user.name,
        password: user.password,
        phoneNumber: user.phoneNumber,
        avatar: user.avatar,
        roleId: user.roleId
      },
      include: {
        role: true
      }
    })
  }

  async registerUser(
    user: Pick<User, 'email' | 'roleId' | 'password'> & {
      name: string
    }
  ): Promise<Omit<User, 'password'>> {
    const { password, ...userData } = user
    const createdUser = await this.prismaService.user.create({
      data: {
        ...user,
        status: UserStatus.ACTIVE
      },
      include: {
        role: true,
        level: true
      }
    })
    // Loại bỏ password khỏi kết quả trả về
    const { password: _, ...result } = createdUser
    return result as Omit<User, 'password'>
  }
  createRefreshToken(data: {
    token: string
    userId: number
    expiresAt: Date
    deviceId: number
  }) {
    return this.prismaService.refreshToken.create({
      data
    })
  }

  createDevice(
    data: Pick<Device, 'userId' | 'userAgent' | 'ip'> &
      Partial<Pick<Device, 'lastActive' | 'isActive'>>
  ) {
    return this.prismaService.device.create({
      data
    })
  }

  findDeviceByUserAndAgent(userId: number, userAgent: string, ip: string) {
    return this.prismaService.device.findFirst({
      where: {
        userId,
        userAgent,
        ip
      }
    })
  }

  async createOrUpdateDevice(
    data: Pick<Device, 'userId' | 'userAgent' | 'ip'> &
      Partial<Pick<Device, 'lastActive' | 'isActive'>>
  ) {
    // Kiểm tra device đã tồn tại chưa
    const existingDevice = await this.findDeviceByUserAndAgent(
      data.userId,
      data.userAgent,
      data.ip
    )

    if (existingDevice) {
      // Nếu device đã tồn tại, update thông tin
      return this.updateDevice(existingDevice.id, {
        ip: data.ip,
        lastActive: new Date(),
        isActive: true
      })
    }

    // Nếu chưa tồn tại, tạo mới
    return this.createDevice(data)
  }

  async findUniqueUserIncludeRole(
    where: WhereUniqueUserType
  ): Promise<(User & { role: Role }) | null> {
    return this.prismaService.user.findFirst({
      where: {
        ...where,
        deletedAt: null
      },
      include: {
        role: true,
        level: true
      }
    })
  }

  async findUniqueRefreshTokenIncludeUserRole(where: {
    token: string
  }): Promise<(RefreshToken & { user: User & { role: Role } }) | null> {
    return this.prismaService.refreshToken.findUnique({
      where,
      include: {
        user: {
          include: {
            role: true
          }
        }
      }
    })
  }

  updateDevice(deviceId: number, data: Partial<Device>): Promise<Device> {
    return this.prismaService.device.update({
      where: {
        id: deviceId
      },
      data
    })
  }

  // Consumes `oldToken` and stores `next` in one transaction. Of concurrent
  // calls with the same old token only one finds it (the others wait for its
  // row lock, then delete nothing) and the rest return false with nothing
  // written; any failure rolls back, so the old token stays usable
  rotateRefreshToken({
    oldToken,
    next,
    device
  }: {
    oldToken: string
    next: { token: string; userId: number; expiresAt: Date; deviceId: number }
    device: Pick<Device, 'ip' | 'userAgent'>
  }): Promise<boolean> {
    return this.prismaService.$transaction(async (tx) => {
      const { count } = await tx.refreshToken.deleteMany({ where: { token: oldToken } })
      if (count === 0) return false
      await tx.refreshToken.create({ data: next })
      await tx.device.update({ where: { id: next.deviceId }, data: device })
      return true
    })
  }

  deleteRefreshToken(where: { token: string }): Promise<RefreshToken> {
    return this.prismaService.refreshToken.delete({
      where
    })
  }

  // deleteVerificationCode(
  //   uniqueValue:
  //     | { id: number }
  //     | {
  //         email_code_type: {
  //           email: string
  //           code: string
  //           type: TypeOfVerificationCodeType
  //         }
  //       }
  // ): Promise<VerificationCodeType> {
  //   return this.prismaService.verificationCode.delete({
  //     where: uniqueValue
  //   })
  // }

  deleteExpiredRefreshTokens(): Promise<{ count: number }> {
    return this.prismaService.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })
  }

  deleteManyRefreshTokenByUserId(where: { userId: number }): Promise<{ count: number }> {
    return this.prismaService.refreshToken.deleteMany({
      where
    })
  }

  deleteManyDeviceByUserId(where: { userId: number }): Promise<{ count: number }> {
    return this.prismaService.device.deleteMany({
      where
    })
  }

  existEmail(email: string): Promise<User | null> {
    return this.prismaService.user.findFirst({
      where: {
        email,
        deletedAt: null
      }
    })
  }

  updateFcmTokenDeviceWithDeviceId(fcmToken: string | null, deviceId: number) {
    return this.prismaService.device.update({
      where: {
        id: deviceId
      },
      data: {
        fcmToken
      }
    })
  }
}
