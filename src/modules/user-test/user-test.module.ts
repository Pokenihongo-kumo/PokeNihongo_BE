import { Module } from '@nestjs/common'
import { UserTestController } from './user-test.controller'
import { UserTestRepo } from './user-test.repo'
import { UserTestService } from './user-test.service'
import { PrismaService } from '@/shared/services/prisma.service'

@Module({
  imports: [],
  controllers: [UserTestController],
  providers: [UserTestService, UserTestRepo, PrismaService],
  exports: [UserTestService, UserTestRepo]
})
export class UserTestModule {}
