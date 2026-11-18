import { PaymentGatewayModule } from '@/infrastructure/integrations/payment/payment-gateway.module'
import { UserCoreModule } from '@/modules/user/user-core.module'
import { BullQueueModule } from '@/infrastructure/queue/bull-queue.module'
import { MailModule } from '@/modules/mail/mail.module'
import { BullQueue } from '@/common/constants/bull-action.constant'
import { Module } from '@nestjs/common'
import { InvoiceModule } from '../invoice/invoice.module'
import { SubscriptionPlanModule } from '../subscription-plan/subscription-plan.module'
import { UserSubscriptionModule } from '../user-subscription/user-subscription.module'
import { InvoiceCheckoutController } from './invoice-checkout.controller'
import { PaymentController } from './payment.controller'
import { PaymentRepo } from './payment.repo'
import { PaymentService } from './payment.service'

@Module({
  imports: [
    PaymentGatewayModule,
    UserCoreModule,
    InvoiceModule,
    SubscriptionPlanModule,
    UserSubscriptionModule,
    MailModule,
    BullQueueModule.registerQueue(BullQueue.INVOICE_EXPIRATION)
  ],
  controllers: [PaymentController, InvoiceCheckoutController],
  providers: [PaymentService, PaymentRepo],
  exports: [PaymentService, PaymentRepo]
})
export class PaymentModule {}
