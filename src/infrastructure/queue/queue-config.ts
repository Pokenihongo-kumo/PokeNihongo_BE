export const DEFAULT_REDIS_PORT = 6379

export type RedisConnectionOptions = {
  host: string
  port: number
  username?: string
  password?: string
  db?: number
  tls?: { rejectUnauthorized: boolean }
}

// Bull's `redis` option does not read credentials or the DB index from a URL,
// so the URL is split into explicit connection options here.
export function parseRedisUrl(uri: string): RedisConnectionOptions {
  let url: URL
  try {
    url = new URL(uri)
  } catch {
    throw new Error('Redis URL is not a valid URL')
  }

  if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
    throw new Error(`Unsupported Redis URL protocol: ${url.protocol}`)
  }

  const options: RedisConnectionOptions = {
    host: url.hostname,
    port: url.port ? parsePort(url.port) : DEFAULT_REDIS_PORT
  }

  // WHATWG URL keeps userinfo percent-encoded; decode exactly once.
  if (url.username) options.username = decodeURIComponent(url.username)
  if (url.password) options.password = decodeURIComponent(url.password)

  const dbPath = url.pathname.replace(/^\//, '')
  if (dbPath) options.db = parseDbIndex(dbPath)

  if (url.protocol === 'rediss:') options.tls = { rejectUnauthorized: false }

  return options
}

function parsePort(value: string): number {
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid Redis port: ${value}`)
  }
  return port
}

function parseDbIndex(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid Redis DB index: ${value}`)
  }
  return Number(value)
}

// In tests, refuse to start a queue that could touch the app's jobs: the final
// options (after caller overrides) must use a test prefix and a non-default DB.
export function assertTestQueueIsolation(
  queueName: string,
  options: { prefix?: string; redis?: { db?: number } }
): void {
  if (process.env.NODE_ENV !== 'test') return

  if (!options.prefix?.startsWith('bull_test')) {
    throw new Error(
      `Queue "${queueName}" must use a QUEUE_PREFIX starting with "bull_test" in tests`
    )
  }
  if (!options.redis?.db) {
    throw new Error(
      `Queue "${queueName}" must use a non-default Redis DB index in tests (e.g. redis://host:6379/15)`
    )
  }
}
