import { UserSubscriptionModule } from '@/modules/user-subscription/user-subscription.module'
import { LlmModule } from '@/infrastructure/integrations/ai/llm.module'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { GeminiService } from './gemini.service'
import { GeminiController } from './gemini.controller'
import geminiConfig from './config/gemini.config'
import { PrismaService } from '@/shared/services/prisma.service'
import { GeminiConfigModule } from '@/modules/gemini-config/gemini-config.module'
import { SpeechModule } from '@/modules/speech/speech.module'
import { SpeakingModule } from '@/modules/speaking/speaking.module'
import { UploadModule } from '@/modules/upload/upload.module'
import { DataAccessService } from '@/shared/services/data-access.service'
import { RedisModule } from '@/infrastructure/redis/redis.module'

@Module({
  imports: [
    UserSubscriptionModule,
    LlmModule,
    ConfigModule.forFeature(geminiConfig),
    GeminiConfigModule,
    SpeechModule,
    SpeakingModule,
    UploadModule,
    RedisModule
  ],
  controllers: [GeminiController],
  providers: [GeminiService, PrismaService, DataAccessService],
  exports: [GeminiService]
})
export class GeminiModule {}
