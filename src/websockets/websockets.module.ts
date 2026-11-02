import { BullQueueModule } from '@/3rdService/bull/bull-queue.module'
import { SpeechModule } from '@/3rdService/speech/speech.module'
import { UploadModule } from '@/3rdService/upload/upload.module'
import { Module, forwardRef } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { InitializerGateway } from './initializer.gateway'

import { MatchingGateway } from './matching.gateway'
import { SocketServerService } from './socket-server.service'
import { WebsocketsService } from './websockets.service'

import { AIConversationRoomModule } from '@/modules/ai-conversation-room/ai-conversation-room.module'
import { UserAIConversationModule } from '@/modules/user-ai-conversation/user-ai-conversation.module'
import { GeminiConfigModule } from '@/modules/gemini-config/gemini-config.module'
import { KaiwaProcessor } from '../shared/workers/kaiwa.processor'
import { KaiwaGateway } from './kaiwa.gateway'

// @Global()
@Module({
  imports: [
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
    forwardRef(() => GeminiConfigModule) // Cần để lấy Gemini config từ DB (forwardRef để tránh circular dependency)
    // MatchRoundModule
  ],
  providers: [
    WebsocketsService,
    SocketServerService,
    InitializerGateway,
    MatchingGateway,
    KaiwaGateway,
    KaiwaProcessor // Processor để xử lý background jobs (optional, có thể dùng sau)
  ],
  exports: [WebsocketsService, SocketServerService, MatchingGateway, KaiwaGateway]
})
export class WebsocketsModule {}
