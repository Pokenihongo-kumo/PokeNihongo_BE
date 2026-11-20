import { GachaItemMessage } from '@/i18n/message-keys'
import { BadRequestException, NotFoundException } from '@nestjs/common'

export class GachaItemNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: GachaItemMessage.NOT_FOUND,
      errorKey: GachaItemMessage.NOT_FOUND
    })
  }
}

export class InvalidGachaBannerException extends BadRequestException {
  constructor() {
    super({
      message: GachaItemMessage.GACHA_BANNER_INVALID,
      errorKey: GachaItemMessage.GACHA_BANNER_INVALID
    })
  }
}

export class GachaBannerInactiveException extends BadRequestException {
  constructor() {
    super({
      message: GachaItemMessage.GACHA_BANNER_INACTIVE,
      errorKey: GachaItemMessage.GACHA_BANNER_INACTIVE
    })
  }
}

export class GachaBannerActiveException extends BadRequestException {
  constructor() {
    super({
      message: GachaItemMessage.GACHA_BANNER_ACTIVE,
      errorKey: GachaItemMessage.GACHA_BANNER_ACTIVE
    })
  }
}

export class GachaBannerExpiredException extends BadRequestException {
  constructor() {
    super({
      message: GachaItemMessage.GACHA_BANNER_EXPIRED,
      errorKey: GachaItemMessage.GACHA_BANNER_EXPIRED
    })
  }
}

export class PokemonDuplicateInGachaException extends BadRequestException {
  constructor() {
    super({
      message: GachaItemMessage.POKEMON_DUPLICATE,
      errorKey: GachaItemMessage.POKEMON_DUPLICATE
    })
  }
}

export class MaxGachaItemsExceededException extends BadRequestException {
  constructor(data?) {
    super({
      message: GachaItemMessage.MAX_ITEMS_EXCEEDED,
      errorKey: GachaItemMessage.MAX_ITEMS_EXCEEDED,
      data: data || null
    })
  }
}

export class PokemonInvalidRarityWithStarTypeToAddException extends BadRequestException {
  constructor(data?: string) {
    super({
      message: GachaItemMessage.POKEMON_INVALID_RARITY_WITH_STAR_TYPE_TO_ADD,
      errorKey: GachaItemMessage.POKEMON_INVALID_RARITY_WITH_STAR_TYPE_TO_ADD,
      data: data || null
    })
  }
}

export class DuplicateStarTypeInListException extends BadRequestException {
  constructor(data?: string) {
    super({
      message: GachaItemMessage.DUPLICATE_STAR_TYPE_IN_LIST,
      errorKey: GachaItemMessage.DUPLICATE_STAR_TYPE_IN_LIST,
      data: data || null
    })
  }
}
