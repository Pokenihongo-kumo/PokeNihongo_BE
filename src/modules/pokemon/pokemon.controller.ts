import { I18nService } from '@/i18n/i18n.service'
import { PokemonMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
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
  constructor(
    private readonly pokemonService: PokemonService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @IsPublic()
  @ApiQuery({ type: PaginationQueryDto })
  @ZodSerializerDto(PaginationResponseDTO)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(PokemonMessage.GET_LIST_SUCCESS, lang),
      data: await this.pokemonService.list(query)
    }
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
  async getListPokeWithStartEvolu(@I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(PokemonMessage.GET_LIST_SUCCESS, lang),
      data: await this.pokemonService.getListPokeWithStartEvolu()
    }
  }

  @Get(':pokemonId/weaknesses')
  @IsPublic()
  @ZodSerializerDto(GetPokemonWeaknessResDTO)
  async getWeaknesses(@Param() params: GetPokemonParamsDTO, @I18nLang() lang: string) {
    const { hasTypes, data } = await this.pokemonService.calculatePokemonWeaknesses(
      params.pokemonId
    )
    // a Pokemon without types has no weakness to compute
    return {
      message: this.i18nService.translate(
        hasTypes
          ? PokemonMessage.CALCULATE_WEAKNESS_SUCCESS
          : PokemonMessage.NO_TYPE_WEAKNESS,
        lang
      ),
      data
    }
  }

  @Get(':pokemonId/evolution-options')
  @IsPublic()
  @ZodSerializerDto(GetEvolutionOptionsResDTO)
  async getEvolutionOptions(
    @Param() params: GetPokemonParamsDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(
        PokemonMessage.GET_EVOLUTION_OPTIONS_SUCCESS,
        lang
      ),
      data: await this.pokemonService.getEvolutionOptions(params.pokemonId)
    }
  }

  @Get(':pokemonId')
  @IsPublic()
  @ZodSerializerDto(GetPokemonDetailResDTO)
  async findById(@Param() params: GetPokemonParamsDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(PokemonMessage.GET_DETAIL_SUCCESS, lang),
      data: await this.pokemonService.findById(params.pokemonId)
    }
  }

  @Post()
  @IsPublic()
  @ZodSerializerDto(CreatePokemonResDTO)
  async create(
    @Body() body: CreatePokemonBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(PokemonMessage.CREATE_SUCCESS, lang),
      data: await this.pokemonService.create({
        data: body,
        createdById: userId
      })
    }
  }

  @Put(':pokemonId')
  @IsPublic()
  @ZodSerializerDto(UpdatePokemonResDTO)
  async update(
    @Body() body: UpdatePokemonBodyDTO,
    @Param() params: GetPokemonParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(PokemonMessage.UPDATE_SUCCESS, lang),
      data: await this.pokemonService.update({
        data: body,
        id: params.pokemonId,
        updatedById: userId
      })
    }
  }

  @Delete(':pokemonId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetPokemonParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.pokemonService.delete({
      id: params.pokemonId,
      deletedById: userId
    })
    return {
      message: this.i18nService.translate(PokemonMessage.DELETE_SUCCESS, lang),
      data: null
    }
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
