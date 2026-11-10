import { MeaningMessage, WordTypeMessage } from '@/i18n/message-keys'
import { BadRequestException, NotFoundException } from '@nestjs/common'

// A new instance per throw; `message` is translated from errorKey by
// ApiExceptionFilter (Accept-Language), the old Vietnamese text is the vi value

export class MeaningNotFoundException extends NotFoundException {
  constructor() {
    super({ message: MeaningMessage.NOT_FOUND, errorKey: MeaningMessage.NOT_FOUND })
  }
}

export class InvalidMeaningDataException extends BadRequestException {
  constructor() {
    super({ message: MeaningMessage.INVALID_DATA, errorKey: MeaningMessage.INVALID_DATA })
  }
}

// The vocabulary or word type the meaning points to does not exist
export class MeaningVocabularyNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: MeaningMessage.VOCABULARY_NOT_FOUND,
      errorKey: MeaningMessage.VOCABULARY_NOT_FOUND
    })
  }
}

export class MeaningWordTypeNotFoundException extends NotFoundException {
  constructor() {
    super({ message: WordTypeMessage.NOT_FOUND, errorKey: WordTypeMessage.NOT_FOUND })
  }
}
