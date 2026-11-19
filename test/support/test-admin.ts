import { RoleName } from '@/common/constants/role.constant'
import { HashingService } from '@/shared/services/hashing.service'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { App } from 'supertest/types'

export const TEST_ADMIN = {
  email: 'contract-admin@example.test',
  password: 'Contract#1234'
}

export const TEST_USER_AGENT = 'pokenihongo-contract-test'

export type TestRoute = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  // Express route pattern as AccessTokenGuard reads it, e.g. '/languages/:id'
  path: string
}

// Seeds (idempotently) the admin role, level 1, a test admin user and the
// permissions for `routes`, then logs in and returns an access token.
// Only ever runs against the test database (enforced by test/setup-e2e.ts).
export async function loginAsTestAdmin(
  app: INestApplication<App>,
  routes: TestRoute[]
): Promise<string> {
  const prisma = app.get(PrismaService)
  const hashing = app.get(HashingService)

  const role =
    (await prisma.role.findFirst({ where: { name: RoleName.Admin, deletedAt: null } })) ??
    (await prisma.role.create({ data: { name: RoleName.Admin } }))

  const level = await prisma.level.upsert({
    where: { levelNumber_levelType: { levelNumber: 1, levelType: 'USER' } },
    update: {},
    create: { levelNumber: 1, requiredExp: 0, levelType: 'USER' }
  })

  for (const route of routes) {
    const permission =
      (await prisma.permission.findFirst({
        where: { path: route.path, method: route.method, deletedAt: null }
      })) ??
      (await prisma.permission.create({
        data: {
          name: `${route.method} ${route.path}`,
          path: route.path,
          method: route.method
        }
      }))
    await prisma.role.update({
      where: { id: role.id },
      data: { permissions: { connect: { id: permission.id } } }
    })
  }

  const password = await hashing.hash(TEST_ADMIN.password)
  await prisma.user.upsert({
    where: { email: TEST_ADMIN.email },
    update: { password, roleId: role.id, status: 'ACTIVE' },
    create: {
      email: TEST_ADMIN.email,
      password,
      name: 'Contract Admin',
      roleId: role.id,
      levelId: level.id,
      status: 'ACTIVE'
    }
  })

  // Login stores a Device keyed by user agent + IP; check-email treats that
  // pair as a known device, so contract tests reuse the same User-Agent.
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .set('User-Agent', TEST_USER_AGENT)
    .send(TEST_ADMIN)
  if (res.status !== 200) {
    throw new Error(`Test admin login failed: ${res.status} ${JSON.stringify(res.body)}`)
  }
  return res.body.data.accessToken
}
