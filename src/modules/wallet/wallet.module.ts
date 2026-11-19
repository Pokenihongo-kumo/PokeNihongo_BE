import { UserCoreModule } from '@/modules/user/user-core.module'
import { WalletTransactionModule } from '@/modules/wallet-transaction/wallet-transaction.module'
import { Module } from '@nestjs/common'
import { WalletController } from './wallet.controller'
import { WalletRepo } from './wallet.repo'
import { WalletService } from './wallet.service'

@Module({
  imports: [UserCoreModule, WalletTransactionModule],
  controllers: [WalletController],
  providers: [WalletService, WalletRepo],
  exports: [WalletService, WalletRepo]
})
export class WalletModule {}
