import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { AuthRepo } from './auth.repo'

// Weekly removal of expired refresh tokens (ran inside the shop banner cron
// before; same schedule)
@Injectable()
export class RefreshTokenCleanupCronjob {
  private readonly logger = new Logger(RefreshTokenCleanupCronjob.name)
  constructor(private readonly authRepository: AuthRepo) {}

  @Cron(CronExpression.EVERY_WEEKEND)
  async handleCron() {
    const refreshTokens = await this.authRepository.deleteExpiredRefreshTokens()
    this.logger.debug(`Removed ${refreshTokens.count} expired refresh tokens!.`)
  }
}
