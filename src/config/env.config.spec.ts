import { productionDriverErrors } from './env.config'

// Fake integration drivers (integration-ports plan, D-IP2): fine in tests and
// local demo, refused when NODE_ENV=production so a fake never ships
describe('productionDriverErrors', () => {
  it('refuses MAIL_DRIVER=log in production', () => {
    expect(
      productionDriverErrors({ NODE_ENV: 'production', MAIL_DRIVER: 'log' })
    ).toEqual(['MAIL_DRIVER=log is not allowed in production'])
    expect(
      productionDriverErrors({ NODE_ENV: 'Production', MAIL_DRIVER: 'log' })
    ).toHaveLength(1)
  })

  it('allows the real driver in production and the log driver elsewhere', () => {
    expect(
      productionDriverErrors({ NODE_ENV: 'production', MAIL_DRIVER: 'smtp' })
    ).toEqual([])
    expect(productionDriverErrors({ NODE_ENV: 'test', MAIL_DRIVER: 'log' })).toEqual([])
    expect(productionDriverErrors({ NODE_ENV: undefined, MAIL_DRIVER: 'log' })).toEqual(
      []
    )
  })

  it('refuses STORAGE_DRIVER=local in production', () => {
    expect(
      productionDriverErrors({ NODE_ENV: 'production', STORAGE_DRIVER: 'local' })
    ).toEqual(['STORAGE_DRIVER=local is not allowed in production'])
    expect(
      productionDriverErrors({ NODE_ENV: 'production', STORAGE_DRIVER: 'cloudinary' })
    ).toEqual([])
  })

  it('refuses SPEECH_DRIVER=fake in production', () => {
    expect(
      productionDriverErrors({ NODE_ENV: 'production', SPEECH_DRIVER: 'fake' })
    ).toEqual(['SPEECH_DRIVER=fake is not allowed in production'])
    expect(
      productionDriverErrors({ NODE_ENV: 'production', SPEECH_DRIVER: 'google' })
    ).toEqual([])
  })
})
