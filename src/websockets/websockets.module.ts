import { UserSubscriptionModule } from '@/modules/user-subscription/user-subscription.module'
import { LlmModule } from '@/infrastructure/integrations/ai/llm.module'
import { UserCoreModule } from '@/modules/user/user-core.module'
import { BullQueueModule } from '@/infrastructure/queue/bull-queue.module'
import { SpeechModule } from '@/modules/speech/speech.module'
import { UploadModule } from '@/modules/upload/upload.module'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { InitializerGateway } from './initializer.gateway'

import { MatchingGateway } from './matching.gateway'
import { UserGateway } from './user.gateway'
import { SocketServerService } from './socket-server.service'
import { WebsocketsService } from './websockets.service'

import { AIConversationRoomModule } from '@/modules/ai-conversation-room/ai-conversation-room.module'
import { UserAIConversationModule } from '@/modules/user-ai-conversation/user-ai-conversation.module'
import { GeminiConfigModule } from '@/modules/gemini-config/gemini-config.module'
import { KaiwaProcessor } from '../shared/workers/kaiwa.processor'
import { KaiwaGateway } from './kaiwa.gateway'
import { KaiwaAiService } from './kaiwa/kaiwa-ai.service'
import { KaiwaAudioService } from './kaiwa/kaiwa-audio.service'

// @Global()
@Module({
  imports: [
    UserSubscriptionModule,
    LlmModule, // kaiwa gateway and processor call the model through LlmClient
    UserCoreModule,
    BullQueueModule.registerQueue('kaiwa-processor', {
      // Tối ưu queue settings cho performance
      defaultJobOptions: {
        removeOnComplete: 10, // Giữ 10 jobs gần nhất
        removeOnFail: 50, // Giữ 50 failed jobs để debug
        attempts: 2, // Retry 2 lần nếu fail
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      },
      settings: {
        stalledInterval: 30000, // Check stalled jobs mỗi 30s
        maxStalledCount: 1 // Chỉ retry 1 lần nếu stalled
      }
    }),
    ConfigModule, // Cần để inject ConfigService
    UploadModule, // Cần cho TextToSpeechService
    SpeechModule, // Cần cho SpeechToTextService và TextToSpeechService
    UserAIConversationModule, // Cần để lưu conversation vào database
    AIConversationRoomModule, // Cần để quản lý phòng hội thoại
    GeminiConfigModule // Gemini config from the DB (GeminiConfigService); no cycle
    // MatchRoundModule
  ],
  providers: [
    WebsocketsService,
    SocketServerService,
    InitializerGateway,
    MatchingGateway,
    UserGateway,
    KaiwaGateway,
    KaiwaAiService, // kaiwa AI calls, no socket (phase 6 X7)
    KaiwaAudioService, // kaiwa audio decode/convert/upload (phase 6 X7)
    KaiwaProcessor // Processor để xử lý background jobs (optional, có thể dùng sau)
  ],
  exports: [
    WebsocketsService,
    SocketServerService,
    MatchingGateway,
    UserGateway,
    KaiwaGateway
  ]
})
export class WebsocketsModule {}
