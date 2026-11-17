import { Module } from '@nestjs/common'
import { SubscriptionPlanModule } from '../subscription-plan/subscription-plan.module'
import { UserSubscriptionModule } from '../user-subscription/user-subscription.module'
import { WalletTransactionModule } from '../wallet-transaction/wallet-transaction.module'
import { WalletModule } from '../wallet/wallet.module'
import { InvoiceController } from './invoice.controller'
import { InvoiceRepo } from './invoice.repo'
import { InvoiceService } from './invoice.service'

// POST /invoice is in the payment module (InvoiceCheckoutController): invoice
// does not depend on payment
@Module({
  imports: [
    SubscriptionPlanModule,
    UserSubscriptionModule,
    WalletModule,
    WalletTransactionModule
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService, InvoiceRepo],
  exports: [InvoiceService, InvoiceRepo]
})
export class InvoiceModule {}
