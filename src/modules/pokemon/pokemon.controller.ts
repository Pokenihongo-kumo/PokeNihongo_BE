import { ResponseMessage, msg } from '@/i18n/response-message'
import { PokemonMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiQuery } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { PaginationQueryDto } from './dto/pokemon.dto'
import {
  CreatePokemonBodyDTO,
  CreatePokemonResDTO,
  GetEvolutionOptionsResDTO,
  GetPokemonDetailResDTO,
  GetPokemonParamsDTO,
  GetPokemonResDTO,
  GetPokemonWeaknessResDTO,
  UpdatePokemonBodyDTO,
  UpdatePokemonResDTO
} from './dto/pokemon.zod-dto'
import { PokemonService } from './pokemon.service'
@Controller('pokemon')
export class PokemonController {
  constructor(private readonly pokemonService: PokemonService) {}

  @Get()
  @IsPublic()
  @ApiQuery({ type: PaginationQueryDto })
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(PokemonMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.pokemonService.list(query)
  }

  // @Get('starters')
  // @IsPublic()
  // getStarters() {
  //   return this.pokemonService.getStarterPokemons()
  // }

  // @Get('rarity/:rarity')
  // @IsPublic()
  // getByRarity(@Param('rarity') rarity: string) {
  //   return this.pokemonService.getPokemonsByRarity(rarity)
  // }

  // @Get('type/:typeName')
  // @IsPublic()
  // getByType(@Param('typeName') typeName: string) {
  //   return this.pokemonService.getPokemonsByType(typeName)
  // }

  @Get('start-evolution')
  @ZodSerializerDto(GetPokemonResDTO)
  @ResponseMessage(PokemonMessage.GET_LIST_SUCCESS)
  async getListPokeWithStartEvolu() {
    return this.pokemonService.getListPokeWithStartEvolu()
  }

  @Get(':pokemonId/weaknesses')
  @IsPublic()
  @ZodSerializerDto(GetPokemonWeaknessResDTO)
  async getWeaknesses(@Param() params: GetPokemonParamsDTO) {
    const { hasTypes, data } = await this.pokemonService.calculatePokemonWeaknesses(
      params.pokemonId
    )
    // a Pokemon without types has no weakness to compute
    return {
      message: msg(
        hasTypes
          ? PokemonMessage.CALCULATE_WEAKNESS_SUCCESS
          : PokemonMessage.NO_TYPE_WEAKNESS
      ),
      data
    }
  }

  @Get(':pokemonId/evolution-options')
  @IsPublic()
  @ZodSerializerDto(GetEvolutionOptionsResDTO)
  @ResponseMessage(PokemonMessage.GET_EVOLUTION_OPTIONS_SUCCESS)
  async getEvolutionOptions(@Param() params: GetPokemonParamsDTO) {
    return this.pokemonService.getEvolutionOptions(params.pokemonId)
  }

  @Get(':pokemonId')
  @IsPublic()
  @ZodSerializerDto(GetPokemonDetailResDTO)
  @ResponseMessage(PokemonMessage.GET_DETAIL_SUCCESS)
  async findById(@Param() params: GetPokemonParamsDTO) {
    return this.pokemonService.findById(params.pokemonId)
  }

  @Post()
  @IsPublic()
  @ZodSerializerDto(CreatePokemonResDTO)
  @ResponseMessage(PokemonMessage.CREATE_SUCCESS)
  async create(@Body() body: CreatePokemonBodyDTO, @ActiveUser('userId') userId: number) {
    return this.pokemonService.create({
      data: body,
      createdById: userId
    })
  }

  @Put(':pokemonId')
  @IsPublic()
  @ZodSerializerDto(UpdatePokemonResDTO)
  @ResponseMessage(PokemonMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdatePokemonBodyDTO,
    @Param() params: GetPokemonParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.pokemonService.update({
      data: body,
      id: params.pokemonId,
      updatedById: userId
    })
  }

  @Delete(':pokemonId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(PokemonMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetPokemonParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.pokemonService.delete({
      id: params.pokemonId,
      deletedById: userId
    })
  }

  // @Post(':pokemonId/assign-types')
  // @ZodSerializerDto(MessageResDTO)
  // assignTypes(
  //   @Param() params: GetPokemonParamsDTO,
  //   @Body() body: AssignPokemonTypesBodyDTO
  // ) {
  //   return this.pokemonService.assignTypes(params.pokemonId, body)
  // }
}
