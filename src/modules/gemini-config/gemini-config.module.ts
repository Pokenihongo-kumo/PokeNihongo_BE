import { Module } from '@nestjs/common'
import { LanguagesModule } from '../languages/languages.module'
import { TranslationModule } from '../translation/translation.module'
import { GeminiConfigController } from './gemini-config.controller'
import { GeminiServiceConfigController } from './ConfigService/gemini-service-config.controller'
import { GeminiConfigRepo, GeminiPresetRepo } from './gemini-config.repo'
import { GeminiConfigService } from './gemini-config.service'
import { SchemaIntrospectService } from './schema-introspect.service'

@Module({
  imports: [LanguagesModule, TranslationModule],
  controllers: [GeminiConfigController, GeminiServiceConfigController],
  providers: [
    GeminiConfigService,
    GeminiConfigRepo,
    GeminiPresetRepo,
    SchemaIntrospectService
  ],
  exports: [
    GeminiConfigService,
    GeminiConfigRepo,
    GeminiPresetRepo,
    SchemaIntrospectService
  ]
})
export class GeminiConfigModule {}
