import { RequestMethod, VersioningType } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { patchNestJsSwagger } from 'nestjs-zod'
import { AppModule } from './app.module'
import envConfig from './config/env.config'
import setupSwagger from './config/swagger.config'
import {
  LOCAL_FILES_PREFIX,
  localStorageDir
} from './infrastructure/integrations/storage/local-file-storage.adapter'
import { WebsocketAdapter } from './websockets/websocket.adapter'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  // STORAGE_DRIVER=local: stored files are served from this machine
  if (envConfig.STORAGE_DRIVER === 'local') {
    app.useStaticAssets(localStorageDir(), { prefix: LOCAL_FILES_PREFIX })
  }

  // Enable WebSocket adapter for authentication
  app.useWebSocketAdapter(new WebsocketAdapter(app))

  const corsOrigin = envConfig.APP_CORS_ORIGIN.split(',')
  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true
  })
  console.info('CORS Origin:', corsOrigin)

  patchNestJsSwagger()

  // Use global prefix if you don't have subdomain
  if (envConfig.API_PREFIX) {
    app.setGlobalPrefix(envConfig.API_PREFIX, {
      exclude: [
        { method: RequestMethod.GET, path: '/' },
        { method: RequestMethod.GET, path: 'health' }
      ]
    })
  }

  //version
  app.enableVersioning({
    type: VersioningType.URI
  })

  //swagger
  setupSwagger(app)

  await app.listen(envConfig.APP_PORT, '0.0.0.0')

  console.log(`
    ███╗   ██╗███████╗███████╗████████╗    ██████╗  ██████╗  ██████╗
    ████╗  ██║██╔════╝██╔════╝╚══██╔══╝    ██╔══██╗██╔═══██╗██╔═══██╗
    ██╔██╗ ██║█████╗  █████╗     ██║       ██████╔╝██║   ██║██║   ██║
    ██║╚██╗██║██╔══╝  ██╔══╝     ██║       ██╔══██╗██║   ██║██║   ██║
    ██║ ╚████║██║     ███████╗   ██║       ██████╔╝╚██████╔╝╚██████╔╝
    ╚═╝  ╚═══╝╚═╝     ╚══════╝   ╚═╝       ╚═════╝  ╚═════╝  ╚═════╝

    🌟 Your NestJS app is now running! 🌟
    🛠️  Built with TypeScript & NestJS
    `)

  console.info(`Server running on ${await app.getUrl()}`)

  return app
}
bootstrap()
