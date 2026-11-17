import { PaymentGatewayModule } from '@/infrastructure/integrations/payment/payment-gateway.module'
import { UserCoreModule } from '@/modules/user/user-core.module'
import { BullQueueModule } from '@/3rdService/bull/bull-queue.module'
import { MailModule } from '@/3rdService/mail/mail.module'
import { BullQueue } from '@/common/constants/bull-action.constant'
import { Module, forwardRef } from '@nestjs/common'
import { InvoiceModule } from '../invoice/invoice.module'
import { SubscriptionPlanModule } from '../subscription-plan/subscription-plan.module'
import { UserSubscriptionModule } from '../user-subscription/user-subscription.module'
import { PaymentController } from './payment.controller'
import { PaymentRepo } from './payment.repo'
import { PaymentService } from './payment.service'

@Module({
  imports: [
    PaymentGatewayModule,
    UserCoreModule,
    forwardRef(() => InvoiceModule),
    SubscriptionPlanModule,
    UserSubscriptionModule,
    MailModule,
    BullQueueModule.registerQueue(BullQueue.INVOICE_EXPIRATION)
  ],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentRepo],
  exports: [PaymentService, PaymentRepo]
})
export class PaymentModule {}
