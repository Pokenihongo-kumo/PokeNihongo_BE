import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateUserPokemonBodyType,
  UpdateUserPokemonBodyType,
  USER_POKEMON_FIELDS,
  UserPokemonType
} from './entities/user-pokemon.entity'

type UserPokemonWithRelations = UserPokemonType & {
  user?: {
    id: number
    name: string
    email: string
  }
  pokemon?: {
    id: number
    pokedex_number: number
    nameJp: string
    nameTranslations: any
    description: string | null
    conditionLevel: number | null
    imageUrl: string | null
    rarity: string
    types?: Array<{
      id: number
      type_name: string
      display_name: any
      color_hex: string
    }>
    nextPokemons?: Array<{
      id: number
      pokedex_number: number
      nameJp: string
      nameTranslations: any
      description: string | null
      conditionLevel: number | null
      isStarted: boolean | null
      imageUrl: string | null
      rarity: string
      types?: Array<{
        id: number
        type_name: string
        display_name: any
        color_hex: string
      }>
    }>
    previousPokemons?: Array<{
      id: number
      pokedex_number: number
      nameJp: string
      nameTranslations: any
      description: string | null
      conditionLevel: number | null
      isStarted: boolean | null
      imageUrl: string | null
      rarity: string
      types?: Array<{
        id: number
        type_name: string
        display_name: any
        color_hex: string
      }>
    }>
  }
}

type UserPokemonBasic = UserPokemonType

@Injectable()
export class UserPokemonRepo {
  constructor(private prismaService: PrismaService) {}

  create(
    {
      userId,
      data
    }: {
      userId: number
      data: CreateUserPokemonBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<UserPokemonBasic> {
    const client = prismaTx || this.prismaService
    return client.userPokemon.create({
      data: {
        ...data,
        userId
      }
    })
  }

  update(
    {
      id,
      data
    }: {
      id: number
      data: UpdateUserPokemonBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<UserPokemonBasic> {
    const client = prismaTx || this.prismaService
    return client.userPokemon.update({
      where: {
        id,
        deletedAt: null
      },
      data
    })
  }

  delete(id: number, isHard?: boolean): Promise<UserPokemonBasic> {
    return isHard
      ? this.prismaService.userPokemon.delete({
          where: { id }
        })
      : this.prismaService.userPokemon.update({
          where: {
            id,
            deletedAt: null
          },
          data: {
            deletedAt: new Date()
          }
        })
  }

  async getByUserId(userId: number): Promise<UserPokemonType[]> {
    return this.prismaService.userPokemon.findMany({
      where: {
        userId,
        deletedAt: null
      },
      include: {
        pokemon: {
          select: {
            id: true,
            pokedex_number: true,
            nameJp: true,
            nameTranslations: true,
            description: true,
            imageUrl: true,
            rarity: true,
            types: {
              select: {
                id: true,
                type_name: true,
                display_name: true,
                color_hex: true
              }
            }
          }
        },
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: [{ createdAt: 'desc' }]
    })
  }

  async list(pagination: PaginationQueryType, userId?: number) {
    const { where, orderBy } = parseQs(pagination.qs, USER_POKEMON_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere = {
      deletedAt: null,
      ...(userId && { userId }),
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.userPokemon.count({
        where: filterWhere
      }),
      this.prismaService.userPokemon.findMany({
        where: filterWhere,
        include: {
          pokemon: {
            select: {
              id: true,
              pokedex_number: true,
              nameJp: true,
              nameTranslations: true,
              description: true,
              imageUrl: true,
              rarity: true,
              types: {
                select: {
                  id: true,
                  type_name: true,
                  display_name: true,
                  color_hex: true
                }
              }
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

  findById(
    id: number,
    prismaTx?: PrismaClient
  ): Promise<UserPokemonWithRelations | null> {
    const client = prismaTx || this.prismaService
    return client.userPokemon.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        pokemon: {
          select: {
            id: true,
            pokedex_number: true,
            nameJp: true,
            nameTranslations: true,
            description: true,
            conditionLevel: true,
            imageUrl: true,
            rarity: true,
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
                rarity: true,
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
                    rarity: true,
                    types: {
                      select: {
                        id: true,
                        type_name: true,
                        display_name: true,
                        color_hex: true
                      }
                    }
                  }
                }
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
                rarity: true,
                types: {
                  select: {
                    id: true,
                    type_name: true,
                    display_name: true,
                    color_hex: true
                  }
                }
              },
              where: {
                deletedAt: null
              }
            }
          }
        }
      }
    })
  }

  findByPokemonId(
    pokemonId: number,
    userId: number,
    prismaTx?: PrismaClient
  ): Promise<UserPokemonWithRelations | null> {
    const client = prismaTx || this.prismaService
    return client.userPokemon.findFirst({
      where: {
        pokemonId,
        userId,
        deletedAt: null
      },
      include: {
        pokemon: {
          select: {
            id: true,
            pokedex_number: true,
            nameJp: true,
            nameTranslations: true,
            description: true,
            conditionLevel: true,
            imageUrl: true,
            rarity: true,
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
                rarity: true,
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
                    rarity: true,
                    types: {
                      select: {
                        id: true,
                        type_name: true,
                        display_name: true,
                        color_hex: true
                      }
                    }
                  }
                }
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
                rarity: true,
                types: {
                  select: {
                    id: true,
                    type_name: true,
                    display_name: true,
                    color_hex: true
                  }
                }
              },
              where: {
                deletedAt: null
              }
            }
          }
        }
      }
    })
  }

  findByUserAndPokemon(
    userId: number,
    pokemonId: number
  ): Promise<UserPokemonBasic | null> {
    return this.prismaService.userPokemon.findFirst({
      where: {
        userId,
        pokemonId,
        deletedAt: null
      }
    })
  }

  findByUserAndNickname(
    userId: number,
    nickname: string
  ): Promise<UserPokemonBasic | null> {
    return this.prismaService.userPokemon.findFirst({
      where: {
        userId,
        nickname,
        deletedAt: null
      }
    })
  }

  // Get user's Pokemon by user ID
  getUserPokemons(userId: number): Promise<UserPokemonType[]> {
    return this.prismaService.userPokemon.findMany({
      where: {
        userId,
        deletedAt: null
      },
      include: {
        pokemon: {
          select: {
            id: true,
            pokedex_number: true,
            nameJp: true,
            nameTranslations: true,
            description: true,
            imageUrl: true,
            rarity: true,
            types: {
              select: {
                id: true,
                type_name: true,
                display_name: true,
                color_hex: true
              }
            }
          }
        }
      },
      orderBy: [{ createdAt: 'desc' }]
    })
  }

  // Add EXP to UserPokemon
  async addExp(id: number, expAmount: number): Promise<UserPokemonBasic> {
    return this.prismaService.userPokemon.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        exp: {
          increment: expAmount
        }
      }
    })
  }

  // Unset main pokemon for a user (set all isMain to false)
  async unsetMainPokemon(userId: number): Promise<void> {
    await this.prismaService.userPokemon.updateMany({
      where: {
        userId,
        deletedAt: null
      },
      data: {
        isMain: false
      }
    })
  }

  async countPokemonByUser(userId: number): Promise<number> {
    return this.prismaService.userPokemon.count({
      where: {
        userId,
        deletedAt: null
      }
    })
  }

  // ---- Gacha roll (GachaPurchaseService, in its transaction) ----

  // The user's live rows for any of these pokemon
  findOwnedAmong(userId: number, pokemonIds: number[], prismaTx: PrismaClient) {
    return prismaTx.userPokemon.findMany({
      where: {
        userId,
        pokemonId: { in: pokemonIds },
        deletedAt: null
      }
    })
  }
}
