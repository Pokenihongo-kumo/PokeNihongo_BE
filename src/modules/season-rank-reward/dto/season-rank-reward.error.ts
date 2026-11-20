import { SeasonRankRewardMessage } from '@/i18n/message-keys'
import { ConflictException, NotFoundException } from '@nestjs/common'

export class SeasonRankRewardNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: SeasonRankRewardMessage.NOT_FOUND,
      errorKey: SeasonRankRewardMessage.NOT_FOUND
    })
  }
}

export class SeasonRnakRewardNameInvalidException extends ConflictException {
  constructor() {
    super({
      message: SeasonRankRewardMessage.RANK_NAME_INVALID,
      errorKey: SeasonRankRewardMessage.RANK_NAME_INVALID
    })
  }
}

export class SeasonRnakRewardOrderInvalidException extends ConflictException {
  constructor() {
    super({
      message: SeasonRankRewardMessage.RANK_ORDER_INVALID,
      errorKey: SeasonRankRewardMessage.RANK_ORDER_INVALID
    })
  }
}

export class MissingSeasonRankRewardOrderInvalidException extends ConflictException {
  constructor(data?: string) {
    super({
      message: SeasonRankRewardMessage.RANK_ORDER_INVALID,
      errorKey: SeasonRankRewardMessage.RANK_ORDER_INVALID,
      data: data || null
    })
  }
}
