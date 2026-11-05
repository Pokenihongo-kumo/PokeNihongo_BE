import { AppModule } from '@/app.module'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger'

// The Swagger docs of /wordtype must describe what the API accepts and returns
// (they used to document a `tag` field the API rejects).
describe('WordType OpenAPI document (e2e)', () => {
  let app: INestApplication
  let doc: OpenAPIObject

  const schemaOf = (ref?: string) =>
    doc.components!.schemas![ref!.split('/').pop()!] as any
  const bodyOf = (path: string, method: 'post' | 'put') =>
    schemaOf(
      (doc.paths[path][method]!.requestBody as any).content['application/json'].schema
        .$ref
    )
  const okOf = (path: string, method: 'get' | 'post' | 'put', status = '200') =>
    schemaOf(
      (doc.paths[path][method]!.responses[status] as any).content['application/json']
        .schema.$ref
    )

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()
    doc = SwaggerModule.createDocument(app, new DocumentBuilder().build())
  })

  afterAll(async () => {
    await app?.close()
  })

  it('documents nameKey (not tag) for create and update bodies', () => {
    expect(Object.keys(bodyOf('/wordtype', 'post').properties)).toEqual(['id', 'nameKey'])
    expect(bodyOf('/wordtype', 'post').required).toEqual(['nameKey'])
    expect(Object.keys(bodyOf('/wordtype/{id}', 'put').properties)).toEqual(['nameKey'])
  })

  it('documents the real envelopes: detail data and list results + pagination', () => {
    const detail = okOf('/wordtype/{id}', 'get')
    expect(Object.keys(detail.properties)).toEqual(['statusCode', 'message', 'data'])
    expect(Object.keys(schemaOf(detail.properties.data.$ref).properties)).toEqual([
      'id',
      'nameKey',
      'createdAt',
      'updatedAt'
    ])

    const list = schemaOf(okOf('/wordtype', 'get').properties.data.$ref)
    expect(Object.keys(list.properties)).toEqual(['results', 'pagination'])
    expect(Object.keys(schemaOf(list.properties.pagination.$ref).properties)).toEqual([
      'current',
      'pageSize',
      'totalPage',
      'totalItem'
    ])
  })
})
