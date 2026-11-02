import { Module } from '@nestjs/common'
import { GrammarUsageController } from './grammar-usage.controller'
import { GrammarUsageService } from './grammar-usage.service'
import { GrammarUsageRepository } from './grammar-usage.repo'

@Module({
  controllers: [GrammarUsageController],
  providers: [GrammarUsageService, GrammarUsageRepository],
  exports: [GrammarUsageService, GrammarUsageRepository]
})
export class GrammarUsageModule {}
