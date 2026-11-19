import { Module } from '@nestjs/common'
import { UserHistoryController } from './user-history.controller'
import { UserHistoryService } from './user-history.service'
import { UserHistoryRepo } from './user-history.repo'
import { PrismaService } from '@/shared/services/prisma.service'
import { I18nModule } from '@/i18n/i18n.module'
import { TranslationModule } from '@/modules/translation/translation.module'
import { LanguagesModule } from '@/modules/languages/languages.module'

@Module({
  imports: [I18nModule, TranslationModule, LanguagesModule],
  controllers: [UserHistoryController],
  providers: [UserHistoryService, UserHistoryRepo, PrismaService],
  exports: [UserHistoryService]
})
export class UserHistoryModule {}
