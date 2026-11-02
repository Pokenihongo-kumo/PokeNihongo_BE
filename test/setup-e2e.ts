import { config } from 'dotenv'
import { existsSync } from 'fs'
import { resolve } from 'path'
import { parseRedisUrl } from '../src/3rdService/bull/queue-config'

// Runs before every e2e test file, before the app modules are imported.
// It loads .env.test and refuses to continue unless every target is a test one,
// so a run can never write to the demo database or consume the app's jobs.

const envFile = resolve(__dirname, '..', '.env.test')
if (!existsSync(envFile)) {
  throw new Error(
    'Missing .env.test: copy .env.test.example and point it at the test Postgres/Redis'
  )
}

// override: values in .env.test win over anything already in the shell.
// Keys listed in .env.test (even empty) are never filled from .env afterwards.
config({ path: envFile, override: true })
process.env.NODE_ENV = 'test'

function requireTestDatabase(name: string, value: string | undefined) {
  if (!value) throw new Error(`${name} is not set in .env.test`)
  const dbName = new URL(value).pathname.replace(/^\//, '')
  if (!dbName.endsWith('_test')) {
    throw new Error(
      `${name} must point at a database ending in "_test" (got "${dbName}")`
    )
  }
}

function requireTestRedis(name: string, value: string | undefined) {
  if (!value) throw new Error(`${name} is not set in .env.test`)
  const { db } = parseRedisUrl(value)
  if (!db) {
    throw new Error(
      `${name} must select a non-default Redis DB, e.g. redis://localhost:6379/15`
    )
  }
}

requireTestDatabase('DATABASE_URL', process.env.DATABASE_URL)
requireTestRedis('REDIS_URI', process.env.REDIS_URI)
if (process.env.REDIS_MATCH_URI) {
  requireTestRedis('REDIS_MATCH_URI', process.env.REDIS_MATCH_URI)
}
if (!process.env.QUEUE_PREFIX?.startsWith('bull_test')) {
  throw new Error('QUEUE_PREFIX must start with "bull_test" in .env.test')
}
