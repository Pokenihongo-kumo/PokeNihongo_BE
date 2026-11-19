import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { MatchQueueService } from './match-queue.service'

@Injectable()
export class HandleMatchmakingCronjob {
  private readonly logger = new Logger(HandleMatchmakingCronjob.name)

  constructor(private matchQueueService: MatchQueueService) {}

  // Chạy mỗi 5 giây
  @Cron('*/5 * * * * *')
  async runMatchmaking() {
    try {
      // this.logger.debug('[Matchmaking Cronjob] Running matchmaking process...')
      await this.matchQueueService.handleMatchmakingRun()
    } catch (error) {
      // this.logger.error('[Matchmaking Cronjob] Error during matchmaking:', error)
    }
  }
}
