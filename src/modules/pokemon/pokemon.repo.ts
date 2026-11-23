import { RarityPokemon, RarityPokemonType } from '@/common/constants/pokemon.constant'
import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import {
  AssignPokemonTypesBody,
  CreatePokemonBody,
  UpdatePokemonBody
} from './dto/pokemon.zod-dto'
import { POKEMON_FIELDS, Pokemon } from './entities/pokemon.entity'

type PokemonWithRelations = Pokemon & {
  types?: Array<{
    id: number
    type_name: string
    display_name: any
    color_hex: string
  }>
  nextPokemons?: Partial<Pokemon>[]
  previousPokemons?: Partial<Pokemon>[]
}

type PokemonWithTypesOnly = Pokemon & {
  types?: Array<{
    id: number
    type_name: string
    display_name: any
    color_hex: string
  }>
}

type PokemonBasic = Pokemon

@Injectable()
export class PokemonRepo {
  constructor(private prismaService: PrismaService) {}

  create({
    createdById,
    data
  }: {
    createdById: number | null
    data: CreatePokemonBody
  }): Promise<Pokemon> {
    const { typeIds, nextPokemonsId, ...pokemonData } = data
    return this.prismaService.pokemon.create({
      data: {
        ...pokemonData,
        nameTranslations: pokemonData.nameTranslations ?? {},
        createdById,
        // Connect elemental types
        types: {
          connect: typeIds.map((id) => ({ id }))
        },
        // Connect next Pokemons for evolution
        ...(nextPokemonsId &&
          nextPokemonsId.length > 0 && {
            nextPokemons: {
              connect: nextPokemonsId.map((id) => ({ id }))
            }
          })
      },
      include: {
        types: true,
        nextPokemons: {
          select: {
            id: true,
            pokedex_number: true,
            nameJp: true,
            nameTranslations: true,
            imageUrl: true,
            rarity: true
          }
        },
        previousPokemons: true,
        createdBy: {
          select: { id: true, name: true }
        },
        updatedBy: {
          select: { id: true, name: true }
        }
      }
    })
  }

  update({
    id,
    updatedById,
    data
  }: {
    id: number
    updatedById: number
    data: UpdatePokemonBody
  }): Promise<Pokemon> {
    const { typeIds, nextPokemonsId, ...pokemonData } = data
    return this.prismaService.pokemon.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        ...pokemonData,
        updatedById,
        // Update elemental types nếu có
        ...(typeIds && {
          types: {
            set: [], // Clear existing connections
            connect: typeIds.map((id) => ({ id })) // Connect new types
          }
        }),
        // Update next Pokemons nếu có
        ...(nextPokemonsId !== undefined && {
          nextPokemons: {
            set: [], // Clear existing evolution connections
            connect: nextPokemonsId.map((id) => ({ id })) // Connect new evolutions
          }
        })
      },
      include: {
        types: true,
        nextPokemons: {
          select: {
            id: true,
            pokedex_number: true,
            nameJp: true,
            nameTranslations: true,
            imageUrl: true,
            rarity: true
          }
        },
        previousPokemons: true,
        createdBy: {
          select: { id: true, name: true }
        },
        updatedBy: {
          select: { id: true, name: true }
        }
      }
    })
  }

  delete(
    {
      id,
      deletedById
    }: {
      id: number
      deletedById: number
    },
    isHard?: boolean
  ): Promise<Pokemon | null> {
    return isHard
      ? this.prismaService.pokemon.delete({
          where: {
            id
          }
        })
      : this.prismaService.pokemon.update({
          where: {
            id,
            deletedAt: null
          },
          data: {
            deletedAt: new Date(),
            deletedById
          }
        })
  }

  async list(pagination: PaginationQuery) {
    const { where, orderBy } = parseQs(
      pagination.qs,
      POKEMON_FIELDS,
      ['types', 'rarities'], // relation fields - types là relation với ElementalType
      [] // array fields
    )

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const [totalItems, data] = await Promise.all([
      this.prismaService.pokemon.count({
        where: { deletedAt: null, ...where }
      }),
      this.prismaService.pokemon.findMany({
        where: { deletedAt: null, ...where },
        include: {
          types: {
            select: {
              id: true,
              type_name: true,
              display_name: true,
              color_hex: true
            }
          },
          nextPokemons: {
            select: {
              id: true,
              pokedex_number: true,
              nameJp: true,
              nameTranslations: true,
              imageUrl: true,
              rarity: true
            }
          },
          previousPokemons: {
            select: {
              id: true,
              pokedex_number: true,
              nameJp: true,
              nameTranslations: true,
              imageUrl: true,
              rarity: true
            },
            where: {
              deletedAt: null
            }
          }
        },
        orderBy,
        skip,
        take
      })
    ])

    return {
      results: data,
      pagination: {
        current: pagination.currentPage,
        pageSize: pagination.pageSize,
        totalPage: Math.ceil(totalItems / pagination.pageSize),
        totalItem: totalItems
      }
    }
  }

  async listWithNameNumImg(pagination: PaginationQuery) {
    const { where, orderBy } = parseQs(
      pagination.qs,
      POKEMON_FIELDS,
      ['types', 'rarities'], // relation fields - types là relation với ElementalType
      [] // array fields
    )

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const [totalItems, data] = await Promise.all([
      this.prismaService.pokemon.count({
        where: { deletedAt: null, ...where }
      }),
      this.prismaService.pokemon.findMany({
        where: { deletedAt: null, ...where },
        select: {
          id: true,
          pokedex_number: true,
          nameJp: true,
          nameTranslations: true,
          imageUrl: true,
          rarity: true
        },
        orderBy,
        skip,
        take
      })
    ])

    return {
      results: data,
      pagination: {
        current: pagination.currentPage,
        pageSize: pagination.pageSize,
        totalPage: Math.ceil(totalItems / pagination.pageSize),
        totalItem: totalItems
      }
    }
  }

  async getPokemonListWithPokemonUser(
    pagination: PaginationQuery,
    pageSizeOverride?: number
  ) {
    pagination.pageSize = pageSizeOverride ?? 1000 // Override pageSize to 1000 to get all Pokemons

    const { where, orderBy } = parseQs(
      pagination.qs,
      POKEMON_FIELDS,
      ['types', 'rarities'], // relation fields - types là relation với ElementalType
      [] // array fields
    )

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const [totalItems, data] = await Promise.all([
      this.prismaService.pokemon.count({
        where: { deletedAt: null, ...where }
      }),
      this.prismaService.pokemon.findMany({
        where: { deletedAt: null, ...where },
        include: {
          types: {
            select: {
              id: true,
              type_name: true,
              display_name: true,
              color_hex: true
            }
          }
        },
        orderBy,
        skip,
        take
      })
    ])

    return {
      results: data,
      pagination: {
        current: pagination.currentPage,
        pageSize: pagination.pageSize,
        totalPage: Math.ceil(totalItems / pagination.pageSize),
        totalItem: totalItems
      }
    }
  }

  findById(id: number): Promise<PokemonWithRelations | null> {
    return this.prismaService.pokemon.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        types: {
          select: {
            id: true,
            type_name: true,
            display_name: true,
            color_hex: true
          }
        },
        nextPokemons: {
          select: {
            id: true,
            pokedex_number: true,
            nameJp: true,
            nameTranslations: true,
            description: true,
            conditionLevel: true,
            isStarted: true,
            imageUrl: true,
            rarity: true
          }
        },
        previousPokemons: {
          select: {
            id: true,
            pokedex_number: true,
            nameJp: true,
            nameTranslations: true,
            description: true,
            conditionLevel: true,
            isStarted: true,
            imageUrl: true,
            rarity: true
          },
          where: {
            deletedAt: null
          }
        }
      }
    })
  }

  // Every pokemon row, deleted ones included (the collection screen's total)
  countAll(): Promise<number> {
    return this.prismaService.pokemon.count()
  }

  findByPokedexNumber(pokedex_number: number): Promise<Pokemon | null> {
    return this.prismaService.pokemon.findFirst({
      where: {
        pokedex_number,
        deletedAt: null
      }
    })
  }

  // Assign types to Pokemon
  async assignTypes(pokemonId: number, data: AssignPokemonTypesBody): Promise<void> {
    // First, disconnect all current types
    await this.prismaService.pokemon.update({
      where: { id: pokemonId },
      data: {
        types: {
          set: [] // Clear all existing connections
        }
      }
    })

    // Then connect new types
    await this.prismaService.pokemon.update({
      where: { id: pokemonId },
      data: {
        types: {
          connect: data.typeIds.map((id) => ({ id }))
        }
      }
    })
  }

  // Get starter Pokemons
  getStarterPokemons(): Promise<PokemonWithRelations[]> {
    return this.prismaService.pokemon.findMany({
      where: {
        isStarted: true,
        deletedAt: null
      },
      include: {
        types: {
          select: {
            id: true,
            type_name: true,
            display_name: true,
            color_hex: true
          }
        },
        nextPokemons: {
          select: {
            id: true,
            pokedex_number: true,
            nameJp: true,
            nameTranslations: true,
            imageUrl: true,
            rarity: true
          }
        },
        previousPokemons: {
          select: {
            id: true,
            pokedex_number: true,
            nameJp: true,
            nameTranslations: true,
            imageUrl: true,
            rarity: true
          },
          where: {
            deletedAt: null
          }
        }
      }
    })
  }

  // Get Pokemons by rarity
  getPokemonsByRarity(rarity: string): Promise<PokemonWithRelations[]> {
    return this.prismaService.pokemon.findMany({
      where: {
        rarity: rarity as any,
        deletedAt: null
      },
      include: {
        types: {
          select: {
            id: true,
            type_name: true,
            display_name: true,
            color_hex: true
          }
        },
        nextPokemons: {
          select: {
            id: true,
            pokedex_number: true,
            nameJp: true,
            nameTranslations: true,
            imageUrl: true,
            rarity: true
          }
        },
        previousPokemons: {
          select: {
            id: true,
            pokedex_number: true,
            nameJp: true,
            nameTranslations: true,
            imageUrl: true,
            rarity: true
          },
          where: {
            deletedAt: null
          }
        }
      }
    })
  }

  getPokemonsByType(typeName: string): Promise<PokemonWithRelations[]> {
    return this.prismaService.pokemon.findMany({
      where: {
        deletedAt: null,
        types: {
          some: {
            type_name: typeName,
            deletedAt: null
          }
        }
      },
      include: {
        types: {
          select: {
            id: true,
            type_name: true,
            display_name: true,
            color_hex: true
          }
        },
        nextPokemons: {
          select: {
            id: true,
            pokedex_number: true,
            nameJp: true,
            nameTranslations: true,
            imageUrl: true,
            rarity: true
          }
        },
        previousPokemons: {
          select: {
            id: true,
            pokedex_number: true,
            nameJp: true,
            nameTranslations: true,
            imageUrl: true,
            rarity: true
          },
          where: {
            deletedAt: null
          }
        }
      }
    })
  }

  // Helper methods for evolution relations
  async addToPreviousPokemons(
    nextPokemonId: number,
    currentPokemonId: number
  ): Promise<void> {
    await this.prismaService.pokemon.update({
      where: {
        id: nextPokemonId,
        deletedAt: null
      },
      data: {
        previousPokemons: {
          connect: { id: currentPokemonId }
        }
      }
    })
  }

  async removeFromPreviousPokemons(
    nextPokemonId: number,
    currentPokemonId: number
  ): Promise<void> {
    await this.prismaService.pokemon.update({
      where: {
        id: nextPokemonId,
        deletedAt: null
      },
      data: {
        previousPokemons: {
          disconnect: { id: currentPokemonId }
        }
      }
    })
  }

  // Get Pokemons that have no previous evolution (starter evolution list)
  getPokemonsWithoutPreviousEvolution(): Promise<PokemonBasic[]> {
    return this.prismaService.pokemon.findMany({
      where: {
        deletedAt: null,
        previousPokemons: {
          none: {
            deletedAt: null
          }
        }
      },

      orderBy: {
        pokedex_number: 'asc'
      }
    })
  }

  /**
   * Lấy tất cả pokemon theo rarity (không bao gồm LEGENDARY)
   */
  async findByRarity(rarity: RarityPokemonType): Promise<PokemonBasic[]> {
    return this.prismaService.pokemon.findMany({
      where: {
        deletedAt: null,
        rarity: RarityPokemon[rarity]
      }
    })
  }

  /**
   * Lấy tất cả pokemon có thể random (exclude LEGENDARY)
   */
  async findAllRandomable(): Promise<PokemonBasic[]> {
    return this.prismaService.pokemon.findMany({
      where: {
        deletedAt: null,
        rarity: {
          not: 'LEGENDARY'
        }
      }
    })
  }

  /**
   * Random pokemon theo rarity, typeIds, và limit
   * - Ưu tiên pokemon có type trong typeIds
   * - Chỉ lấy pokemon có previousPokemons = []
   * - Nếu không đủ số lượng từ typeIds, lấy thêm random theo rarity
   */
  async getRandomPokemonsByTypeAndRarity({
    limit,
    rarity,
    typeIds = [],
    excludeIds = []
  }: {
    limit: number
    rarity: RarityPokemonType
    typeIds?: number[]
    excludeIds?: number[]
  }): Promise<PokemonWithRelations[]> {
    const baseWhere = {
      deletedAt: null,
      rarity,
      id: excludeIds.length > 0 ? { notIn: excludeIds } : undefined
      // // Chỉ lấy pokemon base form (không có previousPokemons)
      // previousPokemons: { none: {} }
    }

    let selectedPokemons: PokemonWithRelations[] = []

    // Bước 1: Ưu tiên pokemon có type trong typeIds
    if (typeIds.length > 0) {
      const pokemonsWithTypes = await this.prismaService.pokemon.findMany({
        where: {
          ...baseWhere,
          types: {
            some: {
              id: { in: typeIds }
            }
          }
        },
        include: {
          types: {
            select: {
              id: true,
              type_name: true,
              display_name: true,
              color_hex: true
            }
          },
          nextPokemons: {
            select: {
              id: true,
              pokedex_number: true,
              nameJp: true,
              nameTranslations: true,
              description: true,
              conditionLevel: true,
              isStarted: true,
              imageUrl: true,
              rarity: true
            }
          },
          previousPokemons: {
            select: {
              id: true,
              pokedex_number: true,
              nameJp: true,
              nameTranslations: true,
              description: true,
              conditionLevel: true,
              isStarted: true,
              imageUrl: true,
              rarity: true
            },
            where: {
              deletedAt: null
            }
          }
        }
      })

      // Random từ pokemonsWithTypes
      const shuffled = pokemonsWithTypes.sort(() => 0.5 - Math.random())
      selectedPokemons = shuffled.slice(0, limit)
    }

    // Bước 2: Nếu chưa đủ số lượng, lấy thêm pokemon bất kỳ theo rarity
    if (selectedPokemons.length < limit) {
      const remaining = limit - selectedPokemons.length
      const selectedIds = selectedPokemons.map((p) => p.id)
      const allExcludeIds = [...excludeIds, ...selectedIds]

      const additionalPokemons = await this.prismaService.pokemon.findMany({
        where: {
          ...baseWhere,
          id: allExcludeIds.length > 0 ? { notIn: allExcludeIds } : undefined
        },
        include: {
          types: {
            select: {
              id: true,
              type_name: true,
              display_name: true,
              color_hex: true
            }
          },
          nextPokemons: {
            select: {
              id: true,
              pokedex_number: true,
              nameJp: true,
              nameTranslations: true,
              description: true,
              conditionLevel: true,
              isStarted: true,
              imageUrl: true,
              rarity: true
            }
          },
          previousPokemons: {
            select: {
              id: true,
              pokedex_number: true,
              nameJp: true,
              nameTranslations: true,
              description: true,
              conditionLevel: true,
              isStarted: true,
              imageUrl: true,
              rarity: true
            },
            where: {
              deletedAt: null
            }
          }
        }
      })

      const shuffled = additionalPokemons.sort(() => 0.5 - Math.random())
      selectedPokemons.push(...shuffled.slice(0, remaining))
    }

    return selectedPokemons
  }

  /**
   * Tính toán Pokemon nào bị debuff (yếu thế) dựa trên:
   * - Type effectiveness (hệ)
   * - Rarity (độ hiếm)
   * - Evolution level (cấp tiến hóa: conditionLevel = 14 là 1, 30 là 2, 45 là 3)
   *
   * @param pokemon1Id - ID của Pokemon 1
   * @param pokemon2Id - ID của Pokemon 2
   * @returns Object chứa pokemonId bị debuff và lý do
   */
  async calculateDebuffedPokemon(
    pokemon1Id: number,
    pokemon2Id: number
  ): Promise<{
    debuffedPokemonId: number
    reason: string
    score1: number
    score2: number
    details: {
      pokemon1: {
        id: number
        name: string
        typeAdvantage: number
        rarityScore: number
        evolutionLevel: number
        totalScore: number
      }
      pokemon2: {
        id: number
        name: string
        typeAdvantage: number
        rarityScore: number
        evolutionLevel: number
        totalScore: number
      }
    }
  }> {
    // Lấy thông tin Pokemon 1 và 2 kèm types
    const [pokemon1, pokemon2] = await Promise.all([
      this.prismaService.pokemon.findUnique({
        where: { id: pokemon1Id },
        include: {
          types: {
            select: {
              id: true,
              type_name: true,
              display_name: true
            }
          }
        }
      }),
      this.prismaService.pokemon.findUnique({
        where: { id: pokemon2Id },
        include: {
          types: {
            select: {
              id: true,
              type_name: true,
              display_name: true
            }
          }
        }
      })
    ])

    if (!pokemon1 || !pokemon2) {
      throw new Error('Pokemon not found')
    }

    // === 1. Tính điểm Type Advantage ===
    const typeAdvantage1 = await this.calculateTypeAdvantage(pokemon1, pokemon2)
    const typeAdvantage2 = await this.calculateTypeAdvantage(pokemon2, pokemon1)

    // === 2. Tính điểm Rarity ===
    const rarityScore1 = this.getRarityScore(pokemon1.rarity)
    const rarityScore2 = this.getRarityScore(pokemon2.rarity)

    // === 3. Tính cấp Evolution ===
    const evolutionLevel1 = this.getEvolutionLevel(pokemon1.conditionLevel)
    const evolutionLevel2 = this.getEvolutionLevel(pokemon2.conditionLevel)

    // === 4. Tính tổng điểm (weighted) ===
    // Type advantage: 50%, Rarity: 30%, Evolution: 20%
    const totalScore1 = typeAdvantage1 * 0.5 + rarityScore1 * 0.3 + evolutionLevel1 * 0.2
    const totalScore2 = typeAdvantage2 * 0.5 + rarityScore2 * 0.3 + evolutionLevel2 * 0.2

    // Xác định Pokemon bị debuff (điểm thấp hơn)
    let debuffedPokemonId = totalScore1 < totalScore2 ? pokemon1Id : pokemon2Id

    // LEGENDARY không bao giờ bị debuff
    const debuffedPokemon = debuffedPokemonId === pokemon1Id ? pokemon1 : pokemon2
    if (debuffedPokemon.rarity === 'LEGENDARY') {
      // Nếu Pokemon bị debuff là LEGENDARY, chuyển debuff sang Pokemon còn lại
      debuffedPokemonId = debuffedPokemonId === pokemon1Id ? pokemon2Id : pokemon1Id
    }

    const reason = this.generateDebuffReason(
      totalScore1,
      totalScore2,
      typeAdvantage1,
      typeAdvantage2,
      rarityScore1,
      rarityScore2,
      evolutionLevel1,
      evolutionLevel2,
      debuffedPokemon.rarity === 'LEGENDARY'
    )

    return {
      debuffedPokemonId,
      reason,
      score1: totalScore1,
      score2: totalScore2,
      details: {
        pokemon1: {
          id: pokemon1.id,
          name: pokemon1.nameJp,
          typeAdvantage: typeAdvantage1,
          rarityScore: rarityScore1,
          evolutionLevel: evolutionLevel1,
          totalScore: totalScore1
        },
        pokemon2: {
          id: pokemon2.id,
          name: pokemon2.nameJp,
          typeAdvantage: typeAdvantage2,
          rarityScore: rarityScore2,
          evolutionLevel: evolutionLevel2,
          totalScore: totalScore2
        }
      }
    }
  }

  /**
   * Tính toán lợi thế về hệ của attackerPokemon so với defenderPokemon
   * Trả về điểm từ 0-10
   */
  private async calculateTypeAdvantage(
    attackerPokemon: any,
    defenderPokemon: any
  ): Promise<number> {
    if (!attackerPokemon.types || attackerPokemon.types.length === 0) return 5 // Neutral
    if (!defenderPokemon.types || defenderPokemon.types.length === 0) return 5 // Neutral

    let totalMultiplier = 0
    let count = 0

    // Tính multiplier cho mỗi cặp (attacker type, defender type)
    for (const attackerType of attackerPokemon.types) {
      for (const defenderType of defenderPokemon.types) {
        const effectiveness = await this.prismaService.typeEffectiveness.findFirst({
          where: {
            attackerId: attackerType.id,
            defenderId: defenderType.id,
            deletedAt: null
          }
        })

        if (effectiveness) {
          totalMultiplier += effectiveness.multiplier
          count++
        } else {
          // Nếu không có data, coi như neutral (1.0)
          totalMultiplier += 1.0
          count++
        }
      }
    }

    // Tính trung bình multiplier
    const avgMultiplier = count > 0 ? totalMultiplier / count : 1.0

    // Chuyển đổi multiplier sang thang điểm 0-10
    // 0 = no effect, 0.5 = not very effective, 1 = neutral, 2 = super effective
    if (avgMultiplier === 0) return 0
    if (avgMultiplier <= 0.5) return 2.5
    if (avgMultiplier < 1) return 4
    if (avgMultiplier === 1) return 5
    if (avgMultiplier <= 1.5) return 6.5
    if (avgMultiplier <= 2) return 8
    return 10
  }

  /**
   * Chuyển đổi Rarity sang điểm (0-10)
   */
  private getRarityScore(rarity: string): number {
    const rarityMap: { [key: string]: number } = {
      COMMON: 2,
      UNCOMMON: 4,
      RARE: 6,
      EPIC: 8,
      LEGENDARY: 10
    }
    return rarityMap[rarity] || 5
  }

  /**
   * Chuyển đổi conditionLevel sang evolution level (1, 2, 3)
   * conditionLevel = 14 -> level 1
   * conditionLevel = 30 -> level 2
   * conditionLevel = 45 -> level 3
   * null hoặc không xác định -> level 1
   */
  private getEvolutionLevel(conditionLevel: number | null): number {
    if (!conditionLevel) return 1
    if (conditionLevel <= 14) return 1
    if (conditionLevel <= 30) return 2
    if (conditionLevel <= 45) return 3
    return 3 // Max level
  }

  /**
   * Tạo lý do debuff dựa trên các yếu tố
   */
  private generateDebuffReason(
    score1: number,
    score2: number,
    typeAdv1: number,
    typeAdv2: number,
    rarity1: number,
    rarity2: number,
    evo1: number,
    evo2: number,
    isLegendaryOverride: boolean = false
  ): string {
    // Nếu có LEGENDARY override (Pokemon yếu hơn nhưng là LEGENDARY)
    if (isLegendaryOverride) {
      return 'LEGENDARY miễn nhiễm debuff, debuff chuyển sang đối thủ'
    }

    const reasons: string[] = []

    // So sánh type advantage
    if (Math.abs(typeAdv1 - typeAdv2) >= 2) {
      if (typeAdv1 < typeAdv2) {
        reasons.push('Bị yếu thế về hệ')
      } else {
        reasons.push('Có lợi thế về hệ')
      }
    }

    // So sánh rarity
    if (Math.abs(rarity1 - rarity2) >= 2) {
      if (rarity1 < rarity2) {
        reasons.push('Độ hiếm thấp hơn')
      } else {
        reasons.push('Độ hiếm cao hơn')
      }
    }

    // So sánh evolution
    if (evo1 !== evo2) {
      if (evo1 < evo2) {
        reasons.push('Cấp tiến hóa thấp hơn')
      } else {
        reasons.push('Cấp tiến hóa cao hơn')
      }
    }

    if (reasons.length === 0) {
      return 'Tổng điểm thấp hơn'
    }

    return reasons.join(', ')
  }
}
