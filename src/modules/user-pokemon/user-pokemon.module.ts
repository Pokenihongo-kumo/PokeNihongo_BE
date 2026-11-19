import { UserCoreModule } from '@/modules/user/user-core.module'
import { Module } from '@nestjs/common'
import { SharedModule } from 'src/shared/shared.module'
import { LevelModule } from '../level/level.module'
import { MatchModule } from '../match/match.module'
import { PokemonModule } from '../pokemon/pokemon.module'
import { TypeEffectivenessModule } from '../type-effectiveness/type-effectiveness.module'
import { UserPokemonController } from './user-pokemon.controller'
import { UserPokemonRepo } from './user-pokemon.repo'
import { UserPokemonService } from './user-pokemon.service'

@Module({
  imports: [
    UserCoreModule,
    SharedModule,
    LevelModule,
    PokemonModule,
    MatchModule,
    TypeEffectivenessModule
  ],
  controllers: [UserPokemonController],
  providers: [UserPokemonService, UserPokemonRepo],
  exports: [UserPokemonService, UserPokemonRepo]
})
export class UserPokemonModule {}
