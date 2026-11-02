import { Module } from '@nestjs/common'
import { UserProgressController } from './user-progress.controller'
import { UserProgressRepository } from './user-progress.repo'
import { UserProgressService } from './user-progress.service'

@Module({
  imports: [],
  controllers: [UserProgressController],
  providers: [UserProgressService, UserProgressRepository],
  exports: [UserProgressService, UserProgressRepository]
})
export class UserProgressModule {}
