import { I18nService } from '@/i18n/i18n.service'
import { UserPokemonMessage } from '@/i18n/message-keys'
import { LevelService } from '@/modules/level/level.service'
import { MatchService } from '@/modules/match/match.service'
import { PokemonService } from '@/modules/pokemon/pokemon.service'
import { TypeEffectivenessService } from '@/modules/type-effectiveness/type-effectiveness.service'
import { UserCoreService } from '@/modules/user/user-core.service'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import {
  ErrorInitLevelPokemonException,
  InvalidUserAccessPokemonException,
  NicknameAlreadyExistsException,
  UserHasPokemonException,
  UserNotInRoundException,
  UserPokemonNotFoundException
} from './dto/user-pokemon.error'
import {
  CreateUserPokemonBody,
  UpdateUserPokemonBody
} from './entities/user-pokemon.entity'
import { UserPokemonRepo } from './user-pokemon.repo'

@Injectable()
export class UserPokemonService {
  constructor(
    private userPokemonRepo: UserPokemonRepo,
    private pokemonService: PokemonService,
    private readonly matchService: MatchService,
    private levelService: LevelService,
    private readonly userCoreService: UserCoreService,
    private readonly i18nService: I18nService,
    private readonly typeEffectivenessService: TypeEffectivenessService
  ) {}

  async list(pagination: PaginationQuery, userId: number, lang: string = 'vi') {
    const data = await this.userPokemonRepo.list(pagination, userId)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(UserPokemonMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Add Pokemon for user via Shop purchase (nickname = null, isMain = false, level = conditionLevel if has prev, else first level)
  async addPokemonByShop(
    { userId, pokemonId }: { userId: number; pokemonId: number },
    prismaTx?: PrismaClient
  ) {
    // 1) Check if user already owns this Pokemon
    const existing = await this.userPokemonRepo.findByUserAndPokemon(userId, pokemonId)
    if (existing) {
      throw new UserHasPokemonException()
    }

    // 2) Lấy thông tin pokemon
    const [pokemon] = await Promise.all([this.pokemonService.getById(pokemonId)])

    if (!pokemon) {
      throw new NotFoundRecordException()
    }

    // 5) Tạo pokemon mới cho user
    const created = await this.userPokemonRepo.create(
      {
        userId,
        data: {
          pokemonId,
          nickname: null,
          isMain: false
        }
      },
      prismaTx
    )

    return created
  }

  async addPokemonByGacha(
    { userId, data }: { userId: number; data: CreateUserPokemonBody },
    prismaTx?: PrismaClient
  ) {
    try {
      // Get Pokemon info to use nameJp as nickname if not provided
      const pokemon = await this.pokemonService.getById(data.pokemonId)
      if (!pokemon) {
        throw new NotFoundRecordException()
      }

      // Get user check is first pokemon
      const user = await this.userCoreService.findUnique({ id: userId })

      // Check if user already has this Pokemon
      const existingUserPokemon = await this.userPokemonRepo.findByUserAndPokemon(
        userId,
        data.pokemonId
      )
      if (existingUserPokemon) {
        throw new UserHasPokemonException()
      }

      const created = await this.userPokemonRepo.create(
        {
          userId,
          data: {
            pokemonId: data.pokemonId,
            nickname: null,
            isMain: false
          }
        },
        prismaTx
      )
      return {
        data: created
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new NicknameAlreadyExistsException()
      }
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async getUserPokemonStats(userId: number, lang: string = 'vi') {
    const userPokemons = await this.userPokemonRepo.getByUserId(userId)
    const totalPokemons = await this.pokemonService.countAll()
    const userPokemonsCount = userPokemons.length
    const ownershipPercentage =
      totalPokemons > 0 ? Math.round((userPokemonsCount / totalPokemons) * 100) : 0
    return {
      statusCode: 200,
      data: {
        ownershipPercentage,
        userPokemonsCount,
        totalPokemons
      },
      message: this.i18nService.translate(UserPokemonMessage.GET_STATS_SUCCESS, lang)
    }
  }

  async getPokemonListWithUser(
    query: PaginationQuery,
    userId: number,
    lang: string = 'vi',
    filterHasPoke?: boolean
  ) {
    // 1. Lấy danh sách tất cả pokemon
    const pokemonData = await this.pokemonService.getPokemonListWithPokemonUser(
      query,
      query.pageSize
    )
    const pokemonIdToRarity = new Map<number, string>()
    ;(pokemonData.results || []).forEach((p: any) => {
      pokemonIdToRarity.set(p.id, p.rarity)
    })

    // 2. Lấy danh sách pokemon của user
    const userPokemons = await this.userPokemonRepo.getByUserId(userId)
    const userPokemonIds = new Set(userPokemons.map((up) => up.pokemonId))

    // 4. Optimize: Calculate weaknesses for all Pokemon in batch
    if (pokemonData.results && pokemonData.results.length > 0) {
      // Get all unique type IDs from all Pokemon
      const allTypeIds = new Set<number>()
      pokemonData.results.forEach((pokemon: any) => {
        pokemon.types?.forEach((type: any) => {
          allTypeIds.add(type.id)
        })
      })

      // Calculate weaknesses for each Pokemon and mark if user owns it
      const pokemonWithUserInfo = pokemonData.results.map((pokemon: any) => {
        const allWeaknesses = new Map<number, any>()

        return {
          ...pokemon,
          weaknesses: Array.from(allWeaknesses.values()),
          userPokemon: userPokemonIds.has(pokemon.id)
        }
      })

      pokemonData.results = pokemonWithUserInfo

      if (filterHasPoke !== undefined) {
        pokemonData.results = pokemonWithUserInfo.filter((pokemon: any) => {
          return pokemon.userPokemon === filterHasPoke
        })
      }
    }

    return {
      statusCode: 200,
      data: pokemonData,
      message: this.i18nService.translate(UserPokemonMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async listWithUserId(userId: number, lang: string = 'vi') {
    const data = await this.userPokemonRepo.getByUserId(userId)

    // Optimize: Calculate weaknesses for all Pokemon in batch
    if (data && data.length > 0) {
      // Get all unique type IDs from all Pokemon
      const allTypeIds = new Set<number>()
      data.forEach((userPokemon: any) => {
        userPokemon.pokemon?.types?.forEach((type: any) => {
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
      const userPokemonsWithWeaknesses = data.map((userPokemon: any) => {
        if (!userPokemon.pokemon?.types) {
          return userPokemon
        }

        const allWeaknesses = new Map<number, any>()

        userPokemon.pokemon.types.forEach((type: any) => {
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
          ...userPokemon,
          pokemon: {
            ...userPokemon.pokemon,
            weaknesses: Array.from(allWeaknesses.values())
          }
        }
      })

      return {
        statusCode: 200,
        data: userPokemonsWithWeaknesses,
        message: this.i18nService.translate(UserPokemonMessage.GET_LIST_SUCCESS, lang)
      }
    }

    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(UserPokemonMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  private async getWeaknessesForPokemon(pokemonTypes: any[] | undefined) {
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
  }

  async findById(id: number, lang: string = 'vi') {
    const userPokemon = await this.userPokemonRepo.findById(id)
    if (!userPokemon) {
      throw new UserPokemonNotFoundException()
    }

    // Calculate weaknesses for the Pokemon
    let weaknesses: any[] = []
    if (userPokemon.pokemon?.types) {
      weaknesses = await this.getWeaknessesForPokemon(userPokemon.pokemon.types)
    }

    // Process nextPokemons with their weaknesses, nextPokemons,
    const nextPokemonsWithDetails = await Promise.all(
      (userPokemon.pokemon?.nextPokemons || []).map(async (nextPokemon: any) => {
        const nextWeaknesses = await this.getWeaknessesForPokemon(nextPokemon.types)

        // Get level info for this pokemon if user owns it
        const userLevel: any = null
        const userOwnedPokemon = await this.userPokemonRepo.findByUserAndPokemon(
          userPokemon.userId,
          nextPokemon.id
        )

        // Process nested nextPokemons
        const nestedNextPokemons = await Promise.all(
          (nextPokemon.nextPokemons || []).map(async (nestedNext: any) => {
            const nestedWeaknesses = await this.getWeaknessesForPokemon(nestedNext.types)
            return {
              ...nestedNext,
              weaknesses: nestedWeaknesses
            }
          })
        )

        return {
          ...nextPokemon,
          weaknesses: nextWeaknesses,
          nextPokemons: nestedNextPokemons
        }
      })
    )

    // Calculate weaknesses for each previousPokemon
    const previousPokemonsWithWeaknesses = await Promise.all(
      (userPokemon.pokemon?.previousPokemons || []).map(async (prevPokemon: any) => {
        const prevWeaknesses = await this.getWeaknessesForPokemon(prevPokemon.types)
        return {
          ...prevPokemon,
          weaknesses: prevWeaknesses
        }
      })
    )

    const enrichedUserPokemon = {
      ...userPokemon,
      pokemon: userPokemon.pokemon
        ? {
            ...userPokemon.pokemon,
            weaknesses,
            nextPokemons: nextPokemonsWithDetails,
            previousPokemons: previousPokemonsWithWeaknesses
          }
        : userPokemon.pokemon
    }

    return {
      statusCode: 200,
      data: enrichedUserPokemon,
      message: this.i18nService.translate(UserPokemonMessage.GET_DETAIL_SUCCESS, lang)
    }
  }

  async create(
    { userId, data }: { userId: number; data: CreateUserPokemonBody },
    lang: string = 'vi'
  ) {
    try {
      // Get Pokemon info to use nameJp as nickname if not provided
      const pokemon = await this.pokemonService.getById(data.pokemonId)
      if (!pokemon) {
        throw new NotFoundRecordException()
      }

      // If no nickname provided, use Pokemon's nameJp
      let nickname = data.nickname
      if (!nickname) {
        nickname = pokemon.nameJp
      }

      // Get user check is first pokemon
      const user = await this.userCoreService.findUnique({ id: userId })
      let isFirstPokemon = false

      if (user?.levelId === null) {
        const firstLevelUser = await this.levelService.getFirstLevelUser()
        if (!firstLevelUser) {
          throw new ErrorInitLevelPokemonException()
        }
        await this.userCoreService.addLevelForUser(userId, firstLevelUser.id)
        isFirstPokemon = true
      }

      // Check if user already has this Pokemon
      const existingUserPokemon = await this.userPokemonRepo.findByUserAndPokemon(
        userId,
        data.pokemonId
      )
      if (existingUserPokemon) {
        throw new UserHasPokemonException()
      }

      // Check if nickname is already used by this user
      if (nickname) {
        const existingNickname = await this.userPokemonRepo.findByUserAndNickname(
          userId,
          nickname
        )
        if (existingNickname) {
          throw new NicknameAlreadyExistsException()
        }
      }

      const result = await this.userPokemonRepo.create({
        userId,
        data: {
          ...data,
          nickname,
          isMain: isFirstPokemon // Set isMain = true nếu là Pokemon đầu tiên
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(UserPokemonMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new NicknameAlreadyExistsException()
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
      userId
    }: {
      id: number
      data: UpdateUserPokemonBody
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      const existUserPokemon = await this.userPokemonRepo.findById(id)
      if (!existUserPokemon) {
        throw new UserPokemonNotFoundException()
      }

      // Check if user owns this Pokemon (optional security check)
      if (userId && existUserPokemon.userId !== userId) {
        throw new InvalidUserAccessPokemonException()
      }

      // Check if nickname is already used by this user
      if (data.nickname) {
        const existingNickname = await this.userPokemonRepo.findByUserAndNickname(
          existUserPokemon.userId,
          data.nickname
        )
        if (existingNickname && existingNickname.id !== id) {
          throw new NicknameAlreadyExistsException()
        }
      }

      // Check if isMain is set to true
      if (data.isMain === true) {
        // Unset isMain for all other user's pokemon
        await this.userPokemonRepo.unsetMainPokemon(existUserPokemon.userId)
      }

      const { exp, ...updateData } = data
      const userPokemon = await this.userPokemonRepo.update({
        id,
        data: updateData
      })
      return {
        statusCode: 200,
        data: userPokemon,
        message: this.i18nService.translate(UserPokemonMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserPokemonNotFoundException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new NicknameAlreadyExistsException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existUserPokemon = await this.userPokemonRepo.findById(id)
      if (!existUserPokemon) {
        throw new UserPokemonNotFoundException()
      }

      // Check if user owns this Pokemon (optional security check)
      if (userId && existUserPokemon.userId !== userId) {
        throw new InvalidUserAccessPokemonException()
      }

      await this.userPokemonRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(UserPokemonMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserPokemonNotFoundException()
      }
      throw error
    }
  }

  async getWithEvolvesPokemon(pokemonId: number, userId: number, lang: string = 'vi') {
    // 1. Lấy userPokemon với pokemon, level và evolution chain
    const userPokemon = await this.userPokemonRepo.findByPokemonId(pokemonId, userId)

    if (!userPokemon) {
      throw new UserPokemonNotFoundException()
    }

    const weaknesses = await this.getWeaknessesForPokemon(userPokemon.pokemon?.types)

    // 2. Verify ownership
    if (userPokemon.userId !== userId) {
      throw new InvalidUserAccessPokemonException()
    }

    // 3. Lấy tất cả pokemon IDs cần check ownership (previous + next)
    const pokemonIdsToCheck: number[] = []

    if (userPokemon.pokemon?.previousPokemons) {
      pokemonIdsToCheck.push(
        ...userPokemon.pokemon.previousPokemons.map((p: any) => p.id)
      )
    }

    if (userPokemon.pokemon?.nextPokemons) {
      pokemonIdsToCheck.push(...userPokemon.pokemon.nextPokemons.map((p: any) => p.id))
    }

    // 4. Lấy tất cả userPokemon của user có pokemonId trong list
    const userOwnedPokemons = await Promise.all(
      pokemonIdsToCheck.map((pokemonId) =>
        this.userPokemonRepo.findByUserAndPokemon(userId, pokemonId)
      )
    )

    // 5. Tạo map để lookup nhanh
    const ownedPokemonMap = new Map<number, any>()
    userOwnedPokemons.forEach((up) => {
      if (up) {
        ownedPokemonMap.set(up.pokemonId, up)
      }
    })

    // 6. Map previousPokemons với userPokemon
    const previousPokemonsWithOwnership =
      userPokemon.pokemon?.previousPokemons?.map((prevPokemon: any) => ({
        ...prevPokemon,
        userPokemon: ownedPokemonMap.has(prevPokemon.id) || false
      })) || []

    // 7. Map nextPokemons với userPokemon
    const nextPokemonsWithOwnership =
      userPokemon.pokemon?.nextPokemons?.map((nextPokemon: any) => ({
        ...nextPokemon,
        userPokemon: ownedPokemonMap.has(nextPokemon.id) || false
      })) || []

    // 8. Construct response
    const result = {
      ...userPokemon,
      pokemon: {
        ...userPokemon.pokemon,
        weaknesses,
        previousPokemons: previousPokemonsWithOwnership,
        nextPokemons: nextPokemonsWithOwnership
      }
    }
    // chinh lai gan userPokemon  = true hoac false

    return {
      statusCode: 200,
      data: result,
      message: this.i18nService.translate(UserPokemonMessage.GET_DETAIL_SUCCESS, lang)
    }
  }

  async getPokemonListWithUserByRounds(
    query: PaginationQuery,
    userId: number,
    lang: string = 'vi'
  ) {
    // 1. Lấy danh sách tất cả pokemon
    const pokemonData = await this.pokemonService.getPokemonListWithPokemonUser(query)
    const pokemonIdToRarity = new Map<number, string>()
    ;(pokemonData.results || []).forEach((p: any) => {
      pokemonIdToRarity.set(p.id, p.rarity)
    })

    // 2. Lấy danh sách userPokemon của user
    const userPokemons = await this.userPokemonRepo.getUserPokemons(userId)
    // Tạo set các pokemonId mà user sở hữu
    const userPokemonIds = new Set(userPokemons.map((up) => up.pokemonId))

    const userUpIdSet = new Set(userPokemons.map((up) => up.id))
    const upIdToPokemon = new Map<number, { pokemonId: number; rarity: string }>()
    for (const up of userPokemons) {
      upIdToPokemon.set(up.id, {
        pokemonId: up.pokemonId,
        rarity: pokemonIdToRarity.get(up.pokemonId) || ''
      })
    }
    // 3. dựa vào userId tìm ra match
    const matches = await this.matchService.getMatchWithRoundsByUserId(userId)

    // neu ko co tuc la user dang ko co torng tran nao
    if (!matches) {
      throw new UserNotInRoundException()
    }
    const roundUserPokemonIds =
      matches?.rounds
        .flatMap((round) => round.participants.map((p) => p.selectedUserPokemonId))
        .filter((id) => typeof id === 'number') || []

    // Selected userPokemonIds that belong to this user (not opponent)
    const selectedByUserUpIds = roundUserPokemonIds.filter((id) =>
      userUpIdSet.has(id as number)
    ) as number[]

    // Check if the user has already selected any LEGENDARY pokemon in current match rounds
    let hasSelectedLegendary = false
    for (const upId of selectedByUserUpIds) {
      const info = upIdToPokemon.get(upId)
      if (info && info.rarity === 'LEGENDARY') {
        hasSelectedLegendary = true
        break
      }
    }

    //4. Map pokemon với thông tin userPokemon
    // - Danh sách pokemon: chỉ những pokemon mà user đang sở hữu (userPokemonIds)
    // - Mỗi pokemon kèm field canPick: true nếu user có bất kỳ userPokemonId nào của pokemon này nằm trong roundUserPokemonIds

    // Tạo map pokemonId -> danh sách userPokemonId mà user sở hữu
    const upIdsByPokemonId = new Map<number, number[]>()
    for (const up of userPokemons) {
      const arr = upIdsByPokemonId.get(up.pokemonId) || []
      arr.push(up.id)
      upIdsByPokemonId.set(up.pokemonId, arr)
    }

    const pokemonListWithUser = (pokemonData.results || [])
      .filter((pokemon: any) => userPokemonIds.has(pokemon.id))
      .map((pokemon: any) => {
        const userUpIds = upIdsByPokemonId.get(pokemon.id) || []
        const selectedInRound = userUpIds.some((id) => roundUserPokemonIds.includes(id))
        // Apply LEGENDARY rule: if user already selected a LEGENDARY, all LEGENDARY cannot be picked
        const legendaryBlocked = hasSelectedLegendary && pokemon.rarity === 'LEGENDARY'
        return {
          id: pokemon.id,
          nameJp: pokemon.nameJp,
          nameTranslations: pokemon.nameTranslations,
          imageUrl: pokemon.imageUrl,
          rarity: pokemon.rarity,
          canPick: !(selectedInRound || legendaryBlocked)
        }
      })

    // Recalculate pagination based on filtered results (user-owned Pokemon only)
    const totalUserOwnedPokemons = pokemonListWithUser.length
    const updatedPagination = {
      current: query.currentPage,
      pageSize: query.pageSize,
      totalPage: Math.ceil(totalUserOwnedPokemons / query.pageSize),
      totalItem: pokemonListWithUser.length
    }

    return {
      statusCode: 200,
      data: {
        results: pokemonListWithUser,
        pagination: updatedPagination
      },
      message: this.i18nService.translate(UserPokemonMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // ---- For other modules (module-boundary plan B4) ----
  // Same arguments (a caller's transaction client included) and results as the
  // repo methods, so callers keep their transactions and write order.

  // The repo's create (the service's create answers the HTTP route)
  insert(...args: Parameters<UserPokemonRepo['create']>) {
    return this.userPokemonRepo.create(...args)
  }

  findByUserAndPokemon(...args: Parameters<UserPokemonRepo['findByUserAndPokemon']>) {
    return this.userPokemonRepo.findByUserAndPokemon(...args)
  }

  getByUserId(...args: Parameters<UserPokemonRepo['getByUserId']>) {
    return this.userPokemonRepo.getByUserId(...args)
  }

  unsetMainPokemon(...args: Parameters<UserPokemonRepo['unsetMainPokemon']>) {
    return this.userPokemonRepo.unsetMainPokemon(...args)
  }

  // The repo's update (the service's update answers the HTTP route)
  updateUserPokemon(...args: Parameters<UserPokemonRepo['update']>) {
    return this.userPokemonRepo.update(...args)
  }

  // ---- For other modules (module-boundary plan B7) ----

  findOwnedAmong(...args: Parameters<UserPokemonRepo['findOwnedAmong']>) {
    return this.userPokemonRepo.findOwnedAmong(...args)
  }

  // ---- For other modules (module-boundary plan B6) ----
  // Same arguments and results as the repo methods.

  countPokemonByUser(...args: Parameters<UserPokemonRepo['countPokemonByUser']>) {
    return this.userPokemonRepo.countPokemonByUser(...args)
  }

  // ---- For other modules: Pick timeout: the player's pokemon (B7) ----

  findPokemonIdsOfUser(...args: Parameters<UserPokemonRepo['findPokemonIdsOfUser']>) {
    return this.userPokemonRepo.findPokemonIdsOfUser(...args)
  }
}
