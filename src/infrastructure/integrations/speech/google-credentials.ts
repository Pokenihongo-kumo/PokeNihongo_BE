import { ConfigService } from '@nestjs/config'

// One way to build Google Cloud client options for every Google speech client
// (integration-ports plan I4; replaces the four branches of the old
// createSpeechClient and the separate set-up in TextToSpeechService). In
// order: service account fields, a JSON credentials string, a key file, the
// default credentials when GOOGLE_USE_DEFAULT_CREDENTIALS is set; otherwise
// it throws (the adapter then reports itself unavailable).
export interface GoogleClientOptions {
  [key: string]: string | number | object | undefined
  credentials?: Record<string, unknown>
  projectId?: string
  keyFilename?: string
}

export const googleClientOptions = (config: ConfigService): GoogleClientOptions => {
  const clientEmail = config.get<string>('GOOGLE_CLOUD_CLIENT_EMAIL')
  const privateKey = config.get<string>('GOOGLE_CLOUD_PRIVATE_KEY')
  const projectId = config.get<string>('GOOGLE_CLOUD_PROJECT_ID')

  if (clientEmail && privateKey && projectId) {
    return {
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
        project_id: projectId
      },
      projectId
    }
  }

  const json = config.get<string>('GOOGLE_CLOUD_CREDENTIALS')
  if (json) {
    let credentials: Record<string, unknown>
    try {
      credentials = JSON.parse(json)
    } catch {
      throw new Error('Invalid Google Cloud credentials format')
    }
    return { credentials, projectId: projectId || (credentials.project_id as string) }
  }

  const keyFilename = config.get<string>('GOOGLE_APPLICATION_CREDENTIALS')
  if (keyFilename) return { keyFilename, projectId }

  if (config.get<boolean>('GOOGLE_USE_DEFAULT_CREDENTIALS', false)) return {}

  throw new Error(
    'Google Cloud credentials not configured. Please set GOOGLE_CLOUD_CLIENT_EMAIL, GOOGLE_CLOUD_PRIVATE_KEY, and GOOGLE_CLOUD_PROJECT_ID in .env'
  )
}
