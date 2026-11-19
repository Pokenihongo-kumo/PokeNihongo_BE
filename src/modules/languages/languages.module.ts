import { Module } from '@nestjs/common'
import { LanguagesController } from './languages.controller'
import { LanguagesService } from './languages.service'
import { LanguagesRepo } from './languages.repo'

@Module({
  controllers: [LanguagesController],
  providers: [LanguagesService, LanguagesRepo],
  // Kernel module: imports nothing; other modules use LanguagesService
  // (module-boundary plan R1, D-MB2)
  exports: [LanguagesService]
})
export class LanguagesModule {}
