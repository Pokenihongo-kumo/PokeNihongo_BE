import { GachaRollHistoryMessage } from '@/i18n/message-keys'
import { NotFoundException } from '@nestjs/common'

export class GachaRollHistoryNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: GachaRollHistoryMessage.NOT_FOUND,
      errorKey: GachaRollHistoryMessage.NOT_FOUND
    })
  }
}
