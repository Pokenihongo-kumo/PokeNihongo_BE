import { BullQueueService } from '@/infrastructure/queue/bull-queue.service'
import { UploadService } from '@/modules/upload/upload.service'
import { TypeOfVerificationCode } from '@/common/constants/auth.constant'
import { BullQueue } from '@/common/constants/bull-action.constant'
import { RoleName } from '@/common/constants/role.constant'
import { maskEmail } from '@/common/utils/mask'
import { RoleService } from '@/modules/role/role.service'
import { UserSubscriptionService } from '@/modules/user-subscription/user-subscription.service'
import { UserCoreService } from '@/modules/user/user-core.service'
import {
  InValidNewPasswordAndConfirmPasswordException,
  InValidNewPasswordAndConfirmPasswordRegisterException,
  InvalidOldPasswordException,
  NotFoundRecordException
} from '@/shared/error'
import {
  convertEloToRank,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { HashingService } from '@/shared/services/hashing.service'
import { TokenService } from '@/shared/services/token.service'
import { AccessTokenPayloadCreate } from '@/shared/types/jwt.type'
import { InjectQueue } from '@nestjs/bull'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { Queue } from 'bull'
import Redis from 'ioredis'
import { LevelService } from '../level/level.service'
import { UserProgressService } from '../user-progress/user-progress.service'
import { UserTestService } from '../user-test/user-test.service'
import { WalletService } from '../wallet/wallet.service'
import { AuthRepository } from './auth.repo'
import {
  EmailAlreadyExistsException,
  EmailNotFoundException,
  FailToLoginException,
  InvalidOTPExceptionForEmail,
  NeedDeviceVerificationException,
  RefreshTokenAlreadyUsedException,
  RegistrationTokenInvalidException,
  UnauthorizedAccessException
} from './dto/auth.error'
import {
  ChangePasswordBody,
  ForgotPasswordBody,
  LoginBody,
  RefreshTokenBody,
  RegisterBody,
  ResetPasswordBody,
  UpdateMeBody
} from './dto/auth.zod-dto'
import { OtpPurpose } from './otp-value'
import { OtpService } from './otp.service'
import {
  newRegistrationToken,
  REGISTRATION_TOKEN_TTL_SECONDS,
  registrationTokenKey,
  TAKE
} from './registration-token'
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  constructor(
    private readonly hashingService: HashingService,
    private readonly roleService: RoleService,
    private readonly authRepository: AuthRepository,
    private readonly userCoreService: UserCoreService,
    private readonly otpService: OtpService,
    private readonly levelService: LevelService,
    private readonly bullQueueService: BullQueueService,
    private readonly uploadService: UploadService,
    private readonly userProgressService: UserProgressService,
    private readonly userTestService: UserTestService,
    @InjectQueue(BullQueue.USER_DELETION) private readonly deletionQueue: Queue,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
    private readonly tokenService: TokenService,
    private readonly walletSer: WalletService,
    private readonly userSubscriptionService: UserSubscriptionService
  ) {}

  async login(body: LoginBody & { userAgent: string; ip: string }) {
    // 1. Lấy thông tin user, kiểm tra user có tồn tại hay không, mật khẩu có đúng không
    const user = await this.authRepository.findUniqueUserIncludeRole({
      email: body.email.toLowerCase()
    })

    if (!user) {
      throw new FailToLoginException()
    }

    const isPasswordMatch = await this.hashingService.compare(
      body.password,
      user.password
    )
    if (!isPasswordMatch) {
      throw new FailToLoginException()
    }

    // Kiểm tra xem device đã tồn tại chưa
    const existingDevice = await this.authRepository.findDeviceByUserAndAgent(
      user.id,
      body.userAgent,
      body.ip
    )

    if (!existingDevice && user.role.name === RoleName.Learner) {
      throw new NeedDeviceVerificationException()
    }

    // 3. Kiểm tra và tạo/cập nhật device
    const device = await this.authRepository.createOrUpdateDevice({
      userId: user.id,
      userAgent: body.userAgent,
      ip: body.ip
    })

    // 4. Tạo mới accessToken và refreshToken
    const tokens = await this.generateTokens({
      userId: user.id,
      deviceId: device.id,
      roleId: user.roleId,
      roleName: user.role.name
    })
    const { password, ...userWithoutPassword } = user
    const data = {
      ...userWithoutPassword,
      ...tokens
    }
    return data
  }

  async register(body: RegisterBody, userAgent: string, ip: string) {
    try {
      if (body.password !== body.confirmPassword) {
        throw new InValidNewPasswordAndConfirmPasswordRegisterException()
      }
      // Only who verified the REGISTER OTP of this email (ADR D-auth §2)
      const verifiedEmail = await this.redisClient.eval(
        TAKE,
        1,
        registrationTokenKey(body.registrationToken)
      )
      if (verifiedEmail !== body.email) {
        throw new RegistrationTokenInvalidException()
      }

      const hashedPassword = await this.hashingService.hash(body.password)

      // const firstLevel = await this.levelRepo.getFirstLevelUser()
      const roleId = await this.roleService.getCustomerRoleId()
      const [user] = await Promise.all([
        this.authRepository.registerUser({
          email: body.email.toLowerCase(),
          password: hashedPassword,
          roleId,
          name: body.name
        })
      ])
      // tao device
      const device = await this.createUserDevice(user.id, userAgent, ip)
      // nhan role
      const role = await this.roleService.getRoleById(roleId)

      // Khởi tạo UserProgress cho tất cả lesson
      await this.userProgressService.initUserProgress(user.id)

      // Khởi tạo UserTest cho tất cả test miễn phí (price = 0 và status = ACTIVE)
      await this.userTestService.initUserTests(user.id)

      // 4. Tạo mới accessToken và refreshToken
      const tokens = await this.generateTokens({
        userId: user.id,
        deviceId: device.id,
        roleId: user.roleId,
        roleName: role?.name || RoleName.Learner
      })

      // tao wallets
      await this.walletSer.generateWalletByUserId(user.id)

      const { ...userWithoutPassword } = user
      const data = {
        ...userWithoutPassword,
        ...tokens
      }

      return data
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new EmailAlreadyExistsException()
      }
      throw error
    }
  }

  // Signs an access/refresh token pair; nothing is stored
  private async signTokens({
    userId,
    deviceId,
    roleId,
    roleName
  }: AccessTokenPayloadCreate) {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccessToken({
        userId,
        deviceId,
        roleId,
        roleName
      }),
      this.tokenService.signRefreshToken({
        userId
      })
    ])
    const decodedRefreshToken = await this.tokenService.verifyRefreshToken(refreshToken)
    return {
      accessToken,
      refreshToken,
      expiresAt: new Date(decodedRefreshToken.exp * 1000)
    }
  }

  async generateTokens(payload: AccessTokenPayloadCreate) {
    const { accessToken, refreshToken, expiresAt } = await this.signTokens(payload)
    await this.authRepository.createRefreshToken({
      token: refreshToken,
      userId: payload.userId,
      expiresAt,
      deviceId: payload.deviceId
    })
    return { accessToken, refreshToken }
  }

  async refreshToken({
    refreshToken,
    userAgent,
    ip
  }: RefreshTokenBody & { userAgent: string; ip: string }) {
    // 1. A token that is not ours, malformed or expired: the session is over.
    // Other failures (database...) are not answered with 401: the client
    // would end a session that is still valid
    let userId: number
    try {
      ;({ userId } = await this.tokenService.verifyRefreshToken(refreshToken))
    } catch {
      throw new UnauthorizedAccessException()
    }
    // 2. Not stored: already used (or revoked)
    const refreshTokenInDb =
      await this.authRepository.findUniqueRefreshTokenIncludeUserRole({
        token: refreshToken
      })
    if (!refreshTokenInDb) {
      throw new RefreshTokenAlreadyUsedException()
    }
    const {
      deviceId,
      user: {
        roleId,
        role: { name: roleName }
      }
    } = refreshTokenInDb
    // 3. Consume the old token and store the new one in one transaction; a
    // concurrent refresh with the same token loses here
    const tokens = await this.signTokens({ userId, roleId, roleName, deviceId })
    const rotated = await this.authRepository.rotateRefreshToken({
      oldToken: refreshToken,
      next: { token: tokens.refreshToken, userId, expiresAt: tokens.expiresAt, deviceId },
      device: { ip, userAgent }
    })
    if (!rotated) {
      throw new RefreshTokenAlreadyUsedException()
    }
    const userData = await this.authRepository.findUniqueUserIncludeRole({ id: userId })
    return {
      ...userData,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    }
  }

  async logout(refreshToken: string) {
    try {
      // 1. Kiểm tra refreshToken có hợp lệ không
      await this.tokenService.verifyRefreshToken(refreshToken)
      // 2. Xóa refreshToken trong database
      const deletedRefreshToken = await this.authRepository.deleteRefreshToken({
        token: refreshToken
      })
      // 3. Cập nhật device là đã logout
      await this.authRepository.updateDevice(deletedRefreshToken.deviceId, {
        isActive: false
      })
      return
    } catch (error) {
      // Trường hợp đã refresh token rồi, hãy thông báo cho user biết
      // refresh token của họ đã bị đánh cắp
      if (isNotFoundPrismaError(error)) {
        throw new RefreshTokenAlreadyUsedException()
      }
      throw new UnauthorizedAccessException()
    }
  }

  async forgotPassword(body: ForgotPasswordBody) {
    const { email } = body
    // 1. Kiểm tra email đã tồn tại trong database chưa
    const user = await this.userCoreService.findUnique({
      email
    })
    if (!user) {
      throw new EmailNotFoundException()
    }

    // if (user.status === UserStatus.INACTIVE) {
    //   throw new UnverifiedAccountException()
    // }

    // Send email
    const registerEmailLowerCase = user.email.toLowerCase()
    const template = 'otp'
    const content = 'Mã OTP của bạn là: '
    const bodyContent = 'Vui lòng nhập mã OTP để làm bước tiếp theo.'
    await this.otpService.generateAndSendOtp(
      registerEmailLowerCase,
      TypeOfVerificationCode.FORGOT_PASSWORD,
      template,
      content,
      bodyContent
    )
    return {
      type: TypeOfVerificationCode.FORGOT_PASSWORD
    }
  }

  async resetPassword(body: ResetPasswordBody, userId: number) {
    const { newPassword, email, confirmNewPassword } = body
    // 1. Kiểm tra email đã tồn tại trong database chưa
    const user = await this.userCoreService.findUnique({ email })

    if (!user || user.id !== userId) {
      throw new EmailNotFoundException()
    }

    // tới đây đổi mật khẩu cho nó
    const hashedPassword = await this.hashingService.hash(newPassword)
    await Promise.all([
      this.userCoreService.update(
        { id: user.id },
        {
          password: hashedPassword,
          updatedById: user.id
        }
      )
    ])

    return
  }

  async changePassword(body: ChangePasswordBody, userId: number) {
    const { password, newPassword, confirmNewPassword } = body
    // 1. Kiểm tra email đã tồn tại trong database chưa
    const user = await this.userCoreService.findUnique({ id: userId })

    if (!user) {
      throw new EmailNotFoundException()
    }
    //check password == password cu
    if (newPassword !== confirmNewPassword) {
      throw new InValidNewPasswordAndConfirmPasswordException()
    }
    const isPasswordMatch = await this.hashingService.compare(password, user.password)
    if (!isPasswordMatch) {
      throw new InvalidOldPasswordException()
    }

    // tới đây đổi mật khẩu cho nó
    const hashedPassword = await this.hashingService.hash(newPassword)
    await Promise.all([
      this.userCoreService.update(
        { id: user.id },
        {
          password: hashedPassword,
          updatedById: user.id
        }
      )
    ])

    return
  }

  async getMe(userId: number) {
    const user = await this.userCoreService.findUniqueProfileWithStats({
      id: userId
    })
    if (!user) {
      throw new EmailNotFoundException()
    }

    const rankName = convertEloToRank(user.eloscore || 0)

    // gọi checkActiveSubscriptionByUserId
    const subscription =
      await this.userSubscriptionService.checkActiveSubscriptionByUserId(userId)

    return {
      ...user,
      rankName,
      pokemonCount: user._count.userPokemons,
      subscription
    }
  }

  async updateMe({ data, userId }: { data: UpdateMeBody; userId: number }) {
    const user = await this.userCoreService.findUnique({
      id: userId
    })
    if (!user) {
      throw new NotFoundRecordException()
    }

    // Handle avatar URL change
    if (data.avatar && data.avatar !== user.avatar) {
      // Delete old avatar from Cloudinary if exists
      if (user.avatar) {
        try {
          await this.uploadService.deleteFile(user.avatar, 'users/avatars')
          this.logger.log(`Deleted old avatar: ${user.avatar}`)
        } catch (error) {
          // Log warning but don't fail the update
          this.logger.warn(`Failed to delete old avatar: ${error.message}`)
        }
      }
    }

    const updatedUser = await this.userCoreService.update(
      { id: userId },
      {
        ...data,
        updatedById: userId
      }
    )
    return updatedUser
  }

  async checkMailToAction(email: string, userAgent: string, ip: string) {
    const user = await this.authRepository.existEmail(email)
    if (!user) {
      // neu khong co -> register
      //send otp mail
      // 2. send mail de xác thực
      const emailLower = email.toLowerCase()
      const template = 'otp'
      const content = 'MÃ OTP MAIL ĐĂNG KÝ CỦA BẠN: '
      const bodyContent = 'Vui lòng nhập mã OTP để tiếp tục bước tiếp theo.'
      await this.otpService.generateAndSendOtp(
        emailLower,
        TypeOfVerificationCode.REGISTER,
        template,
        content,
        bodyContent
      )
      return {
        type: TypeOfVerificationCode.REGISTER,
        requiresOtp: true
      }
    }

    // neu user ton tai -> login

    // check xem la thiet bi moi hay cu
    // Kiểm tra xem device đã tồn tại chưa
    const existingDevice = await this.authRepository.findDeviceByUserAndAgent(
      user.id,
      userAgent,
      ip
    )

    if (!existingDevice) {
      // Đây là lần đăng nhập đầu tiên từ thiết bị này, gửi email thông báo
      const template = 'otp'
      const content = 'XÁC THỰC ĐĂNG NHẬP TỪ THIẾT BỊ MỚI: '
      const bodyContent = `Chúng tôi phát hiện lần đăng nhập đầu tiên từ thiết bị mới
      Vui lòng nhập mã OTP để xác thực thiết bị này.`

      await this.otpService.generateAndSendOtp(
        email,
        TypeOfVerificationCode.LOGIN,
        template,
        content,
        bodyContent
      )

      // Bước tiếp theo nằm ở `requiresOtp`, statusCode luôn là HTTP status (200)
      return {
        type: TypeOfVerificationCode.LOGIN,
        requiresOtp: true
      }
    }
    // neu la thiet bi da co
    //thi thoi
    return {
      type: TypeOfVerificationCode.LOGIN,
      requiresOtp: false
    }
  }

  async verifyOTP(
    body: { email: string; code: string; type: string },
    userAgent: string,
    ip: string
  ) {
    try {
      const { email, code, type } = body
      // The code of this purpose only, deleted in the same step (works once)
      if (await this.otpService.consumeOtp(email, type as OtpPurpose, code)) {
        this.logger.log(`OTP verified and deleted for ${maskEmail(email)}`)

        // ADR D-auth §2: the proof POST /auth/register asks for
        if (type === TypeOfVerificationCode.REGISTER) {
          const registrationToken = newRegistrationToken()
          await this.redisClient.set(
            registrationTokenKey(registrationToken),
            email,
            'EX',
            REGISTRATION_TOKEN_TTL_SECONDS
          )
          return { outcome: 'verified' as const, data: { registrationToken } }
        }

        // neu type === 'login' thi tao device
        if (type === TypeOfVerificationCode.LOGIN) {
          const user = await this.userCoreService.findUnique({ email })
          if (!user) {
            throw new EmailNotFoundException()
          }
          await this.createUserDevice(user.id, userAgent, ip)
        } else if (type === TypeOfVerificationCode.FORGOT_PASSWORD) {
          return {
            outcome: 'forgot-password' as const,
            data: await this.verifyForgotPasswordByAction(email, userAgent, ip)
          }
        } else if (type === TypeOfVerificationCode.CHANGE_PASSWORD) {
        }
        return { outcome: 'verified' as const, data: null }
      }
      //

      throw new InvalidOTPExceptionForEmail()
    } catch (error) {
      this.logger.error(
        `Failed to verify OTP for ${maskEmail(body.email)}: ${error.message}`
      )
      throw error
    }
  }

  async createUserDevice(userId: number, userAgent: string, ip: string) {
    const device = await this.authRepository.createDevice({
      userId,
      userAgent,
      ip
    })
    return device
  }

  async verifyForgotPasswordByAction(email: string, userAgent: string, ip: string) {
    // 1. Kiểm tra email đã tồn tại trong database chưa
    const user = await this.userCoreService.findUniqueIncludeRole({
      email
    })
    if (!user) {
      throw new InvalidOTPExceptionForEmail()
    }

    // 2. Xóa tất cả refreshToken và device cũ của user
    await Promise.all([
      this.authRepository.deleteManyRefreshTokenByUserId({ userId: user.id }),
      this.authRepository.deleteManyDeviceByUserId({ userId: user.id })
    ])

    // thành công hết thì: send token va gui mail
    const device = await this.authRepository.createDevice({
      userId: user.id,
      userAgent: userAgent,

      ip: ip
    })
    const accessToken = await this.tokenService.signAccessToken({
      userId: user.id,
      deviceId: device.id,
      roleId: user.roleId,
      roleName: user.role.name
    })

    const data = {
      accessToken
    }

    return data
  }

  async updateFcmTokenDeviceWithDeviceId({
    deviceId,
    fcmToken
  }: {
    deviceId: number
    fcmToken: string | null
  }) {
    try {
      await this.authRepository.updateFcmTokenDeviceWithDeviceId(fcmToken, deviceId)
      return null
    } catch (error) {
      this.logger.error(
        `Failed to update FCM token for device ${deviceId}: ${error.message}`
      )
      throw error
    }
  }
}
