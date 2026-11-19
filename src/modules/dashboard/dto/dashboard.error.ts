import { GachaBannerMessage, LeaderboardSeasonMessage } from '@/i18n/message-keys'
import { NotFoundException } from '@nestjs/common'

// Were a bare NotFoundException ("Not Found" in every language)

export class DashboardSeasonNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: LeaderboardSeasonMessage.NOT_FOUND,
      errorKey: LeaderboardSeasonMessage.NOT_FOUND
    })
  }
}

export class DashboardGachaBannerNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: GachaBannerMessage.NOT_FOUND,
      errorKey: GachaBannerMessage.NOT_FOUND
    })
  }
}
