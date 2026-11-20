import { MatchingSocketMessage, MatchRoundParticipantMessage } from '@/i18n/message-keys'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

export class MatchRoundParticipantNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: MatchRoundParticipantMessage.NOT_FOUND,
      errorKey: MatchRoundParticipantMessage.NOT_FOUND
    })
  }
}

// The pick timer starts on a participant's turn (endTimeSelected): before
// that, picking is out of turn
export class NotYourTurnToPickException extends ConflictException {
  constructor() {
    super({
      message: MatchRoundParticipantMessage.NOT_YOUR_TURN,
      errorKey: MatchRoundParticipantMessage.NOT_YOUR_TURN
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
