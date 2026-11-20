import { NotificationMessage } from '@/i18n/message-keys'
import { NotFoundException } from '@nestjs/common'

export class NotificationNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: NotificationMessage.NOT_FOUND,
      errorKey: NotificationMessage.NOT_FOUND
    })
  }
}
