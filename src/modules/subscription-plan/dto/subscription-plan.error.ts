import { SubscriptionPlanMessage } from '@/i18n/message-keys'
import { NotFoundException } from '@nestjs/common'

export class SubscriptionPlanNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: SubscriptionPlanMessage.NOT_FOUND,
      errorKey: SubscriptionPlanMessage.NOT_FOUND
    })
  }
}
