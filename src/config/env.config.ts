import { config } from 'dotenv'
import { z } from 'zod'

if (process.env.NODE_ENV !== 'production') {
  console.log('Running in development mode, loading .env file...')
  config({ path: '.env' })
}

const configSchema = z.object({
  //Application
  APP_NAME: z.string().default('My App'),
  APP_URL: z.string().optional(),
  APP_PORT: z.coerce.number().default(4000),
  API_PREFIX: z.string().optional(),
  APP_CORS_ORIGIN: z.string().default('*'),
  //Database
  DATABASE_URL: z.string(),
  ACCESS_TOKEN_SECRET: z.string(),
  ACCESS_TOKEN_EXPIRES_IN: z.string(),
  REFRESH_TOKEN_SECRET: z.string(),
  REFRESH_TOKEN_EXPIRES_IN: z.string(),
  SECRET_API_KEY: z.string(),
  ADMIN_NAME: z.string(),
  ADMIN_PASSWORD: z.string(),
  ADMIN_EMAIL: z.string(),
  PHONE_NUMBER: z.string(),
  OTP_EXPIRES_IN: z.string(),
  //Redis
  REDIS_URI: z.string(),
  REDIS_MATCH_URI: z.string().optional(), // Redis riêng cho match (fallback về REDIS_URI nếu không có)
  // RESEND_API_KEY: z.string(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  GOOGLE_CLIENT_REDIRECT_URI: z.string().optional(),
  // Comma-separated client redirect URIs allowed for Google sign-in, besides
  // GOOGLE_CLIENT_REDIRECT_URI (ADR D-auth §3)
  GOOGLE_CLIENT_REDIRECT_URIS: z.string().optional(),
  FE_URL: z.string().url().optional(),
  MO_URL: z.string().optional(),

  //Google Cloud Text-to-Speech (Optional)
  // SPEECH_DRIVER=fake: deterministic speech without Google (tests, local
  // demo); refused in production (integration-ports plan I4, D-IP2)
  SPEECH_DRIVER: z.enum(['google', 'fake']).default('google'),
  GOOGLE_CLOUD_PROJECT_ID: z.string().optional(),
  GOOGLE_CLOUD_CLIENT_EMAIL: z.string().optional(),
  GOOGLE_CLOUD_PRIVATE_KEY: z.string().optional(),

  // Gemini AI (Optional - có thể dùng API key hoặc service account)
  GEMINI_API_KEY: z.string().optional(),
  // Gemini Flash API Key (Optional - riêng cho Flash models)
  GEMINI_FLASH_API_KEY: z.string().optional(),

  // Mail. MAIL_DRIVER=log writes a log line instead of sending (tests, local
  // demo); refused in production (integration-ports plan I1, D-IP2)
  MAIL_DRIVER: z.enum(['smtp', 'log']).default('smtp'),
  MAIL_HOST: z.string().optional(),
  MAIL_PORT: z.coerce.number().optional(),
  MAIL_USER: z.string().optional(),
  MAIL_PASSWORD: z.string().optional(),

  // Files. STORAGE_DRIVER=local keeps files on this machine (tests, local
  // demo); refused in production (integration-ports plan I3, D-IP2)
  STORAGE_DRIVER: z.enum(['cloudinary', 'local']).default('cloudinary'),
  LOCAL_STORAGE_DIR: z.string().optional(),

  //PAYOS
  PAYOS_CLIENT_ID: z.string().optional(),
  PAYOS_API_KEY: z.string().optional(),
  PAYOS_CHECKSUM_KEY: z.string().optional(),

  //Firebase Cloud Messaging
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(), // Store with escaped newlines (\n)
  FIREBASE_PRIVATE_KEY_ID: z.string().optional() // Optional (not required for initialization)
})

// A fake integration driver must never run in production
export const productionDriverErrors = (env: {
  NODE_ENV?: string
  MAIL_DRIVER?: string
  STORAGE_DRIVER?: string
  SPEECH_DRIVER?: string
}): string[] => {
  const production = (env.NODE_ENV ?? '').toLowerCase() === 'production'
  const errors: string[] = []
  if (production && env.SPEECH_DRIVER === 'fake')
    errors.push('SPEECH_DRIVER=fake is not allowed in production')
  if (production && env.STORAGE_DRIVER === 'local')
    errors.push('STORAGE_DRIVER=local is not allowed in production')
  if (production && env.MAIL_DRIVER === 'log')
    errors.push('MAIL_DRIVER=log is not allowed in production')
  return errors
}

const configServer = configSchema.safeParse(process.env)

if (!configServer.success) {
  console.error('Invalid environment variables')
  console.error(configServer.error.format())
  process.exit(1)
}

const driverErrors = productionDriverErrors({
  ...configServer.data,
  NODE_ENV: process.env.NODE_ENV
})
if (driverErrors.length > 0) {
  console.error('Invalid environment variables')
  driverErrors.forEach((message) => console.error(message))
  process.exit(1)
}

const envConfig = configServer.data

export default envConfig
