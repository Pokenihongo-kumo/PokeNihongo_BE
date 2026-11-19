import { Module } from '@nestjs/common'
import { UserProgressController } from './user-progress.controller'
import { UserProgressRepo } from './user-progress.repo'
import { UserProgressService } from './user-progress.service'

@Module({
  imports: [],
  controllers: [UserProgressController],
  providers: [UserProgressService, UserProgressRepo],
  exports: [UserProgressService, UserProgressRepo]
})
export class UserProgressModule {}
