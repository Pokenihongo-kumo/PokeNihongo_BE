import { Module } from '@nestjs/common'
import { LessonController } from './lesson.controller'
import { LessonService } from './lesson.service'
import { LessonRepository } from './lesson.repo'
import { SharedModule } from '@/shared/shared.module'
import { LessonCategoryModule } from '../lesson-category/lesson-category.module'
import { TranslationModule } from '../translation/translation.module'
import { LanguagesModule } from '../languages/languages.module'
import { TestModule } from '../test/test.module'

@Module({
  imports: [
    SharedModule,
    LessonCategoryModule,
    TranslationModule,
    LanguagesModule,
    TestModule
  ],
  controllers: [LessonController],
  providers: [LessonService, LessonRepository],
  exports: [LessonService, LessonRepository]
})
export class LessonModule {}
