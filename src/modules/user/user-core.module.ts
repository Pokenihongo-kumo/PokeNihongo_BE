import { Module } from '@nestjs/common'
import { UserCoreRepo } from './user-core.repo'
import { UserCoreService } from './user-core.service'

// Tier 0 of the module-boundary plan: imports nothing (PrismaService is global)
@Module({
  providers: [UserCoreRepo, UserCoreService],
  exports: [UserCoreService]
})
export class UserCoreModule {}
