import { UserSubscriptionModule } from '@/modules/user-subscription/user-subscription.module'
import { Module } from '@nestjs/common'
import { GachaBannerModule } from '../gacha-banner/gacha-banner.module'
import { GachaRollHistoryModule } from '../gacha-roll-history/gacha-roll-history.module'
import { UserGachaPityModule } from '../user-gacha-pity/user-gacha-pity.module'
import { UserPokemonModule } from '../user-pokemon/user-pokemon.module'
import { WalletTransactionModule } from '../wallet-transaction/wallet-transaction.module'
import { WalletModule } from '../wallet/wallet.module'
import { GachaPurchaseController } from './gacha-purchase.controller'
import { GachaPurchaseRepo } from './gacha-purchase.repo'
import { GachaPurchaseService } from './gacha-purchase.service'

@Module({
  imports: [
    UserSubscriptionModule,
    GachaBannerModule,
    GachaRollHistoryModule,
    UserGachaPityModule,
    WalletModule,
    WalletTransactionModule,
    UserPokemonModule
  ],
  controllers: [GachaPurchaseController],
  providers: [GachaPurchaseService, GachaPurchaseRepo]
})
export class GachaPurchaseModule {}
