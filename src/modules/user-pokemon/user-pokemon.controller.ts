import { ResponseMessage } from '@/i18n/response-message'
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
  constructor(private readonly userPokemonService: UserPokemonService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(UserPokemonMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO, @ActiveUser('userId') userId: number) {
    return this.userPokemonService.list(query, userId)
  }

  @Get('user/pokemons/stats')
  @ZodSerializerDto(GetUserPokemonStatsResDTO)
  @ResponseMessage(UserPokemonMessage.GET_STATS_SUCCESS)
  async getUserPokemonStats(@ActiveUser('userId') userId: number) {
    return this.userPokemonService.getUserPokemonStats(userId)
  }

  @Get('user/rounds/pokemons')
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(UserPokemonMessage.GET_LIST_SUCCESS)
  async getPokemonListWithUserByRounds(
    @Query() query: PaginationQueryDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userPokemonService.getPokemonListWithUserByRounds(query, userId)
  }

  @Get('user/pokemons')
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(UserPokemonMessage.GET_LIST_SUCCESS)
  async getPokemonListWithUser(
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
  @ResponseMessage(UserPokemonMessage.GET_LIST_SUCCESS)
  async getWithUserId(@ActiveUser('userId') userId: number) {
    return this.userPokemonService.listWithUserId(userId)
  }

  @Get('evolves/:pokemonId')
  @ZodSerializerDto(GetUserPokemonByPokemonIdwithListOwnershipResDTO)
  @ResponseMessage(UserPokemonMessage.GET_DETAIL_SUCCESS)
  async getWithEvolvesPokemon(
    @Param() params: GetUserPokemonByPokemonIdParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userPokemonService.getWithEvolvesPokemon(params.pokemonId, userId)
  }

  @Get(':userPokemonId')
  @ZodSerializerDto(GetUserPokemonDetailResDTO)
  @ResponseMessage(UserPokemonMessage.GET_DETAIL_SUCCESS)
  async findById(
    @Param() params: GetUserPokemonParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userPokemonService.findById(params.userPokemonId)
  }

  @Post()
  @ZodSerializerDto(CreateUserPokemonResDTO)
  @ResponseMessage(UserPokemonMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreateUserPokemonBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userPokemonService.create({
      userId,
      data: body
    })
  }

  @Put(':userPokemonId')
  @ZodSerializerDto(UpdateUserPokemonResDTO)
  @ResponseMessage(UserPokemonMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateUserPokemonBodyDTO,
    @Param() params: GetUserPokemonParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userPokemonService.update({
      data: body,
      id: params.userPokemonId,
      userId
    })
  }

  @Delete(':userPokemonId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(UserPokemonMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetUserPokemonParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.userPokemonService.delete({
      id: params.userPokemonId,
      userId
    })
  }

  // Admin endpoints
  // @Get('admin/all')
  // @IsPublic() // Remove this in production, add admin guard
  // @ZodSerializerDto(PaginationResponseDTO)
  // adminList(@Query() query: PaginationQueryDTO) {
  //   return this.userPokemonService.list(query)
  // }
}
