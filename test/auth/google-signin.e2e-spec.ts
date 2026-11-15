import { AppModule } from '@/app.module'
import envConfig from '@/config/env.config'
import { GoogleService } from '@/modules/auth/google.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { createHash, randomBytes } from 'crypto'
import request from 'supertest'
import { App } from 'supertest/types'
import { loginAsTestAdmin, TEST_ADMIN, TEST_USER_AGENT } from '../support/test-admin'

// Google sign-in (ADR D-auth §3). The callback used to redirect with
// ?accessToken=...&refreshToken=... and trusted an unsigned state. Now: a
// one-time state bound to the client's PKCE challenge, a one-time code in the
// redirect, tokens only from POST /auth/google/exchange with the verifier.
// Google is a test double (live-provider pending); no request leaves.
describe('Google sign-in exchange (e2e)', () => {
  let app: INestApplication<App>
  let profile: jest.SpyInstance
  const saved = {
    single: envConfig.GOOGLE_CLIENT_REDIRECT_URI,
    list: envConfig.GOOGLE_CLIENT_REDIRECT_URIS,
    clientId: envConfig.GOOGLE_CLIENT_ID
  }
  const WEB = 'https://app.example.test/auth/google'
  const NATIVE = 'pokenihongo://auth/google'

  const http = () => request.agent(app.getHttpServer()).set('User-Agent', TEST_USER_AGENT)
  const pkce = () => {
    const verifier = randomBytes(32).toString('base64url')
    return {
      verifier,
      challenge: createHash('sha256').update(verifier).digest('base64url')
    }
  }
  // google-link, then Google comes back to the callback with that state
  const signIn = async (challenge: string, redirectUri?: string) => {
    const link = await http()
      .get('/auth/google-link')
      .query({ codeChallenge: challenge, ...(redirectUri ? { redirectUri } : {}) })
    expect(link.status).toBe(200)
    const state = new URL(link.body.data.url).searchParams.get('state') as string
    const callback = await http()
      .get('/auth/google/callback')
      .query({ code: 'google-code', state })
    expect(callback.status).toBe(302)
    return { state, location: new URL(callback.headers.location) }
  }
  const exchange = (code: string | null, codeVerifier: string) =>
    http().post('/auth/google/exchange').send({ code, codeVerifier })

  beforeAll(async () => {
    envConfig.GOOGLE_CLIENT_REDIRECT_URI = WEB
    envConfig.GOOGLE_CLIENT_REDIRECT_URIS = NATIVE
    envConfig.GOOGLE_CLIENT_ID = envConfig.GOOGLE_CLIENT_ID || 'test-client-id'
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()
    await loginAsTestAdmin(app, [])
    profile = jest
      .spyOn(GoogleService.prototype, 'fetchGoogleProfile')
      .mockResolvedValue({ email: TEST_ADMIN.email.toUpperCase(), name: 'Admin' })
  })

  beforeEach(() => profile.mockClear())

  afterAll(async () => {
    jest.restoreAllMocks()
    envConfig.GOOGLE_CLIENT_REDIRECT_URI = saved.single
    envConfig.GOOGLE_CLIENT_REDIRECT_URIS = saved.list
    envConfig.GOOGLE_CLIENT_ID = saved.clientId
    await app?.close()
  })

  it('no token in any URL; the code and verifier give the tokens, once', async () => {
    const { verifier, challenge } = pkce()
    const { location } = await signIn(challenge)
    expect(`${location.origin}${location.pathname}`).toBe(WEB)
    expect(location.search).not.toMatch(/accessToken|refreshToken/)
    const code = location.searchParams.get('code')

    const first = await exchange(code, verifier)
    expect(first.status).toBe(200)
    expect(first.body.data).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String)
    })
    // the code works once
    expect((await exchange(code, verifier)).status).toBe(401)
  })

  it('a code without the right verifier gives nothing', async () => {
    const { challenge } = pkce()
    const { location } = await signIn(challenge)
    const code = location.searchParams.get('code')
    expect((await exchange(code, pkce().verifier)).status).toBe(401)
    // and the code is spent: no later attempt works
    expect((await exchange(code, 'x'.repeat(43))).status).toBe(401)
  })

  it('a state that was not issued, or is used twice, does not reach Google', async () => {
    const forged = await http()
      .get('/auth/google/callback')
      .query({
        code: 'google-code',
        state: Buffer.from('{"userAgent":"x"}').toString('base64')
      })
    expect(new URL(forged.headers.location).searchParams.has('code')).toBe(false)
    expect(profile).not.toHaveBeenCalled()

    const { state } = await signIn(pkce().challenge)
    profile.mockClear()
    const replay = await http()
      .get('/auth/google/callback')
      .query({ code: 'google-code', state })
    expect(new URL(replay.headers.location).searchParams.has('code')).toBe(false)
    expect(profile).not.toHaveBeenCalled()
  })

  it('only allowlisted redirect URIs', async () => {
    const { location } = await signIn(pkce().challenge, NATIVE)
    expect(`${location.protocol}//${location.host}${location.pathname}`).toBe(NATIVE)

    const evil = await http().get('/auth/google-link').query({
      codeChallenge: pkce().challenge,
      redirectUri: 'https://evil.example.test/'
    })
    expect(evil.status).toBe(422)
    expect((await http().get('/auth/google-link')).status).toBe(422)
  })

  it('an expired code is refused', async () => {
    const { verifier, challenge } = pkce()
    const { location } = await signIn(challenge)
    const code = location.searchParams.get('code') as string
    const redis = app.get('REDIS_CLIENT')
    await redis.del(`oauth_exchange:${createHash('sha256').update(code).digest('hex')}`)
    expect((await exchange(code, verifier)).status).toBe(401)
  })
})
