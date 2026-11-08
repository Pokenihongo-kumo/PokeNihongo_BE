import { AttendenceConfigMessage } from '@/i18n/message-keys'
import { ConflictException } from '@nestjs/common'

export class AttendenceConfigAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: AttendenceConfigMessage.ALREADY_EXISTS,
      errorKey: AttendenceConfigMessage.ALREADY_EXISTS
    })
  }
}
