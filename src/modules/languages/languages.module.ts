import { Module } from '@nestjs/common'
import { LanguagesController } from './languages.controller'
import { LanguagesService } from './languages.service'
import { LanguagesRepo } from './languages.repo'
import { SharedModule } from '@/shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [LanguagesController],
  providers: [LanguagesService, LanguagesRepo],
  exports: [LanguagesService, LanguagesRepo]
})
export class LanguagesModule {}
