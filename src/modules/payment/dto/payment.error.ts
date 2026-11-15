import { InvoiceMessage, PaymentMessage } from '@/i18n/message-keys'
import { ConflictException, NotFoundException } from '@nestjs/common'

export class InvoiceNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: InvoiceMessage.NOT_FOUND,
      errorKey: InvoiceMessage.NOT_FOUND
    })
  }
}

export class InvalidStatusPendingInvoiceToPayException extends ConflictException {
  constructor() {
    super({
      message: PaymentMessage.INVALID_STATUS_PENDING,
      errorKey: PaymentMessage.INVALID_STATUS_PENDING
    })
  }
}

export class ErrorPaymentToPayException extends ConflictException {
  constructor() {
    super({
      message: PaymentMessage.ERROR_UNKNOWN_PAY,
      errorKey: PaymentMessage.ERROR_UNKNOWN_PAY
    })
  }
}

// Another request for the same invoice is creating its payment link right now
export class PaymentLinkInProgressException extends ConflictException {
  constructor() {
    super({
      message: PaymentMessage.LINK_IN_PROGRESS,
      errorKey: PaymentMessage.LINK_IN_PROGRESS
    })
  }
}
