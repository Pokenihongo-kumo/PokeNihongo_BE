import { RarityPokemonType } from '@/common/constants/pokemon.constant'
import { GachaBannerStatus } from '@/common/constants/shop-banner.constant'
import { GachaItemRateService } from '@/modules/gacha-item-rate/gacha-item-rate.service'
import { PokemonService } from '@/modules/pokemon/pokemon.service'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQuery } from '@/shared/models/request.model'
import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { GachaStarType, RarityPokemon } from '@prisma/client'
import { GachaBannerRepo } from '../gacha-banner/gacha-banner.repo'
import {
  DuplicateStarTypeInListException,
  GachaBannerActiveException,
  GachaBannerExpiredException,
  GachaBannerInactiveException,
  GachaItemNotFoundException,
  InvalidGachaBannerException,
  MaxGachaItemsExceededException,
  PokemonDuplicateInGachaException,
  PokemonInvalidRarityWithStarTypeToAddException
} from './dto/gacha-item.error'
import {
  CreateWithListItemBody,
  GetRamdomAmountGachaItemsBody,
  UpdateWithListGachaItemBody
} from './dto/gacha-item.zod-dto'
import { GachaItemRepo } from './gacha-item.repo'

const STAR_TYPE_TO_RARITY: Record<GachaStarType, RarityPokemonType> = {
  [GachaStarType.ONE]: RarityPokemon.COMMON,
  [GachaStarType.TWO]: RarityPokemon.UNCOMMON,
  [GachaStarType.THREE]: RarityPokemon.RARE,
  [GachaStarType.FOUR]: RarityPokemon.EPIC,
  [GachaStarType.FIVE]: RarityPokemon.LEGENDARY
}

const RARITY_TO_STAR_TYPE: Record<RarityPokemon, GachaStarType> = {
  [RarityPokemon.COMMON]: GachaStarType.ONE,
  [RarityPokemon.UNCOMMON]: GachaStarType.TWO,
  [RarityPokemon.RARE]: GachaStarType.THREE,
  [RarityPokemon.EPIC]: GachaStarType.FOUR,
  [RarityPokemon.LEGENDARY]: GachaStarType.FIVE
}

@Injectable()
export class GachaItemService {
  constructor(
    private gachaItemRepo: GachaItemRepo,
    @Inject(forwardRef(() => GachaBannerRepo))
    private gachaBannerRepo: GachaBannerRepo,
    private gachaItemRateService: GachaItemRateService,
    private pokemonService: PokemonService
  ) {}

  async list(pagination: PaginationQuery) {
    const data = await this.gachaItemRepo.list(pagination)
    return data
  }

  async findById(id: number) {
    const gachaItem = await this.gachaItemRepo.findById(id)
    if (!gachaItem) {
      throw new GachaItemNotFoundException()
    }
    return gachaItem
  }

  private async validateGachaBannerForCreate(bannerId: number) {
    const banner = await this.gachaBannerRepo.findById(bannerId)
    if (!banner) throw new InvalidGachaBannerException()
    if (banner.status === GachaBannerStatus.INACTIVE)
      throw new GachaBannerInactiveException()
    if (banner.status === GachaBannerStatus.ACTIVE) throw new GachaBannerActiveException()
    if (banner.status === GachaBannerStatus.EXPIRED)
      throw new GachaBannerExpiredException()
    return banner
  }

  private async validateItemCountByStarType(
    banner: any,
    starType: GachaStarType,
    additionalCount: number = 1
  ) {
    const currentCount = await this.gachaItemRepo.countItemsByStarType(
      banner.id,
      starType
    )
    const limitMap = {
      [GachaStarType.ONE]: banner.amount1Star,
      [GachaStarType.TWO]: banner.amount2Star,
      [GachaStarType.THREE]: banner.amount3Star,
      [GachaStarType.FOUR]: banner.amount4Star,
      [GachaStarType.FIVE]: banner.amount5Star
    }
    if (currentCount + additionalCount > limitMap[starType]) {
      throw new MaxGachaItemsExceededException(
        `${starType}: ${currentCount} + ${additionalCount} > ${limitMap[starType]}`
      )
    }
  }

  /**
   * OPTIMIZED: Batch queries instead of loop
   */
  async createByList(createdById: number, data: CreateWithListItemBody) {
    const { bannerId, items } = data
    const banner = await this.validateGachaBannerForCreate(bannerId)

    // Collect IDs
    const allPokemonIds = new Set<number>()
    const starTypes = new Set<GachaStarType>()
    items.forEach((item) => {
      starTypes.add(item.starType)
      item.pokemons.forEach((id) => allPokemonIds.add(id))
    })

    // Batch fetch rates
    const rates = await Promise.all(
      Array.from(starTypes).map((st) => this.gachaItemRateService.getByType(st))
    )
    const rateMap = new Map<GachaStarType, number>()
    rates.forEach((r, i) => r && rateMap.set(Array.from(starTypes)[i], r.id))

    // Batch fetch pokemons
    const pokemons = await Promise.all(
      Array.from(allPokemonIds).map((id) => this.pokemonService.getById(id))
    )
    const pokemonMap = new Map(pokemons.filter((p) => p).map((p) => [p!.id, p!]))

    // Prepare items
    const itemsToCreate: Array<{
      bannerId: number
      pokemonId: number
      gachaItemRateId: number
      starType: GachaStarType
    }> = []

    for (const item of items) {
      const rateId = rateMap.get(item.starType)
      if (!rateId) throw new NotFoundRecordException()

      for (const pokemonId of item.pokemons) {
        const pokemon = pokemonMap.get(pokemonId)
        if (!pokemon) throw new NotFoundRecordException()

        if (RARITY_TO_STAR_TYPE[pokemon.rarity] !== item.starType)
          throw new PokemonInvalidRarityWithStarTypeToAddException(
            `pokedex_number: ${pokemon.pokedex_number}`
          )

        itemsToCreate.push({
          bannerId,
          pokemonId,
          gachaItemRateId: rateId,
          starType: item.starType
        })
      }
    }

    // Check duplicates (batch)
    const existing = await this.gachaItemRepo.list({
      currentPage: 1,
      pageSize: 1000,
      qs: `bannerId=${bannerId}`
    })
    const existingIds = new Set(existing.results.map((i) => i.pokemonId))
    if (itemsToCreate.some((i) => existingIds.has(i.pokemonId))) {
      throw new PokemonDuplicateInGachaException()
    }

    // Validate counts
    const counts: Record<GachaStarType, number> = {
      [GachaStarType.ONE]: 0,
      [GachaStarType.TWO]: 0,
      [GachaStarType.THREE]: 0,
      [GachaStarType.FOUR]: 0,
      [GachaStarType.FIVE]: 0
    }
    itemsToCreate.forEach((i) => counts[i.starType]++)
    for (const [st, count] of Object.entries(counts)) {
      if (count > 0)
        await this.validateItemCountByStarType(banner, st as GachaStarType, count)
    }

    // Create (single batch query)
    try {
      const created = await this.gachaItemRepo.createMany({
        createdById,
        items: itemsToCreate
      })
      return created
    } catch (error) {
      if (isForeignKeyConstraintPrismaError(error))
        throw new InvalidGachaBannerException()
      throw error
    }
  }

  /**
   * OPTIMIZED: Use deleteMany instead of loop
   */
  async updateByList(updatedById: number, data: UpdateWithListGachaItemBody) {
    try {
      const created = await this.gachaItemRepo.withTransaction(async (prismaTx) => {
        const { bannerId, items } = data
        const banner = await this.validateGachaBannerForCreate(bannerId)

        // 1. Delete old items
        await this.gachaItemRepo.deleteByBanner(bannerId, prismaTx)

        // Collect IDs
        const allPokemonIds = new Set<number>()
        const starTypes = new Set<GachaStarType>()
        items.forEach((item) => {
          starTypes.add(item.starType)
          item.pokemons.forEach((id) => allPokemonIds.add(id))
        })

        // Batch fetch rates
        const rates = await Promise.all(
          Array.from(starTypes).map((st) => this.gachaItemRateService.getByType(st))
        )
        const rateMap = new Map<GachaStarType, number>()
        rates.forEach((r, i) => r && rateMap.set(Array.from(starTypes)[i], r.id))

        // Batch fetch pokemons
        const pokemons = await Promise.all(
          Array.from(allPokemonIds).map((id) => this.pokemonService.getById(id))
        )
        const pokemonMap = new Map(pokemons.filter((p) => p).map((p) => [p!.id, p!]))

        // 2. Validate and prepare items
        const itemsToCreate: Array<{
          bannerId: number
          pokemonId: number
          gachaItemRateId: number
          starType: GachaStarType // ✅ THÊM: Track starType
        }> = []

        const seenStarTypes = new Set<GachaStarType>()

        for (const item of items) {
          if (seenStarTypes.has(item.starType)) {
            throw new DuplicateStarTypeInListException()
          }
          seenStarTypes.add(item.starType)

          const rateId = rateMap.get(item.starType)
          if (!rateId) throw new NotFoundRecordException()

          const pokemonIdsInThisStarType = new Set<number>()
          for (const pokemonId of item.pokemons) {
            if (pokemonIdsInThisStarType.has(pokemonId)) {
              throw new PokemonDuplicateInGachaException()
            }
            pokemonIdsInThisStarType.add(pokemonId)

            const pokemon = pokemonMap.get(pokemonId)
            if (!pokemon) throw new NotFoundRecordException()

            if (RARITY_TO_STAR_TYPE[pokemon.rarity] !== item.starType)
              throw new PokemonInvalidRarityWithStarTypeToAddException(
                `pokedex_number: ${pokemon.pokedex_number}`
              )

            itemsToCreate.push({
              bannerId,
              pokemonId,
              gachaItemRateId: rateId,
              starType: item.starType // ✅ LƯU starType
            })
          }
        }

        // 3. Validate counts against banner limits
        const counts: Record<GachaStarType, number> = {
          [GachaStarType.ONE]: 0,
          [GachaStarType.TWO]: 0,
          [GachaStarType.THREE]: 0,
          [GachaStarType.FOUR]: 0,
          [GachaStarType.FIVE]: 0
        }
        // ✅ SỬA: Đếm theo starType thay vì gachaItemRateId
        itemsToCreate.forEach((i) => counts[i.starType]++)

        const limitMap = {
          [GachaStarType.ONE]: banner.amount1Star,
          [GachaStarType.TWO]: banner.amount2Star,
          [GachaStarType.THREE]: banner.amount3Star,
          [GachaStarType.FOUR]: banner.amount4Star,
          [GachaStarType.FIVE]: banner.amount5Star
        }

        for (const [st, count] of Object.entries(counts)) {
          const starType = st as GachaStarType
          if (count > limitMap[starType]) {
            throw new MaxGachaItemsExceededException(
              `${starType}: ${count} > ${limitMap[starType]}`
            )
          }
        }

        // 4. Create new items
        if (itemsToCreate.length > 0) {
          await this.gachaItemRepo.createManyForBanner(
            itemsToCreate,
            updatedById,
            prismaTx
          )
        }

        // 5. Fetch created items with relations
        return await this.gachaItemRepo.findCreatedForBanner(
          bannerId,
          itemsToCreate.map((item) => item.pokemonId),
          prismaTx
        )
      })

      return created
    } catch (error) {
      if (isForeignKeyConstraintPrismaError(error))
        throw new InvalidGachaBannerException()
      throw error
    }
  }

  async getRandomListItem(data: GetRamdomAmountGachaItemsBody) {
    const { bannerId, items } = data
    const banner = await this.gachaBannerRepo.findById(bannerId)
    if (!banner) throw new InvalidGachaBannerException()

    const amounts: Record<GachaStarType, number> = {
      [GachaStarType.ONE]: banner.amount1Star,
      [GachaStarType.TWO]: banner.amount2Star,
      [GachaStarType.THREE]: banner.amount3Star,
      [GachaStarType.FOUR]: banner.amount4Star,
      [GachaStarType.FIVE]: banner.amount5Star
    }

    const results: Array<{ starType: GachaStarType; pokemons: any[] }> = []

    for (const item of items) {
      const limit = amounts[item.starType]
      if (limit === 0) continue

      const rarity = STAR_TYPE_TO_RARITY[item.starType]
      const pokemons = await this.pokemonService.getRandomPokemonsByTypeAndRarity({
        limit,
        rarity,
        typeIds: item.typeIds,
        excludeIds: []
      })

      results.push({ starType: item.starType, pokemons })
    }

    return { bannerId, items: results }
  }

  async delete(id: number) {
    try {
      await this.gachaItemRepo.delete(id)
      return
    } catch (error) {
      if (isNotFoundPrismaError(error)) throw new GachaItemNotFoundException()
      throw error
    }
  }

  async getListPokemonWithGachaBannerId({
    bannerId,
    query,
    lang
  }: {
    bannerId: number
    query: PaginationQueryDTO
    lang: string
  }) {
    const data = await this.gachaItemRepo.getListPokemonWithGachaBannerId(bannerId, query)
    return data
  }

  async getListItemsByBannerId({
    bannerId,
    query,
    lang
  }: {
    bannerId: number
    query: PaginationQueryDTO
    lang: string
  }) {
    const data = await this.gachaItemRepo.getListItemsByBannerId(bannerId, query)
    return data
  }
}
