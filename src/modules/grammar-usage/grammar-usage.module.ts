import { Module } from '@nestjs/common'
import { GrammarUsageController } from './grammar-usage.controller'
import { GrammarUsageService } from './grammar-usage.service'
import { GrammarUsageRepo } from './grammar-usage.repo'

@Module({
  controllers: [GrammarUsageController],
  providers: [GrammarUsageService, GrammarUsageRepo],
  exports: [GrammarUsageService, GrammarUsageRepo]
})
export class GrammarUsageModule {}
