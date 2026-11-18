import { FolderName } from '@/common/constants/media.constant'
import { I18nService } from '@/i18n/i18n.service'
import { PokemonMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { UploadService } from 'src/3rdService/upload/upload.service'
import { TypeEffectivenessService } from '@/modules/type-effectiveness/type-effectiveness.service'
import {
  PokemonAlreadyExistsException,
  PokemonNotFoundException
} from './dto/pokemon.error'
import {
  AssignPokemonTypesBodyType,
  CreatePokemonBodyType,
  CreatePokemonFormDataType,
  UpdatePokemonBodyType,
  UpdatePokemonFormDataType
} from './entities/pokemon.entity'
import { PokemonRepo } from './pokemon.repo'

@Injectable()
export class PokemonService {
  constructor(
    private pokemonRepo: PokemonRepo,
    private uploadService: UploadService,
    private readonly typeEffectivenessService: TypeEffectivenessService,
    private readonly i18nService: I18nService
  ) {}

  // Helper function to normalize form-data to standard format
  private normalizeCreateData(
    data: CreatePokemonBodyType | CreatePokemonFormDataType
  ): CreatePokemonBodyType {
    return {
      pokedex_number: data.pokedex_number,
      nameJp: data.nameJp,
      nameTranslations: data.nameTranslations,
      description: data.description ?? null,
      conditionLevel: data.conditionLevel ?? null,
      nextPokemonsId: data.nextPokemonsId ?? [],
      isStarted: data.isStarted,
      imageUrl: data.imageUrl ?? null,
      rarity: data.rarity,
      typeIds: data.typeIds
    }
  }

  // Helper function to normalize update data
  private normalizeUpdateData(
    data: UpdatePokemonBodyType | UpdatePokemonFormDataType
  ): UpdatePokemonBodyType {
    return {
      ...data,
      description: data.description === undefined ? undefined : (data.description ?? null)
    }
  }

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.pokemonRepo.list(pagination)

    // Optimize: Calculate weaknesses for all Pokemon in batch
    if (data.results && data.results.length > 0) {
      // Get all unique type IDs from all Pokemon
      const allTypeIds = new Set<number>()
      data.results.forEach((pokemon: any) => {
        pokemon.types?.forEach((type: any) => {
          allTypeIds.add(type.id)
        })
      })

      // Batch load all type effectiveness data once
      const allTypeEffectiveness =
        await this.typeEffectivenessService.findWeaknessesForDefenders(
          Array.from(allTypeIds)
        )

      // Create lookup map for faster access
      const effectivenessMap = new Map<number, any[]>()
      allTypeEffectiveness.forEach((eff) => {
        if (!effectivenessMap.has(eff.defenderId)) {
          effectivenessMap.set(eff.defenderId, [])
        }
        effectivenessMap.get(eff.defenderId)!.push({
          ...eff.attacker,
          effectiveness_multiplier: eff.multiplier
        })
      })

      // Calculate weaknesses for each Pokemon using cached data
      const pokemonWithWeaknesses = data.results.map((pokemon: any) => {
        const allWeaknesses = new Map<number, any>()

        pokemon.types?.forEach((type: any) => {
          const weaknesses = effectivenessMap.get(type.id) || []
          weaknesses.forEach((weakness) => {
            if (
              !allWeaknesses.has(weakness.id) ||
              allWeaknesses.get(weakness.id).effectiveness_multiplier <
                weakness.effectiveness_multiplier
            ) {
              allWeaknesses.set(weakness.id, weakness)
            }
          })
        })

        return {
          ...pokemon,
          weaknesses: Array.from(allWeaknesses.values())
        }
      })

      data.results = pokemonWithWeaknesses
    }

    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(PokemonMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const pokemon = await this.pokemonRepo.findById(id)
    if (!pokemon) {
      throw new PokemonNotFoundException()
    }

    // Calculate weaknesses for this Pokemon
    const weaknesses = await this.getWeaknessesForPokemon(pokemon.types)

    return {
      statusCode: 200,
      data: {
        ...pokemon,
        weaknesses
      },
      message: this.i18nService.translate(PokemonMessage.GET_DETAIL_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreatePokemonBodyType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    try {
      // Normalize data to standard format
      let pokemonData = this.normalizeCreateData(data)

      // Check if Pokemon with same pokedex number exists
      const existingPokemon = await this.pokemonRepo.findByPokedexNumber(
        pokemonData.pokedex_number
      )
      if (existingPokemon) {
        throw new PokemonAlreadyExistsException()
      }

      // Create Pokemon first
      const result = await this.pokemonRepo.create({
        createdById,
        data: pokemonData
      })

      // If has nextPokemons, update each next Pokemon's previousPokemons relation
      if (pokemonData.nextPokemonsId && pokemonData.nextPokemonsId.length > 0) {
        for (const nextPokemonId of pokemonData.nextPokemonsId) {
          await this.pokemonRepo.addToPreviousPokemons(nextPokemonId, result.id)
        }
      }

      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(PokemonMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new PokemonAlreadyExistsException()
      }
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async update(
    {
      id,
      data,
      updatedById,
      imageFile
    }: {
      id: number
      data: UpdatePokemonBodyType | UpdatePokemonFormDataType
      updatedById: number
      imageFile?: Express.Multer.File
    },
    lang: string = 'vi'
  ) {
    try {
      // Normalize data
      let pokemonData = this.normalizeUpdateData(data)

      const existPokemon = await this.pokemonRepo.findById(id)
      if (!existPokemon) {
        throw new PokemonNotFoundException()
      }

      // Check if updating pokedex number to existing one
      if (pokemonData.pokedex_number) {
        const existingWithPokedex = await this.pokemonRepo.findByPokedexNumber(
          pokemonData.pokedex_number
        )
        if (existingWithPokedex && existingWithPokedex.id !== id) {
          throw new PokemonAlreadyExistsException()
        }
      }

      // Upload new image if provided
      if (imageFile) {
        const uploadResult = await this.uploadService.uploadFileByType(
          imageFile,
          FolderName.POKEMON
        )
        pokemonData.imageUrl = uploadResult.url

        // Delete old image if exists
        if (existPokemon.imageUrl) {
          try {
            await this.uploadService.deleteFile(existPokemon.imageUrl, FolderName.POKEMON)
          } catch (error) {
            // Log warning but don't fail the update
            console.warn('Failed to delete old Pokemon image:', error)
          }
        }
      }

      // Handle evolution relation changes
      const oldNextPokemonIds = existPokemon.nextPokemons?.map((p) => p.id) || []
      const newNextPokemonIds =
        pokemonData.nextPokemonsId !== undefined
          ? pokemonData.nextPokemonsId
          : oldNextPokemonIds // Keep old value if not provided in update

      // Find IDs to remove and add
      const toRemove = oldNextPokemonIds.filter((id) => !newNextPokemonIds.includes(id))
      const toAdd = newNextPokemonIds.filter((id) => !oldNextPokemonIds.includes(id))

      // Remove from old next Pokemons' previousPokemons
      for (const nextPokemonId of toRemove) {
        if (nextPokemonId !== undefined) {
          try {
            await this.pokemonRepo.removeFromPreviousPokemons(nextPokemonId, id)
          } catch (error) {
            console.warn(
              'Failed to remove from old next Pokemon previousPokemons:',
              error
            )
          }
        }
      }

      // Add to new next Pokemons' previousPokemons
      for (const nextPokemonId of toAdd) {
        if (nextPokemonId !== undefined) {
          try {
            await this.pokemonRepo.addToPreviousPokemons(nextPokemonId, id)
          } catch (error) {
            console.warn('Failed to add to new next Pokemon previousPokemons:', error)
          }
        }
      }

      const pokemon = await this.pokemonRepo.update({
        id,
        updatedById,
        data: pokemonData
      })
      return {
        statusCode: 200,
        data: pokemon,
        message: this.i18nService.translate(PokemonMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new PokemonNotFoundException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new PokemonAlreadyExistsException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete(
    { id, deletedById }: { id: number; deletedById: number },
    lang: string = 'vi'
  ) {
    try {
      const existPokemon = await this.pokemonRepo.findById(id)
      if (!existPokemon) {
        throw new PokemonNotFoundException()
      }

      // Remove from next Pokemons' previousPokemons if this Pokemon has evolutions
      if (existPokemon.nextPokemons && existPokemon.nextPokemons.length > 0) {
        for (const nextPokemon of existPokemon.nextPokemons) {
          if (nextPokemon.id !== undefined) {
            try {
              await this.pokemonRepo.removeFromPreviousPokemons(nextPokemon.id, id)
            } catch (error) {
              console.warn(
                'Failed to remove from next Pokemon previousPokemons on delete:',
                error
              )
            }
          }
        }
      }

      await this.pokemonRepo.delete({
        id,
        deletedById
      })
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(PokemonMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new PokemonNotFoundException()
      }
      throw error
    }
  }

  async assignTypes(id: number, data: AssignPokemonTypesBodyType, lang: string = 'vi') {
    try {
      const existPokemon = await this.pokemonRepo.findById(id)
      if (!existPokemon) {
        throw new PokemonNotFoundException()
      }

      await this.pokemonRepo.assignTypes(id, data)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(PokemonMessage.ASSIGN_TYPES_SUCCESS)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new PokemonNotFoundException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async getStarterPokemons() {
    const data = await this.pokemonRepo.getStarterPokemons()

    // Calculate weaknesses for each starter Pokemon
    if (data && data.length > 0) {
      const pokemonWithWeaknesses = await Promise.all(
        data.map(async (pokemon: any) => {
          const weaknesses = await this.getWeaknessesForPokemon(pokemon.types)
          return {
            ...pokemon,
            weaknesses
          }
        })
      )

      return {
        statusCode: 200,
        data: pokemonWithWeaknesses,
        message: 'Lấy danh sách Pokemon khởi đầu thành công'
      }
    }

    return {
      statusCode: 200,
      data,
      message: 'Lấy danh sách Pokemon khởi đầu thành công'
    }
  }

  async getPokemonsByRarity(rarity: string) {
    const data = await this.pokemonRepo.getPokemonsByRarity(rarity)

    // Calculate weaknesses for each Pokemon by rarity
    if (data && data.length > 0) {
      const pokemonWithWeaknesses = await Promise.all(
        data.map(async (pokemon: any) => {
          const weaknesses = await this.getWeaknessesForPokemon(pokemon.types)
          return {
            ...pokemon,
            weaknesses
          }
        })
      )

      return {
        statusCode: 200,
        data: pokemonWithWeaknesses,
        message: `Lấy danh sách Pokemon ${rarity} thành công`
      }
    }

    return {
      statusCode: 200,
      data,
      message: `Lấy danh sách Pokemon ${rarity} thành công`
    }
  }

  async getPokemonsByType(typeName: string) {
    const data = await this.pokemonRepo.getPokemonsByType(typeName)

    // Calculate weaknesses for each Pokemon by type
    if (data && data.length > 0) {
      const pokemonWithWeaknesses = await Promise.all(
        data.map(async (pokemon: any) => {
          const weaknesses = await this.getWeaknessesForPokemon(pokemon.types)
          return {
            ...pokemon,
            weaknesses
          }
        })
      )

      return {
        statusCode: 200,
        data: pokemonWithWeaknesses,
        message: `Lấy danh sách Pokemon hệ ${typeName} thành công`
      }
    }

    return {
      statusCode: 200,
      data,
      message: `Lấy danh sách Pokemon hệ ${typeName} thành công`
    }
  }

  // Calculate Pokemon weaknesses based on its types
  async calculatePokemonWeaknesses(pokemonId: number, lang: string = 'vi') {
    // Get Pokemon with its types
    const pokemon = await this.pokemonRepo.findById(pokemonId)
    if (!pokemon) {
      throw new PokemonNotFoundException()
    }

    if (!pokemon.types || pokemon.types.length === 0) {
      return {
        statusCode: 200,
        data: {
          pokemon: {
            id: pokemon.id,
            nameJp: pokemon.nameJp,
            nameTranslations: pokemon.nameTranslations
          },
          weaknesses: []
        },
        message: this.i18nService.translate(PokemonMessage.NO_TYPE_WEAKNESS, lang)
      }
    }

    // Get all type effectiveness where Pokemon's types are defenders
    const typeIds = pokemon.types.map((type) => type.id)

    // Get all attacking types and their effectiveness against Pokemon's types
    const typeEffectiveness =
      await this.typeEffectivenessService.findForDefendersWithTypes(typeIds)

    // Calculate combined effectiveness for each attacking type
    const weaknessMap = new Map<
      number,
      {
        type: any
        multiplier: number
      }
    >()

    // Group by attacker type
    const attackerGroups = new Map<number, any[]>()
    for (const effectiveness of typeEffectiveness) {
      const attackerId = effectiveness.attackerId
      if (!attackerGroups.has(attackerId)) {
        attackerGroups.set(attackerId, [])
      }
      attackerGroups.get(attackerId)!.push(effectiveness)
    }

    // Calculate final multiplier for each attacking type
    for (const [attackerId, effectivenesses] of attackerGroups) {
      let finalMultiplier = 1
      const attackerType = effectivenesses[0].attacker

      // Multiply effectiveness against each defending type
      for (const effectiveness of effectivenesses) {
        finalMultiplier *= effectiveness.multiplier
      }

      // Only include if it's a weakness (multiplier > 1)
      if (finalMultiplier > 1) {
        weaknessMap.set(attackerId, {
          type: attackerType,
          multiplier: finalMultiplier
        })
      }
    }

    // Convert to array and sort by multiplier (highest first)
    const weaknesses = Array.from(weaknessMap.values()).sort(
      (a, b) => b.multiplier - a.multiplier
    )

    return {
      statusCode: 200,
      data: {
        pokemon: {
          id: pokemon.id,
          nameJp: pokemon.nameJp,
          nameTranslations: pokemon.nameTranslations,
          types: pokemon.types
        },
        weaknesses: weaknesses.map((w) => ({
          ...w.type,
          effectiveness_multiplier: w.multiplier
        }))
      },
      message: this.i18nService.translate(PokemonMessage.CALCULATE_WEAKNESS_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (for internal use)
  async getWeaknessesForPokemon(pokemonTypes: any[] | undefined) {
    if (!pokemonTypes || pokemonTypes.length === 0) {
      return []
    }

    const typeIds = pokemonTypes.map((type) => type.id)

    const typeEffectiveness =
      await this.typeEffectivenessService.findForDefenders(typeIds)

    const weaknessMap = new Map<
      number,
      {
        type: any
        multiplier: number
      }
    >()

    const attackerGroups = new Map<number, any[]>()
    for (const effectiveness of typeEffectiveness) {
      const attackerId = effectiveness.attackerId
      if (!attackerGroups.has(attackerId)) {
        attackerGroups.set(attackerId, [])
      }
      attackerGroups.get(attackerId)!.push(effectiveness)
    }

    for (const [attackerId, effectivenesses] of attackerGroups) {
      let finalMultiplier = 1
      const attackerType = effectivenesses[0].attacker

      for (const effectiveness of effectivenesses) {
        finalMultiplier *= effectiveness.multiplier
      }

      if (finalMultiplier > 1) {
        weaknessMap.set(attackerId, {
          type: attackerType,
          multiplier: finalMultiplier
        })
      }
    }

    return Array.from(weaknessMap.values())
      .sort((a, b) => b.multiplier - a.multiplier)
      .map((w) => ({
        ...w.type,
        effectiveness_multiplier: w.multiplier
      }))
  } /**
   * Get available evolution options for a Pokemon
   */
  async getEvolutionOptions(pokemonId: number, lang: string = 'vi') {
    try {
      const pokemon = await this.pokemonRepo.findById(pokemonId)
      if (!pokemon) {
        throw new PokemonNotFoundException()
      }

      // Get evolution options (nextPokemons)
      const evolutionOptions = pokemon.nextPokemons || []

      return {
        statusCode: 200,
        data: evolutionOptions,
        message: this.i18nService.translate(
          PokemonMessage.GET_EVOLUTION_OPTIONS_SUCCESS,
          lang
        )
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new PokemonNotFoundException()
      }
      throw error
    }
  }

  async getListPokeWithStartEvolu(lang: string = 'vi') {
    const data = await this.pokemonRepo.getPokemonsWithoutPreviousEvolution()

    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(PokemonMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // ---- Catalog lookups for other modules (module-boundary plan B3) ----
  // Same arguments and results as the repo methods; no message, no throw.

  getById(...args: Parameters<PokemonRepo['findById']>) {
    return this.pokemonRepo.findById(...args)
  }

  findAllRandomable() {
    return this.pokemonRepo.findAllRandomable()
  }

  countAll() {
    return this.pokemonRepo.countAll()
  }

  getPokemonListWithPokemonUser(
    ...args: Parameters<PokemonRepo['getPokemonListWithPokemonUser']>
  ) {
    return this.pokemonRepo.getPokemonListWithPokemonUser(...args)
  }

  getRandomPokemonsByTypeAndRarity(
    ...args: Parameters<PokemonRepo['getRandomPokemonsByTypeAndRarity']>
  ) {
    return this.pokemonRepo.getRandomPokemonsByTypeAndRarity(...args)
  }

  listWithNameNumImg(...args: Parameters<PokemonRepo['listWithNameNumImg']>) {
    return this.pokemonRepo.listWithNameNumImg(...args)
  }
}
