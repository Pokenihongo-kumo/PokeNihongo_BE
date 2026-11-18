import { UserSubscriptionModule } from '@/modules/user-subscription/user-subscription.module'
import { UserCoreModule } from '@/modules/user/user-core.module'
import { BullQueueModule } from '@/3rdService/bull/bull-queue.module'
import { AccessTokenGuard } from '@/common/guards/access-token.guard'
import { APIKeyGuard } from '@/common/guards/api-key.guard'
import { AuthenticationGuard } from '@/common/guards/authentication.guard'
import { LanguagesModule } from '@/modules/languages/languages.module'
import { PokemonRepo } from '@/modules/pokemon/pokemon.repo'
import { QuestionBankRepo } from '@/modules/question-bank/question-bank.repo'

import { HashingService } from '@/shared/services/hashing.service'
import { PrismaService } from '@/shared/services/prisma.service'
import { TokenService } from '@/shared/services/token.service'
import { UserGateway } from '@/websockets/user.gateway'
import { Global, Module, forwardRef } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { WebsocketsModule } from 'src/websockets/websockets.module'
import { SharedNotificationRepo } from './repositories/shared-notification.repo'
import { SharedNotificationService } from './services/shared-notification.service'
import { SharedUserSubscriptionService } from './services/user-subscription.service'

const sharedServices = [
  PrismaService,
  HashingService,
  TokenService,
  SharedUserSubscriptionService,
  SharedNotificationService,
  // EmailService,
  SharedNotificationRepo,
  QuestionBankRepo,
  PokemonRepo,
  UserGateway
]
@Global()
@Module({
  imports: [
    UserSubscriptionModule,
    UserCoreModule,
    JwtModule,
    BullQueueModule.forRoot(), // Only keep forRoot() here - queues registered in domain modules
    LanguagesModule, // SharedNotificationService reads language ids
    forwardRef(() => WebsocketsModule)
  ],
  controllers: [],
  providers: [
    ...sharedServices,
    AccessTokenGuard,
    APIKeyGuard,
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard
    }
  ],
  exports: [...sharedServices, AccessTokenGuard, APIKeyGuard]
})
export class SharedModule {}
