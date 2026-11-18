import envConfig from '@/config/env.config'
import { I18nService } from '@/i18n/i18n.service'
import { AuthMessage } from '@/i18n/message-keys'
import { RoleService } from '@/modules/role/role.service'
import { UserProgressService } from '@/modules/user-progress/user-progress.service'
import { UserTestService } from '@/modules/user-test/user-test.service'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { createHash, randomBytes } from 'crypto'
import { google } from 'googleapis'
import Redis from 'ioredis'
import { AuthService } from 'src/modules/auth/auth.service'
import { HashingService } from 'src/shared/services/hashing.service'
import { v4 as uuidv4 } from 'uuid'
import { AuthRepository } from './auth.repo'
import {
  ExchangeCodeInvalidException,
  GoogleRedirectNotAllowedException,
  GoogleUserInfoException
} from './dto/auth.error'
import { GoogleExchangeBody, GoogleLinkQuery } from './dto/auth.zod-dto'
import { TAKE } from './registration-token'

const STATE_TTL_SECONDS = 10 * 60
const EXCHANGE_TTL_SECONDS = 60
const stateKey = (state: string) => `oauth_state:${state}`
const exchangeKey = (code: string) =>
  `oauth_exchange:${createHash('sha256').update(code).digest('hex')}`
const s256 = (verifier: string) =>
  createHash('sha256').update(verifier).digest('base64url')

type PendingSignIn = { codeChallenge: string; redirectUri: string }
type IssuedCode = { userId: number; codeChallenge: string }

/**
 * Google sign-in (ADR D-auth §3). Tokens never travel in a URL:
 * 1. google-link: the client sends a PKCE challenge; the OAuth `state` is a
 *    random one-time value kept in Redis with that challenge and the
 *    allowlisted redirect URI.
 * 2. callback: the state is taken (once); Google's code is exchanged; the
 *    client is redirected with a one-time code valid 60 seconds.
 * 3. exchange: the client sends that code and its code verifier; only then are
 *    tokens issued. A leaked code is useless without the verifier.
 */
@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name)
  private oauth2Client
  constructor(
    private readonly hashingService: HashingService,
    private readonly authService: AuthService,
    private readonly authRepository: AuthRepository,
    private readonly roleService: RoleService,
    private readonly userProgressService: UserProgressService,
    private readonly userTestService: UserTestService,
    private readonly i18nService: I18nService,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      envConfig.GOOGLE_CLIENT_ID,
      envConfig.GOOGLE_CLIENT_SECRET,
      envConfig.GOOGLE_REDIRECT_URI
    )
  }

  // Where the client may be sent back: GOOGLE_CLIENT_REDIRECT_URI and
  // GOOGLE_CLIENT_REDIRECT_URIS, nothing else
  allowedRedirectUris(): string[] {
    return [
      envConfig.GOOGLE_CLIENT_REDIRECT_URI,
      ...(envConfig.GOOGLE_CLIENT_REDIRECT_URIS ?? '').split(',')
    ]
      .map((uri) => uri?.trim())
      .filter((uri): uri is string => Boolean(uri))
  }

  async getAuthorizationUrl({ codeChallenge, redirectUri }: GoogleLinkQuery) {
    const allowed = this.allowedRedirectUris()
    const target = redirectUri ?? allowed[0]
    if (!target || !allowed.includes(target))
      throw new GoogleRedirectNotAllowedException()

    const state = randomBytes(32).toString('base64url')
    const pending: PendingSignIn = { codeChallenge, redirectUri: target }
    await this.redisClient.set(
      stateKey(state),
      JSON.stringify(pending),
      'EX',
      STATE_TTL_SECONDS
    )
    const url = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      include_granted_scopes: true,
      state
    })
    return { data: { url }, message: 'Lấy URL đăng nhập Google thành công' }
  }

  /**
   * The URL to send the browser to after Google: the client's redirect URI
   * with a one-time code, or with an error. An unknown, used or expired state
   * goes to the default redirect URI and Google is not called.
   */
  async callbackRedirect({ code, state }: { code?: string; state?: string }) {
    const fallback = this.allowedRedirectUris()[0] ?? ''
    const pendingJson = state
      ? ((await this.redisClient.eval(TAKE, 1, stateKey(state))) as string | null)
      : null
    if (!pendingJson || !code) {
      return this.withQuery(fallback, {
        errorMessage: this.i18nService.translate(AuthMessage.OAUTH_STATE_INVALID, 'vi')
      })
    }
    const pending = JSON.parse(pendingJson) as PendingSignIn
    try {
      const userId = await this.signInGoogleUser(await this.fetchGoogleProfile(code))
      const exchangeCode = randomBytes(32).toString('base64url')
      const issued: IssuedCode = { userId, codeChallenge: pending.codeChallenge }
      await this.redisClient.set(
        exchangeKey(exchangeCode),
        JSON.stringify(issued),
        'EX',
        EXCHANGE_TTL_SECONDS
      )
      return this.withQuery(pending.redirectUri, { code: exchangeCode })
    } catch (error) {
      this.logger.error(
        'Google sign-in failed',
        error instanceof Error ? error.name : 'error'
      )
      return this.withQuery(pending.redirectUri, {
        errorMessage:
          'Đã xảy ra lỗi khi đăng nhập bằng Google, vui lòng thử lại bằng cách khác'
      })
    }
  }

  async exchange(
    { code, codeVerifier }: GoogleExchangeBody,
    userAgent: string,
    ip: string,
    lang: string = 'vi'
  ) {
    const issuedJson = (await this.redisClient.eval(TAKE, 1, exchangeKey(code))) as
      | string
      | null
    if (!issuedJson) throw new ExchangeCodeInvalidException()
    const issued = JSON.parse(issuedJson) as IssuedCode
    if (s256(codeVerifier) !== issued.codeChallenge)
      throw new ExchangeCodeInvalidException()

    const user = await this.authRepository.findUniqueUserIncludeRole({
      id: issued.userId
    })
    if (!user) throw new ExchangeCodeInvalidException()
    const device = await this.authRepository.createDevice({
      userId: user.id,
      userAgent,
      ip
    })
    const tokens = await this.authService.generateTokens({
      userId: user.id,
      deviceId: device.id,
      roleId: user.roleId,
      roleName: user.role.name
    })
    return {
      data: tokens,
      message: this.i18nService.translate(AuthMessage.GOOGLE_EXCHANGE_SUCCESS, lang)
    }
  }

  // Google's authorization code -> the user's Google profile
  async fetchGoogleProfile(
    code: string
  ): Promise<{ email?: string | null; name?: string | null; picture?: string | null }> {
    const { tokens } = await this.oauth2Client.getToken(code)
    this.oauth2Client.setCredentials(tokens)
    const oauth2 = google.oauth2({ auth: this.oauth2Client, version: 'v2' })
    const { data } = await oauth2.userinfo.get()
    return data
  }

  // The account of this Google email; a new learner account the first time
  private async signInGoogleUser(profile: {
    email?: string | null
    name?: string | null
    picture?: string | null
  }): Promise<number> {
    if (!profile.email) throw new GoogleUserInfoException()
    const email = profile.email.trim().toLowerCase()
    const user = await this.authRepository.findUniqueUserIncludeRole({ email })
    if (user) return user.id

    const hashedPassword = await this.hashingService.hash(uuidv4())
    const roleId = await this.roleService.getCustomerRoleId()
    const created = await this.authRepository.createUserInclueRole({
      email,
      name: profile.name ?? '',
      password: hashedPassword,
      phoneNumber: '',
      roleId,
      avatar: profile.picture ?? null
    })
    await this.userProgressService.initUserProgress(created.id)
    await this.userTestService.initUserTests(created.id)
    return created.id
  }

  private withQuery(base: string, params: Record<string, string>) {
    const query = new URLSearchParams(params).toString()
    return `${base}${base.includes('?') ? '&' : '?'}${query}`
  }
}
