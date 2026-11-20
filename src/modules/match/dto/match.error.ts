import { MatchMessage } from '@/i18n/message-keys'
import { ConflictException } from '@nestjs/common'

export class MatchAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: MatchMessage.ALREADY_EXISTS,
      errorKey: MatchMessage.ALREADY_EXISTS
    })
  }
}

export class NotHaveActiveLeaderboardSeasonException extends ConflictException {
  constructor() {
    super({
      message: MatchMessage.NOT_HAVE_ACTIVE_LEADERBOARD_SEASON,
      errorKey: MatchMessage.NOT_HAVE_ACTIVE_LEADERBOARD_SEASON
    })
  }
}
