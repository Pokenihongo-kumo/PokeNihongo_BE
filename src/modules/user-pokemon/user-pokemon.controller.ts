import { I18nService } from '@/i18n/i18n.service'
import { UserPokemonMessage } from '@/i18n/message-keys'
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
  constructor(
    private readonly userPokemonService: UserPokemonService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  async list(
    @Query() query: PaginationQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserPokemonMessage.GET_LIST_SUCCESS, lang),
      data: await this.userPokemonService.list(query, userId)
    }
  }

  @Get('user/pokemons/stats')
  @ZodSerializerDto(GetUserPokemonStatsResDTO)
  async getUserPokemonStats(
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserPokemonMessage.GET_STATS_SUCCESS, lang),
      data: await this.userPokemonService.getUserPokemonStats(userId)
    }
  }

  @Get('user/rounds/pokemons')
  @ZodSerializerDto(PaginationResponseDTO)
  async getPokemonListWithUserByRounds(
    @Query() query: PaginationQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserPokemonMessage.GET_LIST_SUCCESS, lang),
      data: await this.userPokemonService.getPokemonListWithUserByRounds(query, userId)
    }
  }

  @Get('user/pokemons')
  @ZodSerializerDto(PaginationResponseDTO)
  async getPokemonListWithUser(
    @Query() query: GetUserPokemonListWithUserQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    const { hasPokemon, ...pagination } = query
    return {
      message: this.i18nService.translate(UserPokemonMessage.GET_LIST_SUCCESS, lang),
      data: await this.userPokemonService.getPokemonListWithUser(
        pagination,
        userId,
        lang,
        hasPokemon
      )
    }
  }

  @Get('/pokemons')
  async getWithUserId(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(UserPokemonMessage.GET_LIST_SUCCESS, lang),
      data: await this.userPokemonService.listWithUserId(userId)
    }
  }

  @Get('evolves/:pokemonId')
  @ZodSerializerDto(GetUserPokemonByPokemonIdwithListOwnershipResDTO)
  async getWithEvolvesPokemon(
    @Param() params: GetUserPokemonByPokemonIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserPokemonMessage.GET_DETAIL_SUCCESS, lang),
      data: await this.userPokemonService.getWithEvolvesPokemon(params.pokemonId, userId)
    }
  }

  @Get(':userPokemonId')
  @ZodSerializerDto(GetUserPokemonDetailResDTO)
  async findById(
    @Param() params: GetUserPokemonParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserPokemonMessage.GET_DETAIL_SUCCESS, lang),
      data: await this.userPokemonService.findById(params.userPokemonId)
    }
  }

  @Post()
  @ZodSerializerDto(CreateUserPokemonResDTO)
  async create(
    @Body() body: CreateUserPokemonBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserPokemonMessage.CREATE_SUCCESS, lang),
      data: await this.userPokemonService.create({
        userId,
        data: body
      })
    }
  }

  @Put(':userPokemonId')
  @ZodSerializerDto(UpdateUserPokemonResDTO)
  async update(
    @Body() body: UpdateUserPokemonBodyDTO,
    @Param() params: GetUserPokemonParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserPokemonMessage.UPDATE_SUCCESS, lang),
      data: await this.userPokemonService.update({
        data: body,
        id: params.userPokemonId,
        userId
      })
    }
  }

  @Delete(':userPokemonId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetUserPokemonParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.userPokemonService.delete({
      id: params.userPokemonId,
      userId
    })
    return {
      message: this.i18nService.translate(UserPokemonMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }

  // Admin endpoints
  // @Get('admin/all')
  // @IsPublic() // Remove this in production, add admin guard
  // @ZodSerializerDto(PaginationResponseDTO)
  // adminList(@Query() query: PaginationQueryDTO) {
  //   return this.userPokemonService.list(query)
  // }
}
