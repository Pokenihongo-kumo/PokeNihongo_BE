import { LanguagesModule } from '@/modules/languages/languages.module'
import { Module } from '@nestjs/common'
import { DashboardController } from './dashboard.controller'
import { DashboardRepo } from './dashboard.repo'
import { DashboardService } from './dashboard.service'

@Module({
  imports: [LanguagesModule],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardRepo]
})
export class DashboardModule {}
