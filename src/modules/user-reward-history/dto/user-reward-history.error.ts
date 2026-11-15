import { UserRewardHistoryMessage } from '@/i18n/message-keys'
import { BadRequestException, NotFoundException } from '@nestjs/common'

// These used to be single shared HttpException instances with a Vietnamese
// message in every language; now classes with keys the filter translates

export class UserRewardHistoryNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: UserRewardHistoryMessage.NOT_FOUND,
      errorKey: UserRewardHistoryMessage.NOT_FOUND
    })
  }
}

export class InvalidUserRewardHistoryDataException extends BadRequestException {
  constructor() {
    super({
      message: UserRewardHistoryMessage.INVALID_DATA,
      errorKey: UserRewardHistoryMessage.INVALID_DATA
    })
  }
}
