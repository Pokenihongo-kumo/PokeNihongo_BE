import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: ['info']
    })
  }
  async onModuleInit() {
    await this.$connect()
  }

  // Several modules provide their own instance; without this every closed app
  // (shutdown, each e2e spec) kept its connection pool open
  async onModuleDestroy() {
    await this.$disconnect()
  }
}
