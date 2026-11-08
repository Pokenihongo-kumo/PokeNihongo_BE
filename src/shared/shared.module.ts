import { BullQueueModule } from '@/3rdService/bull/bull-queue.module'
import { AccessTokenGuard } from '@/common/guards/access-token.guard'
import { APIKeyGuard } from '@/common/guards/api-key.guard'
import { AuthenticationGuard } from '@/common/guards/authentication.guard'
import { InvoiceRepo } from '@/modules/invoice/invoice.repo'
import { LanguagesRepo } from '@/modules/languages/languages.repo'
import { PokemonRepo } from '@/modules/pokemon/pokemon.repo'
import { QuestionBankRepository } from '@/modules/question-bank/question-bank.repo'
import { UserSubscriptionRepo } from '@/modules/user-subscription/user-subscription.repo'
import { WalletTransactionRepo } from '@/modules/wallet-transaction/wallet-transaction.repo'
import { WalletRepo } from '@/modules/wallet/wallet.repo'

import { HashingService } from '@/shared/services/hashing.service'
import { PrismaService } from '@/shared/services/prisma.service'
import { TokenService } from '@/shared/services/token.service'
import { UserGateway } from '@/websockets/user.gateway'
import { Global, Module, forwardRef } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { WebsocketsModule } from 'src/websockets/websockets.module'
import { SharedNotificationRepo } from './repositories/shared-notification.repo'
import { SharedRoleRepository } from './repositories/shared-role.repo'
import { SharedUserRepository } from './repositories/shared-user.repo'
import { PayOSService } from './services/payos.service'
import { SharedNotificationService } from './services/shared-notification.service'
import { SharedUserSubscriptionService } from './services/user-subscription.service'
import { InvoiceExpirationProcessor } from './workers/invoice-expiration.processor'

const sharedServices = [
  PrismaService,
  HashingService,
  TokenService,
  SharedUserSubscriptionService,
  SharedNotificationService,
  LanguagesRepo,
  // EmailService,
  SharedUserRepository,
  SharedRoleRepository,
  SharedNotificationRepo,
  QuestionBankRepository,
  PokemonRepo,
  PayOSService,
  InvoiceRepo,
  UserSubscriptionRepo,
  WalletRepo,
  WalletTransactionRepo,
  UserGateway
]
@Global()
@Module({
  imports: [
    JwtModule,
    BullQueueModule.forRoot(), // Only keep forRoot() here - queues registered in domain modules
    forwardRef(() => WebsocketsModule)
  ],
  controllers: [],
  providers: [
    ...sharedServices,
    AccessTokenGuard,
    APIKeyGuard,
    InvoiceExpirationProcessor, // Keep this if Invoice module doesn't exist yet
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard
    }
  ],
  exports: [...sharedServices, AccessTokenGuard, APIKeyGuard]
})
export class SharedModule {}
