import { ForbiddenException, UnprocessableEntityException } from '@nestjs/common'
import { RoleMessage } from '@/i18n/message-keys'

export class RoleAlreadyExistsException extends UnprocessableEntityException {
  constructor() {
    super({
      message: 'Role already exists',
      errorKey: RoleMessage.ALREADY_EXISTS
    })
  }
}

export class ProhibitedActionOnBaseRoleException extends ForbiddenException {
  constructor() {
    super({
      message: 'Cannot perform this action on base role',
      errorKey: RoleMessage.PROHIBITED_ACTION_ON_BASE_ROLE
    })
  }
}
