import { Module } from '@nestjs/common'
import { UploadModule } from 'src/3rdService/upload/upload.module'
import { SharedModule } from 'src/shared/shared.module'
import { TypeEffectivenessModule } from '../type-effectiveness/type-effectiveness.module'
import { PokemonController } from './pokemon.controller'
import { PokemonRepo } from './pokemon.repo'
import { PokemonService } from './pokemon.service'

@Module({
  imports: [SharedModule, UploadModule, TypeEffectivenessModule],
  controllers: [PokemonController],
  providers: [PokemonService, PokemonRepo],
  exports: [PokemonService, PokemonRepo]
})
export class PokemonModule {}
