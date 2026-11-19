import { forwardRef, Module } from '@nestjs/common'
import { PokemonModule } from '../pokemon/pokemon.module'
import { ShopBannerModule } from '../shop-banner/shop-banner.module'
import { ShopItemModule } from '../shop-item/shop-item.module'
import { UserPokemonModule } from '../user-pokemon/user-pokemon.module'
import { WalletModule } from '../wallet/wallet.module'
import { ShopPurchaseController } from './shop-purchase.controller'
import { ShopPurchaseRepo } from './shop-purchase.repo'
import { ShopPurchaseService } from './shop-purchase.service'

@Module({
  imports: [
    ShopItemModule,
    UserPokemonModule,
    forwardRef(() => ShopBannerModule),
    WalletModule,
    PokemonModule
  ],
  controllers: [ShopPurchaseController],
  providers: [ShopPurchaseService, ShopPurchaseRepo],
  exports: [ShopPurchaseRepo, ShopPurchaseService]
})
export class ShopPurchaseModule {}
