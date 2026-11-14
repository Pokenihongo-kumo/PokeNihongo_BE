import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateUserPokemonBodyDTO,
  CreateUserPokemonResDTO,
  GetUserPokemonByPokemonIdParamsDTO,
  GetUserPokemonListWithUserQueryDTO,
  GetUserPokemonByPokemonIdwithListOwnershipResDTO,
  GetUserPokemonDetailResDTO,
  GetUserPokemonParamsDTO,
  GetUserPokemonStatsResDTO,
  UpdateUserPokemonBodyDTO,
  UpdateUserPokemonResDTO
} from './dto/user-pokemon.dto'
import { UserPokemonService } from './user-pokemon.service'

@Controller('user-pokemon')
export class UserPokemonController {
  constructor(private readonly userPokemonService: UserPokemonService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  list(
    @Query() query: PaginationQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userPokemonService.list(query, userId, lang)
  }

  @Get('user/pokemons/stats')
  @ZodSerializerDto(GetUserPokemonStatsResDTO)
  getUserPokemonStats(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return this.userPokemonService.getUserPokemonStats(userId, lang)
  }

  @Get('user/rounds/pokemons')
  @ZodSerializerDto(PaginationResponseDTO)
  getPokemonListWithUserByRounds(
    @Query() query: PaginationQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userPokemonService.getPokemonListWithUserByRounds(query, userId, lang)
  }

  @Get('user/pokemons')
  @ZodSerializerDto(PaginationResponseDTO)
  getPokemonListWithUser(
    @Query() query: GetUserPokemonListWithUserQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    const { hasPokemon, ...pagination } = query
    return this.userPokemonService.getPokemonListWithUser(
      pagination,
      userId,
      lang,
      hasPokemon
    )
  }

  @Get('/pokemons')
  getWithUserId(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return this.userPokemonService.listWithUserId(userId, lang)
  }

  @Get('evolves/:pokemonId')
  @ZodSerializerDto(GetUserPokemonByPokemonIdwithListOwnershipResDTO)
  getWithEvolvesPokemon(
    @Param() params: GetUserPokemonByPokemonIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userPokemonService.getWithEvolvesPokemon(params.pokemonId, userId, lang)
  }

  @Get(':userPokemonId')
  @ZodSerializerDto(GetUserPokemonDetailResDTO)
  findById(
    @Param() params: GetUserPokemonParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userPokemonService.findById(params.userPokemonId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateUserPokemonResDTO)
  create(
    @Body() body: CreateUserPokemonBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userPokemonService.create(
      {
        userId,
        data: body
      },
      lang
    )
  }

  @Put(':userPokemonId')
  @ZodSerializerDto(UpdateUserPokemonResDTO)
  update(
    @Body() body: UpdateUserPokemonBodyDTO,
    @Param() params: GetUserPokemonParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userPokemonService.update(
      {
        data: body,
        id: params.userPokemonId,
        userId
      },
      lang
    )
  }

  @Delete(':userPokemonId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetUserPokemonParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userPokemonService.delete(
      {
        id: params.userPokemonId,
        userId
      },
      lang
    )
  }

  // Admin endpoints
  // @Get('admin/all')
  // @IsPublic() // Remove this in production, add admin guard
  // @ZodSerializerDto(PaginationResponseDTO)
  // adminList(@Query() query: PaginationQueryDTO) {
  //   return this.userPokemonService.list(query)
  // }
}
