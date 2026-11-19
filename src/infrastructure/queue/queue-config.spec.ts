import { assertTestQueueIsolation, parseRedisUrl } from './queue-config'

describe('parseRedisUrl', () => {
  it('defaults the port to 6379 when the URL has none', () => {
    expect(parseRedisUrl('redis://localhost')).toEqual({ host: 'localhost', port: 6379 })
  })

  it('keeps an explicit port', () => {
    expect(parseRedisUrl('redis://10.0.0.5:6380')).toEqual({
      host: '10.0.0.5',
      port: 6380
    })
  })

  it('passes the ACL username and password', () => {
    expect(parseRedisUrl('redis://worker:s3cret@cache.local:6379')).toEqual({
      host: 'cache.local',
      port: 6379,
      username: 'worker',
      password: 's3cret'
    })
  })

  it('supports password-only auth', () => {
    expect(parseRedisUrl('redis://:s3cret@cache.local:6379')).toEqual({
      host: 'cache.local',
      port: 6379,
      password: 's3cret'
    })
  })

  it('decodes percent-encoded credentials exactly once', () => {
    const result = parseRedisUrl('redis://us%40er:p%40ss%2525word@cache.local')
    expect(result.username).toBe('us@er')
    expect(result.password).toBe('p@ss%25word')
  })

  it('reads the DB index from the path', () => {
    expect(parseRedisUrl('redis://localhost:6379/15').db).toBe(15)
    expect(parseRedisUrl('redis://localhost:6379/0').db).toBe(0)
  })

  it('leaves db unset when the path is empty', () => {
    expect(parseRedisUrl('redis://localhost:6379/')).not.toHaveProperty('db')
  })

  it('rejects an invalid DB index', () => {
    expect(() => parseRedisUrl('redis://localhost:6379/abc')).toThrow(
      'Invalid Redis DB index'
    )
    expect(() => parseRedisUrl('redis://localhost:6379/1/2')).toThrow(
      'Invalid Redis DB index'
    )
  })

  it('enables TLS only for rediss://', () => {
    expect(parseRedisUrl('rediss://cache.local:6380').tls).toEqual({
      rejectUnauthorized: false
    })
    expect(parseRedisUrl('redis://cache.local:6380')).not.toHaveProperty('tls')
  })

  it('rejects other protocols and malformed URLs', () => {
    expect(() => parseRedisUrl('http://localhost:6379')).toThrow('Unsupported Redis URL')
    expect(() => parseRedisUrl('not a url')).toThrow('not a valid URL')
  })
})

describe('assertTestQueueIsolation', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  it('does nothing outside tests', () => {
    process.env.NODE_ENV = 'production'
    expect(() =>
      assertTestQueueIsolation('q', { prefix: 'bull_production', redis: {} })
    ).not.toThrow()
  })

  it('accepts a test prefix with a non-default DB', () => {
    process.env.NODE_ENV = 'test'
    expect(() =>
      assertTestQueueIsolation('q', { prefix: 'bull_test_run1', redis: { db: 15 } })
    ).not.toThrow()
  })

  it('rejects the app prefix in tests', () => {
    process.env.NODE_ENV = 'test'
    expect(() =>
      assertTestQueueIsolation('q', { prefix: 'bull_production', redis: { db: 15 } })
    ).toThrow('QUEUE_PREFIX')
  })

  it('rejects the default DB 0 or a missing DB in tests', () => {
    process.env.NODE_ENV = 'test'
    expect(() =>
      assertTestQueueIsolation('q', { prefix: 'bull_test', redis: { db: 0 } })
    ).toThrow('Redis DB index')
    expect(() =>
      assertTestQueueIsolation('q', { prefix: 'bull_test', redis: {} })
    ).toThrow('Redis DB index')
  })
})
