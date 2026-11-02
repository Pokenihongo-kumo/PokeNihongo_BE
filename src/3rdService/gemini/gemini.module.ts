import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { GeminiService } from './gemini.service'
import { GeminiController } from './gemini.controller'
import { VertexAIService } from './vertex-ai.service'
import { VertexAIController } from './vertex-ai.controller'
import geminiConfig from './config/gemini.config'
import { PrismaService } from '@/shared/services/prisma.service'
import { GeminiConfigModule } from '@/modules/gemini-config/gemini-config.module'
import { SpeechModule } from '../speech/speech.module'
import { SpeakingModule } from '@/modules/speaking/speaking.module'
import { UploadModule } from '../upload/upload.module'
import { DataAccessService } from '@/shared/services/data-access.service'
import { RedisModule } from '../redis/redis.module'

@Module({
  imports: [
    ConfigModule.forFeature(geminiConfig),
    GeminiConfigModule,
    SpeechModule,
    SpeakingModule,
    UploadModule,
    RedisModule
  ],
  controllers: [GeminiController, VertexAIController],
  providers: [GeminiService, VertexAIService, PrismaService, DataAccessService],
  exports: [GeminiService, VertexAIService]
})
export class GeminiModule {}
