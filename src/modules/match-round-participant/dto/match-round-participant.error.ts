import { MatchingSocketMessage, MatchRoundParticipantMessage } from '@/i18n/message-keys'
import { BadRequestException, NotFoundException } from '@nestjs/common'

export class MatchRoundParticipantNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: MatchRoundParticipantMessage.NOT_FOUND,
      errorKey: MatchRoundParticipantMessage.NOT_FOUND
    })
  }
}

export class MatchRoundParticipantAlreadyExistsException extends BadRequestException {
  constructor() {
    super({
      message: MatchRoundParticipantMessage.ALREADY_EXISTS,
      errorKey: MatchRoundParticipantMessage.ALREADY_EXISTS
    })
  }
}

// Hết giờ chọn: hệ thống đã tự chọn Pokémon cho người chơi
export class PokemonSelectionExpiredException extends BadRequestException {
  constructor() {
    super({
      message: MatchingSocketMessage.TIMOUT_SELECTED_POKEMON,
      errorKey: MatchingSocketMessage.TIMOUT_SELECTED_POKEMON
    })
  }
}
