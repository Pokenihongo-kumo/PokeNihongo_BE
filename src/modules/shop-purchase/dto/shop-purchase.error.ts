import { ShopPurchaseMessage, WalletMessage } from '@/i18n/message-keys'
import { BadRequestException, NotFoundException } from '@nestjs/common'

export class ShopPurchaseNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: ShopPurchaseMessage.NOT_FOUND,
      errorKey: ShopPurchaseMessage.NOT_FOUND
    })
  }
}

//ko du tien liuliu
export class NotEnoughBalanceException extends NotFoundException {
  constructor() {
    super({
      message: WalletMessage.INSUFFICIENT_BALANCE,
      errorKey: WalletMessage.INSUFFICIENT_BALANCE
    })
  }
}

// Đã đạt giới hạn mua
export class PurchaseLimitReachedException extends BadRequestException {
  constructor() {
    super({
      message: ShopPurchaseMessage.PURCHASE_LIMIT_REACHED,
      errorKey: ShopPurchaseMessage.PURCHASE_LIMIT_REACHED
    })
  }
}

export class ShopNotOpenException extends BadRequestException {
  constructor() {
    super({
      message: ShopPurchaseMessage.SHOP_NOT_OPEN,
      errorKey: ShopPurchaseMessage.SHOP_NOT_OPEN
    })
  }
}
