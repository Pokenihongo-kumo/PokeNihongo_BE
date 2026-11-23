import { UnprocessableEntityException } from '@nestjs/common'
import { PermissionMessage } from '@/i18n/message-keys'

export class PermissionAlreadyExistsException extends UnprocessableEntityException {
  constructor() {
    super({
      message: 'Permission already exists',
      errorKey: PermissionMessage.ALREADY_EXISTS
    })
  }
}
