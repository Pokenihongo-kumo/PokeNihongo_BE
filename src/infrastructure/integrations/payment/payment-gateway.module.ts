import envConfig from '@/config/env.config'
import { Module } from '@nestjs/common'
import { FakePaymentAdapter } from './fake-payment.adapter'
import { PaymentGateway } from './payment-gateway.port'
import { PayOSAdapter } from './payos.adapter'

// Provides the PaymentGateway port; with PAYMENT_DRIVER=fake no PayOS client
// is created
@Module({
  providers: [
    {
      provide: PaymentGateway,
      useClass: envConfig.PAYMENT_DRIVER === 'payos' ? PayOSAdapter : FakePaymentAdapter
    }
  ],
  exports: [PaymentGateway]
})
export class PaymentGatewayModule {}
