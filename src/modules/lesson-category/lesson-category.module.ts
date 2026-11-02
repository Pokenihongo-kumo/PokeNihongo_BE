import { Module } from '@nestjs/common'
import { LessonCategoryController } from './lesson-category.controller'
import { LessonCategoryService } from './lesson-category.service'
import { LessonCategoryRepository } from './lesson-category.repo'
import { SharedModule } from '@/shared/shared.module'
import { TranslationModule } from '../translation/translation.module'
import { LanguagesModule } from '../languages/languages.module'
import { I18nModule } from '@/i18n/i18n.module'

@Module({
  imports: [SharedModule, TranslationModule, LanguagesModule, I18nModule],
  controllers: [LessonCategoryController],
  providers: [LessonCategoryService, LessonCategoryRepository],
  exports: [LessonCategoryService, LessonCategoryRepository]
})
export class LessonCategoryModule {}
