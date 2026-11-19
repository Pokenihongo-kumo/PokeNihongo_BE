import envConfig from '@/config/env.config'
import { INestApplication } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

function setupSwagger(app: INestApplication) {
  const appName = envConfig.APP_NAME
  const url = envConfig.APP_URL

  const config = new DocumentBuilder()
    .setTitle(appName)
    .setDescription('The ' + appName + ' API description')
    .setVersion('1.0')
    .addBearerAuth()
  // .addApiKey({ type: 'apiKey', name: 'Api-Key', in: 'header' }, 'Api-Key')

  if (url) {
    config.addServer(url)
  }

  const configBuilt = config.build()
  const document = SwaggerModule.createDocument(app, configBuilt, {
    extraModels: [] // Có thể thêm các models bổ sung nếu cần
  })

  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: appName,
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: '-method',
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true
    },
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .scheme-container { background: #fafafa; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
    `
  })
}

export default setupSwagger
