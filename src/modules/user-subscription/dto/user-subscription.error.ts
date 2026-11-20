import { UserSubscriptionMessage } from '@/i18n/message-keys'
import { ConflictException, NotFoundException } from '@nestjs/common'

export class UserSubscriptionNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: UserSubscriptionMessage.NOT_FOUND,
      errorKey: UserSubscriptionMessage.NOT_FOUND
    })
  }
}

export class UserHasSubscriptionWithStatusActiveException extends ConflictException {
  constructor() {
    super({
      message: UserSubscriptionMessage.HAS_ACTIVE_SUBSCRIPTION,
      errorKey: UserSubscriptionMessage.HAS_ACTIVE_SUBSCRIPTION
    })
  }
}

export class UserHasSubscriptionWithStatusPendingPaymentException extends ConflictException {
  constructor(data?: any, dataRes?: any) {
    super({
      message: UserSubscriptionMessage.HAS_PAYMENT_PENDING_SUBSCRIPTION,
      errorKey: UserSubscriptionMessage.HAS_PAYMENT_PENDING_SUBSCRIPTION,
      data: data || null,
      dataRes: dataRes || null
    })
  }
}
