import { AppModule } from '@/app.module'
import { INestApplication, VersioningType } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Test } from '@nestjs/testing'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { patchNestJsSwagger } from 'nestjs-zod'

// The whole OpenAPI document must not change while schemas and DTOs are only
// moved or renamed (schema-dto-layout plan, gate of S0-S3). A real API change
// rewrites the file on purpose: UPDATE_OPENAPI=1 npm run test:e2e -- openapi-snapshot
const SNAPSHOT = join(__dirname, 'openapi.snapshot.json')

describe('OpenAPI document snapshot (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    patchNestJsSwagger()
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()
  })

  afterAll(async () => {
    await app?.close()
  })

  it('matches the committed document', () => {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('PokeNihongo')
        .setVersion('1.0')
        .addBearerAuth()
        .build()
    )
    const json = JSON.stringify(doc, null, 2) + '\n'
    if (process.env.UPDATE_OPENAPI === '1' || !existsSync(SNAPSHOT)) {
      writeFileSync(SNAPSHOT, json)
    }
    // Compared as text so property order counts too; on a mismatch the new
    // document is left next to the snapshot for `git diff --no-index`.
    const same = json === readFileSync(SNAPSHOT, 'utf8')
    if (!same) writeFileSync(SNAPSHOT.replace(/\.json$/, '.actual.json'), json)
    expect(same).toBe(true)
  })
})
