import { Module } from '@nestjs/common'
import { ExercisesController } from './exercises.controller'
import { ExercisesService } from './exercises.service'
import { ExercisesRepo } from './exercises.repo'
import { SharedModule } from '@/shared/shared.module'
import { LanguagesModule } from '@/modules/languages/languages.module'
import { UploadModule } from '@/3rdService/upload/upload.module'
import { TranslationModule } from '@/modules/translation/translation.module'

@Module({
  imports: [SharedModule, LanguagesModule, UploadModule, TranslationModule],
  controllers: [ExercisesController],
  providers: [ExercisesService, ExercisesRepo],
  exports: [ExercisesService, ExercisesRepo]
})
export class ExercisesModule {}
