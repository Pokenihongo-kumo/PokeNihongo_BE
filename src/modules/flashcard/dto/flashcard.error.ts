import { FlashcardMessage } from '@/i18n/message-keys'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

export class FlashcardDeckNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: FlashcardMessage.NOT_FOUND_DECK,
      errorKey: FlashcardMessage.NOT_FOUND_DECK
    })
  }
}

export class FlashcardCardNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: FlashcardMessage.NOT_FOUND_CARD,
      errorKey: FlashcardMessage.NOT_FOUND_CARD
    })
  }
}

export class FlashcardContentAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: FlashcardMessage.CONTENT_ALREADY_IN_DECK,
      errorKey: FlashcardMessage.CONTENT_ALREADY_IN_DECK
    })
  }
}

// With a content type and id: that content does not exist (was a Vietnamese
// message whatever the language)
export class InvalidFlashcardImportException extends BadRequestException {
  constructor(contentType?: string, id?: number) {
    const known = contentType !== undefined && id !== undefined
    const key = known
      ? FlashcardMessage.CONTENT_NOT_FOUND
      : FlashcardMessage.INVALID_IMPORT_IDS
    super({
      message: key,
      errorKey: key,
      ...(known && { errorArgs: { contentType, id } })
    })
  }
}
