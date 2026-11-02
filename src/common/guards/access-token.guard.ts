import {
  REQUEST_ROLE_PERMISSIONS,
  REQUEST_USER_KEY
} from '@/common/constants/auth.constant'
import { HTTPMethod } from '@/common/constants/role.constant'
import { AuthMessage } from '@/i18n/message-keys'
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { TokenService } from 'src/shared/services/token.service'
import { AccessTokenPayload } from 'src/shared/types/jwt.type'
import { SYSTEM_MESSAGE } from '../constants/message'

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly prismaService: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    // Extract và validate token
    const decodedAccessToken = await this.extractAndValidateToken(request)

    // Check user permission
    await this.validateUserPermission(decodedAccessToken, request)
    return true
  }

  private async extractAndValidateToken(request: any): Promise<AccessTokenPayload> {
    const accessToken = this.extractAccessTokenFromHeader(request)
    try {
      const decodedAccessToken = await this.tokenService.verifyAccessToken(accessToken)

      request[REQUEST_USER_KEY] = decodedAccessToken
      return decodedAccessToken
    } catch {
      throw new UnauthorizedException(SYSTEM_MESSAGE.SESSION_EXPIRED)
    }
  }

  private extractAccessTokenFromHeader(request: any): string {
    const accessToken = request.headers.authorization?.split(' ')[1]
    if (!accessToken) {
      // Chưa gửi token (khác với token hết hạn/không hợp lệ bên dưới)
      throw new UnauthorizedException({
        message: AuthMessage.MISSING_ACCESS_TOKEN,
        errorKey: AuthMessage.MISSING_ACCESS_TOKEN
      })
    }
    return accessToken
  }

  private async validateUserPermission(
    decodedAccessToken: AccessTokenPayload,
    request: any
  ): Promise<void> {
    const roleId: number = decodedAccessToken.roleId
    const path: string = request.route.path
    const method = request.method as keyof typeof HTTPMethod
    const role = await this.prismaService.role
      .findUniqueOrThrow({
        where: {
          id: roleId,
          deletedAt: null,
          isActive: true
        },
        include: {
          permissions: {
            where: {
              deletedAt: null,
              path,
              method
            }
          }
        }
      })
      .catch(() => {
        throw new ForbiddenException(SYSTEM_MESSAGE.UNAUTHTHORIZED)
      })
    const canAccess = role.permissions.length > 0
    if (!canAccess) {
      throw new ForbiddenException(SYSTEM_MESSAGE.UNAUTHTHORIZED)
    }
    request[REQUEST_ROLE_PERMISSIONS] = role
  }
}
