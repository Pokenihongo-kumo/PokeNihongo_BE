import { Module } from '@nestjs/common'
import { UserTestController } from './user-test.controller'
import { UserTestRepository } from './user-test.repo'
import { UserTestService } from './user-test.service'
import { PrismaService } from '@/shared/services/prisma.service'

@Module({
  imports: [],
  controllers: [UserTestController],
  providers: [UserTestService, UserTestRepository, PrismaService],
  exports: [UserTestService, UserTestRepository]
})
export class UserTestModule {}
