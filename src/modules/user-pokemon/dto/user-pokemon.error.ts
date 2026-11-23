import { UserPokemonMessage } from '@/i18n/message-keys'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

export class UserPokemonNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: UserPokemonMessage.NOT_FOUND,
      errorKey: UserPokemonMessage.NOT_FOUND
    })
  }
}

export class NicknameAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: UserPokemonMessage.NICKNAME_ALREADY_EXISTS,
      errorKey: UserPokemonMessage.NICKNAME_ALREADY_EXISTS
    })
  }
}

export class ErrorInitLevelPokemonException extends BadRequestException {
  constructor() {
    super({
      message: UserPokemonMessage.ERROR_INIT_LEVEL,
      errorKey: UserPokemonMessage.ERROR_INIT_LEVEL
    })
  }
}

export class InvalidUserAccessPokemonException extends BadRequestException {
  constructor() {
    super({
      message: UserPokemonMessage.INVALID_ACCESS_POKEMON,
      errorKey: UserPokemonMessage.INVALID_ACCESS_POKEMON
    })
  }
}

export class UserHasPokemonException extends ConflictException {
  constructor() {
    super({
      message: UserPokemonMessage.USER_HAS_POKEMON,
      errorKey: UserPokemonMessage.USER_HAS_POKEMON
    })
  }
}

export class UserNotInRoundException extends BadRequestException {
  constructor() {
    super({
      message: UserPokemonMessage.USER_NOT_IN_ROUND,
      errorKey: UserPokemonMessage.USER_NOT_IN_ROUND
    })
  }
}
