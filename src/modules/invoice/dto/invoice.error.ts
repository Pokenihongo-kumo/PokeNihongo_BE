import { InvoiceMessage } from '@/i18n/message-keys'
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException
} from '@nestjs/common'

export class InvoiceNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: InvoiceMessage.NOT_FOUND,
      errorKey: InvoiceMessage.NOT_FOUND
    })
  }
}

export class InvoiceAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: InvoiceMessage.ALREADY_EXISTS,
      errorKey: InvoiceMessage.ALREADY_EXISTS
    })
  }
}

// More PokeCoin than half the plan price (the limit
// GET /subscription-plan/discount/:id reports)
export class InvoiceDiscountTooHighException extends UnprocessableEntityException {
  constructor() {
    super({
      message: InvoiceMessage.DISCOUNT_TOO_HIGH,
      errorKey: InvoiceMessage.DISCOUNT_TOO_HIGH
    })
  }
}

export class InvoiceNotEnoughPokeCoinsException extends BadRequestException {
  constructor() {
    super({
      message: InvoiceMessage.NOT_ENOUGH_POKE_COINS,
      errorKey: InvoiceMessage.NOT_ENOUGH_POKE_COINS
    })
  }
}
