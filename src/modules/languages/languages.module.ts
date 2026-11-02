import { Module } from '@nestjs/common'
import { LanguagesController } from './languages.controller'
import { LanguagesService } from './languages.service'
import { LanguagesRepository } from './languages.repo'
import { SharedModule } from '@/shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [LanguagesController],
  providers: [LanguagesService, LanguagesRepository],
  exports: [LanguagesService, LanguagesRepository]
})
export class LanguagesModule {}
