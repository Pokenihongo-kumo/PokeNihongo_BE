import { UserSubscriptionModule } from '@/modules/user-subscription/user-subscription.module'
import { UserCoreModule } from '@/modules/user/user-core.module'
import { BullQueueModule } from '@/3rdService/bull/bull-queue.module'
import { AccessTokenGuard } from '@/common/guards/access-token.guard'
import { APIKeyGuard } from '@/common/guards/api-key.guard'
import { AuthenticationGuard } from '@/common/guards/authentication.guard'

import { HashingService } from '@/shared/services/hashing.service'
import { PrismaService } from '@/shared/services/prisma.service'
import { TokenService } from '@/shared/services/token.service'
import { Global, Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { SharedUserSubscriptionService } from './services/user-subscription.service'

const sharedServices = [
  PrismaService,
  HashingService,
  TokenService,
  SharedUserSubscriptionService
]
@Global()
@Module({
  imports: [
    UserSubscriptionModule,
    UserCoreModule,
    JwtModule,
    BullQueueModule.forRoot() // Only keep forRoot() here - queues registered in domain modules
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
