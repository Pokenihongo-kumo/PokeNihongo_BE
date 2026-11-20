import { UserSeasonHistoryMessage } from '@/i18n/message-keys'
import { ConflictException, NotFoundException } from '@nestjs/common'

export class UserSeasonHistoryNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: UserSeasonHistoryMessage.NOT_FOUND,
      errorKey: UserSeasonHistoryMessage.NOT_FOUND
    })
  }
}

export class UserCanNotClaimRewardsException extends ConflictException {
  constructor() {
    super({
      message: UserSeasonHistoryMessage.CAN_NOT_CLAIM_REWARDS,
      errorKey: UserSeasonHistoryMessage.CAN_NOT_CLAIM_REWARDS
    })
  }
}

export class UserNotHaveRewardsToClaimException extends ConflictException {
  constructor() {
    super({
      message: UserSeasonHistoryMessage.CAN_NOT_CLAIM_REWARDS,
      errorKey: UserSeasonHistoryMessage.CAN_NOT_CLAIM_REWARDS
    })
  }
}
