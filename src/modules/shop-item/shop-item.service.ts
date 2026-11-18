import { RarityPokemon } from '@/common/constants/pokemon.constant'
import { ShopBannerStatus } from '@/common/constants/shop-banner.constant'
import { I18nService } from '@/i18n/i18n.service'
import { ShopItemMessage } from '@/i18n/message-keys'
import { PokemonService } from '@/modules/pokemon/pokemon.service'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQuery } from '@/shared/models/request.model'
import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { ShopBannerRepo } from '../shop-banner/shop-banner.repo'
import { ShopRarityPriceRepo } from '../shop-rarity-price/shop-rarity-price.repo'
import {
  InvalidShopBannerTimeException,
  MaxItemsExceededException,
  PokemonDuplicateException,
  ShopBannerActiveException,
  ShopBannerExpiredException,
  ShopBannerInactiveException,
  ShopItemNotFoundException
} from './dto/shop-item.error'
import {
  CreateShopItemBody,
  CreateWithListItemBody,
  GetRamdomAmountShopItemBody,
  UpdateShopItemBody,
  UpdateWithListItemBody
} from './dto/shop-item.zod-dto'
import { ShopItemRepo } from './shop-item.repo'

@Injectable()
export class ShopItemService {
  constructor(
    private shopItemRepo: ShopItemRepo,
    @Inject(forwardRef(() => ShopBannerRepo))
    private shopBannerRepo: ShopBannerRepo,
    private pokemonService: PokemonService,
    private readonly i18nService: I18nService,
    private shopRarityPriceRepo: ShopRarityPriceRepo
  ) {}

  async list(pagination: PaginationQuery, lang: string = 'vi') {
    const data = await this.shopItemRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(ShopItemMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const shopItem = await this.shopItemRepo.findById(id)
    if (!shopItem) {
      throw new ShopItemNotFoundException()
    }

    return {
      statusCode: 200,
      data: shopItem,
      message: this.i18nService.translate(ShopItemMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async create(
    { userId, data }: { userId: number; data: CreateShopItemBody },
    lang: string = 'vi'
  ) {
    try {
      // Validate shop banner
      const banner = await this.validateShopBannerForCreate(data.shopBannerId)

      // Check pokemon đã tồn tại trong banner chưa
      const existingItem = await this.shopItemRepo.findByBannerAndPokemon(
        data.shopBannerId,
        data.pokemonId
      )
      if (existingItem) {
        throw new PokemonDuplicateException()
      }

      // Check số lượng items trong banner + 1 item mới > max
      const currentCount = await this.shopItemRepo.countItemsInBanner(data.shopBannerId)
      if (currentCount + 1 > banner.max) {
        throw new MaxItemsExceededException()
      }

      const result = await this.shopItemRepo.create({
        createdById: userId,
        data: {
          ...data
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(ShopItemMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async createByList(
    { userId, data }: { userId: number; data: CreateWithListItemBody },
    lang: string = 'vi'
  ) {
    try {
      // Validate shop banner (tất cả items cùng 1 shopBannerId)
      const shopBannerId = data.items[0].shopBannerId
      const banner = await this.validateShopBannerForCreate(shopBannerId)

      // Check pokemon trùng trong danh sách items mới
      const pokemonIds = data.items.map((item) => item.pokemonId)
      const uniquePokemonIds = new Set(pokemonIds)
      if (pokemonIds.length !== uniquePokemonIds.size) {
        throw new PokemonDuplicateException()
      }

      // Check pokemon đã tồn tại trong banner
      for (const item of data.items) {
        const existingItem = await this.shopItemRepo.findByBannerAndPokemon(
          shopBannerId,
          item.pokemonId
        )
        if (existingItem) {
          throw new PokemonDuplicateException()
        }
      }

      // Check số lượng: items hiện tại + items mới > max
      const currentCount = await this.shopItemRepo.countItemsInBanner(shopBannerId)
      if (currentCount + data.items.length > banner.max) {
        throw new MaxItemsExceededException()
      }

      const results = await this.shopItemRepo.createMany({
        createdById: userId,
        items: data.items
      })
      return {
        statusCode: 201,
        data: results,
        message: this.i18nService.translate(ShopItemMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async update(
    {
      id,
      data,
      userId
    }: {
      id: number
      data: UpdateShopItemBody
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      // Lấy thông tin item hiện tại
      const currentItem = await this.shopItemRepo.findById(id)
      if (!currentItem) {
        throw new ShopItemNotFoundException()
      }

      // Nếu update pokemonId, check trùng
      if (data.pokemonId && data.pokemonId !== currentItem.pokemonId) {
        const existingItem = await this.shopItemRepo.findByBannerAndPokemon(
          currentItem.shopBannerId,
          data.pokemonId,
          id // Exclude current item
        )
        if (existingItem) {
          throw new PokemonDuplicateException()
        }
      }

      const shopItem = await this.shopItemRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return {
        statusCode: 200,
        data: shopItem,
        message: this.i18nService.translate(ShopItemMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new ShopItemNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async updateByList(
    { userId, data }: { userId: number; data: UpdateWithListItemBody },
    lang: string = 'vi'
  ) {
    try {
      // Validate tất cả items tồn tại và lấy thông tin
      const itemsToUpdate: Array<{ id: number } & UpdateShopItemBody> = []
      const shopBannerIds = new Set<number>()

      for (const item of data.items) {
        const currentItem = await this.shopItemRepo.findById(item.id)
        if (!currentItem) {
          throw new ShopItemNotFoundException()
        }
        shopBannerIds.add(currentItem.shopBannerId)
        itemsToUpdate.push(item)
      }

      // Check pokemon trùng trong danh sách update
      const pokemonUpdates = data.items.filter((item) => item.pokemonId !== undefined)
      const newPokemonIds = pokemonUpdates.map((item) => item.pokemonId!)
      const uniquePokemonIds = new Set(newPokemonIds)
      if (newPokemonIds.length !== uniquePokemonIds.size) {
        throw new PokemonDuplicateException()
      }

      // Check từng item nếu update pokemonId
      for (const item of data.items) {
        if (item.pokemonId) {
          const currentItem = await this.shopItemRepo.findById(item.id)
          if (currentItem && item.pokemonId !== currentItem.pokemonId) {
            const existingItem = await this.shopItemRepo.findByBannerAndPokemon(
              currentItem.shopBannerId,
              item.pokemonId,
              item.id
            )
            if (existingItem) {
              throw new PokemonDuplicateException()
            }
          }
        }
      }

      const results = await this.shopItemRepo.updateMany({
        updatedById: userId,
        items: itemsToUpdate
      })
      return {
        statusCode: 200,
        data: results,
        message: this.i18nService.translate(ShopItemMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new ShopItemNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existShopItem = await this.shopItemRepo.findById(id)
      if (!existShopItem) {
        throw new ShopItemNotFoundException()
      }

      // Check số lượng items hiện tại trong banner
      // Nếu số lượng hiện tại = min, không cho xóa

      const [banner, currentCount] = await Promise.all([
        this.shopBannerRepo.findById(existShopItem.shopBannerId),
        this.shopItemRepo.countItemsInBanner(existShopItem.shopBannerId)
      ])

      if (!banner) {
        throw new InvalidShopBannerTimeException()
      }

      if (currentCount <= banner.min) {
        throw new MaxItemsExceededException()
      }

      await this.shopItemRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(ShopItemMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new ShopItemNotFoundException()
      }
      throw error
    }
  }

  /**
   * Validate shop banner có hợp lệ không
   * Chỉ check: tồn tại, chưa xóa, đang active, trong thời hạn
   * Trả về banner nếu hợp lệ
   */
  private async validateShopBannerForCreate(shopBannerId: number) {
    const banner = await this.shopBannerRepo.findByIdForValidation(shopBannerId)

    // Check tồn tại, chưa xóa
    if (!banner || banner.deletedAt) {
      throw new InvalidShopBannerTimeException()
    }

    // Chỉ check theo status
    switch (banner.status) {
      case ShopBannerStatus.PREVIEW:
        return banner // OK tạo item/random khi PREVIEW
      case ShopBannerStatus.INACTIVE:
        throw new ShopBannerInactiveException()
      case ShopBannerStatus.ACTIVE:
        throw new ShopBannerActiveException()
      case ShopBannerStatus.EXPIRED:
        throw new ShopBannerExpiredException()
      default:
        throw new InvalidShopBannerTimeException()
    }
  }

  async getRandomListItem(body: GetRamdomAmountShopItemBody, lang: string = 'vi') {
    try {
      // 1. Validate shop banner
      // 3. Lấy tất cả pokemon có thể random (exclude LEGENDARY)
      // 4  Lấy bảng giá từ shop-rarity-price
      const [banner, allPokemons, allPrices, existingItems] = await Promise.all([
        this.validateShopBannerForCreate(body.shopBannerId),
        this.pokemonService.findAllRandomable(),
        this.shopRarityPriceRepo.list({
          currentPage: 1,
          pageSize: 100,
          qs: ''
        }),
        this.shopItemRepo.list({
          currentPage: 1,
          pageSize: 1000,
          qs: `shopBannerId=${body.shopBannerId}`
        })
      ])

      // Tạo Set chứa pokemonId đã có trong shop banner
      const existingPokemonIds = new Set(
        existingItems.results.map((item: any) => item.pokemonId)
      )

      // 2. Xác định số lượng pokemon cần random
      const amount = body.amount ?? banner.max
      // Nếu client truyền amount và lớn hơn max của banner thì báo lỗi
      if (body.amount != null && amount > banner.max) {
        throw new MaxItemsExceededException()
      }

      if (allPokemons.length === 0) {
        throw new NotFoundRecordException()
      }

      // 4. Phân loại pokemon theo rarity
      const pokemonsByRarity = {
        COMMON: allPokemons.filter((p) => p.rarity === RarityPokemon.COMMON),
        UNCOMMON: allPokemons.filter((p) => p.rarity === RarityPokemon.UNCOMMON),
        RARE: allPokemons.filter((p) => p.rarity === RarityPokemon.RARE),
        EPIC: allPokemons.filter((p) => p.rarity === RarityPokemon.EPIC)
      }

      // 5. Random pokemon theo tỉ lệ và quy tắc
      const selectedPokemons = this.randomPokemonsWithRules(pokemonsByRarity, amount)

      // Tạo Map để tra cứu giá theo rarity
      const priceMap = new Map<string, number>(
        allPrices.results.map((p) => [p.rarity, p.price])
      )

      // 7. Tạo shop items từ pokemon đã random
      const items = selectedPokemons.map((pokemon) => {
        const isHas = existingPokemonIds.has(pokemon.id)
        return {
          shopBannerId: body.shopBannerId,
          pokemonId: pokemon.id,
          price:
            priceMap.get(pokemon.rarity) ?? this.calculatePriceByRarity(pokemon.rarity),
          purchaseLimit: 10, // Default limit
          isActive: true,
          isHas,
          pokemon
        }
      })

      return {
        statusCode: 200,
        data: items,
        message: this.i18nService.translate(ShopItemMessage.GET_SUCCESS, lang)
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Random pokemon theo tỉ lệ và quy tắc:
   * - COMMON: 40%
   * - UNCOMMON: 30%
   * - RARE: 20%
   * - EPIC: 10%
   * - Không cho random LEGENDARY
   * - Không cho đồng thời 2 EPIC trong 1 lần random
   */
  private randomPokemonsWithRules(
    pokemonsByRarity: {
      COMMON: any[]
      UNCOMMON: any[]
      RARE: any[]
      EPIC: any[]
    },
    amount: number
  ): any[] {
    const selected: any[] = []
    let hasEpic = false

    for (let i = 0; i < amount; i++) {
      const rand = Math.random()
      let rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC'

      // Xác định rarity dựa trên tỉ lệ
      if (rand < 0.4) {
        rarity = 'COMMON' // 40%
      } else if (rand < 0.7) {
        rarity = 'UNCOMMON' // 30%
      } else if (rand < 0.9) {
        rarity = 'RARE' // 20%
      } else {
        rarity = 'EPIC' // 10%
      }

      // Nếu đã có EPIC, không cho random EPIC nữa
      if (hasEpic && rarity === 'EPIC') {
        // Fallback sang RARE
        rarity = 'RARE'
      }

      // Lấy pokemon từ pool của rarity đã chọn
      const pool = pokemonsByRarity[rarity]

      if (pool.length === 0) {
        // Nếu không có pokemon của rarity này, lấy từ COMMON
        const fallbackPool = pokemonsByRarity.COMMON
        if (fallbackPool.length > 0) {
          const randomIndex = Math.floor(Math.random() * fallbackPool.length)
          const pokemon = fallbackPool[randomIndex]
          selected.push(pokemon)
          // Remove để tránh trùng
          fallbackPool.splice(randomIndex, 1)
        }
      } else {
        const randomIndex = Math.floor(Math.random() * pool.length)
        const pokemon = pool[randomIndex]
        selected.push(pokemon)

        // Mark nếu là EPIC
        if (rarity === 'EPIC') {
          hasEpic = true
        }

        // Remove để tránh trùng
        pool.splice(randomIndex, 1)
      }
    }

    return selected
  }

  /**
   * Tính giá dựa trên rarity
   */
  private calculatePriceByRarity(rarity: string): number {
    switch (rarity) {
      case RarityPokemon.COMMON:
        return 100
      case RarityPokemon.UNCOMMON:
        return 200
      case RarityPokemon.RARE:
        return 500
      case RarityPokemon.EPIC:
        return 1000
      case RarityPokemon.LEGENDARY:
        return 5000
      default:
        return 100
    }
  }
}
