import { Module } from '@nestjs/common'
import { LessonController } from './lesson.controller'
import { LessonService } from './lesson.service'
import { LessonRepo } from './lesson.repo'
import { SharedModule } from '@/shared/shared.module'
import { LanguagesModule } from '../languages/languages.module'

@Module({
  imports: [SharedModule, LanguagesModule],
  controllers: [LessonController],
  providers: [LessonService, LessonRepo],
  exports: [LessonService, LessonRepo]
})
export class LessonModule {}
