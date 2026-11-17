import { BullQueueService } from '@/3rdService/bull/bull-queue.service'
import { OtpPurpose } from '@/modules/auth/otp-value'
import { maskEmail } from '@/common/utils/mask'
import { OtpService } from '@/modules/auth/otp.service'
import { UploadService } from '@/3rdService/upload/upload.service'
import { TypeOfVerificationCode } from '@/common/constants/auth.constant'
import { BullQueue } from '@/common/constants/bull-action.constant'
import { RoleName } from '@/common/constants/role.constant'
import { I18nService } from '@/i18n/i18n.service'
import { AuthMessage } from '@/i18n/message-keys'
import { AuthRepository } from '@/modules/auth/auth.repo'
import {
  EmailAlreadyExistsException,
  EmailNotFoundException,
  FailToLoginException,
  InvalidOTPExceptionForEmail,
  NeedDeviceVerificationException,
  RefreshTokenAlreadyUsedException,
  RegistrationTokenInvalidException,
  UnauthorizedAccessException
} from '@/modules/auth/dto/auth.error'
import {
  ChangePasswordBodyType,
  ForgotPasswordBodyType,
  LoginBodyType,
  RefreshTokenBodyType,
  RegisterBodyType,
  ResetPasswordBodyType,
  UpdateMeBodyType,
  verifyForgotPasswordBodyType
} from '@/modules/auth/entities/auth.entities'
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
import { RoleService } from '@/modules/role/role.service'
import { UserCoreService } from '@/modules/user/user-core.service'
import { HashingService } from '@/shared/services/hashing.service'
import { TokenService } from '@/shared/services/token.service'
import { AccessTokenPayloadCreate } from '@/shared/types/jwt.type'
import { InjectQueue } from '@nestjs/bull'
import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common'
import { Queue } from 'bull'
import Redis from 'ioredis'
import { LevelService } from '../level/level.service'
import { UserProgressService } from '../user-progress/user-progress.service'
import { UserSubscriptionService } from '@/modules/user-subscription/user-subscription.service'
import { UserTestService } from '../user-test/user-test.service'
import { WalletService } from '../wallet/wallet.service'
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
    private readonly i18nService: I18nService,
    private readonly userProgressService: UserProgressService,
    private readonly userTestService: UserTestService,
    @InjectQueue(BullQueue.USER_DELETION) private readonly deletionQueue: Queue,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
    private readonly tokenService: TokenService,
    private readonly walletSer: WalletService,
    private readonly userSubscriptionService: UserSubscriptionService
  ) {}

  async login(
    body: LoginBodyType & { userAgent: string; ip: string },
    lang: string = 'vi'
  ) {
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
    return {
      data,
      message: this.i18nService.translate(AuthMessage.LOGIN_SUCCESS, lang)
    }
  }

  async register(
    body: RegisterBodyType,
    userAgent: string,
    ip: string,
    lang: string = 'vi'
  ) {
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

      return {
        statusCode: HttpStatus.CREATED,
        data: data,
        message: this.i18nService.translate(AuthMessage.REGISTER_SUCCESS, lang)
      }
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

  async refreshToken(
    {
      refreshToken,
      userAgent,
      ip
    }: RefreshTokenBodyType & { userAgent: string; ip: string },
    lang: string = 'vi'
  ) {
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
      data: {
        ...userData,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      },
      message: this.i18nService.translate(AuthMessage.REFRESH_TOKEN_SUCCESS, lang)
    }
  }

  async logout(refreshToken: string, lang: string = 'vi') {
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
      return {
        data: null,
        message: this.i18nService.translate(AuthMessage.LOGOUT_SUCCESS, lang)
      }
    } catch (error) {
      // Trường hợp đã refresh token rồi, hãy thông báo cho user biết
      // refresh token của họ đã bị đánh cắp
      if (isNotFoundPrismaError(error)) {
        throw new RefreshTokenAlreadyUsedException()
      }
      throw new UnauthorizedAccessException()
    }
  }

  async forgotPassword(body: ForgotPasswordBodyType, lang: string = 'vi') {
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
      statusCode: HttpStatus.OK,
      data: {
        type: TypeOfVerificationCode.FORGOT_PASSWORD
      },
      message: this.i18nService.translate(AuthMessage.SEND_OTP_SUCCESS, lang)
    }
  }

  async verifyForgotPassword(
    body: verifyForgotPasswordBodyType,
    userAgent: string,
    ip: string
  ) {
    const { email, code } = body
    // 1. Kiểm tra email đã tồn tại trong database chưa
    const user = await this.userCoreService.findUniqueIncludeRole({
      email
    })
    if (!user) {
      throw new InvalidOTPExceptionForEmail()
    }

    // Verify OTP
    await this.otpService.verifyOtpStrict(
      email,
      code,
      TypeOfVerificationCode.FORGOT_PASSWORD
    )

    // 2. Xóa tất cả refreshToken và device cũ của user
    await Promise.all([
      this.authRepository.deleteManyRefreshTokenByUserId({ userId: user.id }),
      this.authRepository.deleteManyDeviceByUserId({ userId: user.id })
    ])

    // 3. Tạo device mới sau khi xóa hết device cũ
    const device = await this.authRepository.createDevice({
      userId: user.id,
      userAgent: userAgent,
      ip: ip
    })

    // 4. Tạo accessToken cho device mới
    const accessToken = await this.tokenService.signAccessToken({
      userId: user.id,
      deviceId: device.id,
      roleId: user.roleId,
      roleName: user.role.name
    })

    const data = {
      accessToken
    }

    return {
      data,
      message: this.i18nService.translate(AuthMessage.VERIFY_OTP_FORGOT_PASSWORD_SUCCESS)
    }
  }

  async resetPassword(body: ResetPasswordBodyType, userId: number, lang: string = 'vi') {
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

    return {
      data: null,
      message: this.i18nService.translate(AuthMessage.RESET_PASSWORD_SUCCESS, lang)
    }
  }

  async changePassword(
    body: ChangePasswordBodyType,
    userId: number,
    lang: string = 'vi'
  ) {
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

    return {
      data: null,
      message: this.i18nService.translate(AuthMessage.CHANGE_PASSWORD_SUCCESS, lang)
    }
  }

  async getMe(userId: number, lang: string = 'vi') {
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
      statusCode: 200,
      data: {
        ...user,
        rankName,
        pokemonCount: user._count.userPokemons,
        subscription
      },
      message: this.i18nService.translate(AuthMessage.GET_PROFILE_SUCCESS, lang)
    }
  }

  async updateMe(
    { data, userId }: { data: UpdateMeBodyType; userId: number },
    lang: string = 'vi'
  ) {
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
    return {
      data: updatedUser,
      message: this.i18nService.translate(AuthMessage.UPDATE_PROFILE_SUCCESS, lang)
    }
  }

  async checkMailToAction(
    email: string,
    userAgent: string,
    ip: string,
    lang: string = 'vi'
  ) {
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
        statusCode: HttpStatus.OK,
        data: {
          type: TypeOfVerificationCode.REGISTER,
          requiresOtp: true
        },
        message: this.i18nService.translate(AuthMessage.SEND_OTP_SUCCESS, lang)
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
        statusCode: HttpStatus.OK,
        data: {
          type: TypeOfVerificationCode.LOGIN,
          requiresOtp: true
        },
        message: this.i18nService.translate(AuthMessage.FIRST_LOGIN, lang)
      }
    }
    // neu la thiet bi da co
    //thi thoi
    return {
      statusCode: HttpStatus.OK,
      data: {
        type: TypeOfVerificationCode.LOGIN,
        requiresOtp: false
      },
      message: this.i18nService.translate(AuthMessage.NOT_FIRST_LOGIN, lang)
    }
  }

  async verifyOTP(
    body: { email: string; code: string; type: string },
    userAgent: string,
    ip: string,
    lang: string = 'vi'
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
          return {
            data: { registrationToken },
            message: this.i18nService.translate(
              AuthMessage.OTP_AUTHENTICATION_SUCCESS,
              lang
            )
          }
        }

        // neu type === 'login' thi tao device
        if (type === TypeOfVerificationCode.LOGIN) {
          const user = await this.userCoreService.findUnique({ email })
          if (!user) {
            throw new EmailNotFoundException()
          }
          await this.createUserDevice(user.id, userAgent, ip)
        } else if (type === TypeOfVerificationCode.FORGOT_PASSWORD) {
          return await this.verifyForgotPasswordByAction(email, userAgent, ip)
        } else if (type === TypeOfVerificationCode.CHANGE_PASSWORD) {
        }
        return {
          data: null,
          message: this.i18nService.translate(
            AuthMessage.OTP_AUTHENTICATION_SUCCESS,
            lang
          )
        }
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

    return {
      statusCode: HttpStatus.OK,
      data,
      message: this.i18nService.translate(AuthMessage.VERIFY_OTP_FORGOT_PASSWORD_SUCCESS)
    }
  }

  async updateFcmTokenDeviceWithDeviceId(
    {
      deviceId,
      fcmToken
    }: {
      deviceId: number
      fcmToken: string | null
    },
    lang: string = 'vi'
  ) {
    try {
      await this.authRepository.updateFcmTokenDeviceWithDeviceId(fcmToken, deviceId)
      return {
        statusCode: HttpStatus.OK,
        data: null,
        message: this.i18nService.translate(AuthMessage.UPDATE_SUCCESS)
      }
    } catch (error) {
      this.logger.error(
        `Failed to update FCM token for device ${deviceId}: ${error.message}`
      )
      throw error
    }
  }
}
