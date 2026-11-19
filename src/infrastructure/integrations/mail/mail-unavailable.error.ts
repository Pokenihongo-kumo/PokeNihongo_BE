import { MailMessage } from '@/i18n/message-keys'
import { ServiceUnavailableException } from '@nestjs/common'

// The mail provider refused or could not be reached. The request that needed
// the mail (an OTP) cannot go on; nothing was sent
export class MailUnavailableException extends ServiceUnavailableException {
  constructor() {
    super({ message: MailMessage.UNAVAILABLE, errorKey: MailMessage.UNAVAILABLE })
  }
}
