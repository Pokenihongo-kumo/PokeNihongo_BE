import { GachaPityType } from '@/common/constants/gacha.constant'
import { GachaBannerStatus } from '@/common/constants/shop-banner.constant'
import { FeatureKey } from '@/common/constants/subscription.constant'
import {
  WalletTransactionSourceType,
  WalletTransactionType,
  walletPurposeType
} from '@/common/constants/wallet-transaction.constant'
import { walletType } from '@/common/constants/wallet.constant'
import { I18nService } from '@/i18n/i18n.service'
import { GachaPurchaseMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { SharedUserSubscriptionService } from '@/shared/services/user-subscription.service'
import { Injectable } from '@nestjs/common'
import { GachaBannerRepo } from '../gacha-banner/gacha-banner.repo'
import { GachaItemRateType } from '../gacha-item-rate/entities/gacha-item-rate.entity'
import { InvalidGachaBannerException } from '../gacha-item/dto/gacha-item.error'
import { GachaItemType } from '../gacha-item/entities/gacha-item.entity'
import { GachaRollHistoryRepo } from '../gacha-roll-history/gacha-roll-history.repo'
import { UserGachaPityRepo } from '../user-gacha-pity/user-gacha-pity.repo'
import { UserPokemonService } from '../user-pokemon/user-pokemon.service'
import { WalletTransactionService } from '@/modules/wallet-transaction/wallet-transaction.service'
import { WalletService } from '@/modules/wallet/wallet.service'
import {
  GachaPurchaseNotFoundException,
  NotEnoughBalanceException
} from './dto/gacha-purchase.error'
import { CreateGachaPurchaseBodyType } from './entities/gacha-purchase.entity'
import { GachaPurchaseRepo } from './gacha-purchase.repo'

@Injectable()
export class GachaPurchaseService {
  constructor(
    private gachaPurchaseRepo: GachaPurchaseRepo,
    private readonly i18nService: I18nService,
    private readonly gachaBannerRepo: GachaBannerRepo,
    // private readonly gachaItemRepo: GachaItemRepo,
    private readonly gachaRollHistoryRepo: GachaRollHistoryRepo,
    private readonly userGachaPityRepo: UserGachaPityRepo,
    private readonly walletService: WalletService,
    private readonly walletTransactionService: WalletTransactionService,
    private readonly userPokemonService: UserPokemonService,
    private readonly userSubService: SharedUserSubscriptionService
    // private readonly pokemonRepo: PokemonRepo
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.gachaPurchaseRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(GachaPurchaseMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const gachaPurchase = await this.gachaPurchaseRepo.findById(id)
    if (!gachaPurchase) {
      throw new GachaPurchaseNotFoundException()
    }

    return {
      statusCode: 200,
      data: gachaPurchase,
      message: this.i18nService.translate(GachaPurchaseMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async create(
    { userId, data }: { userId: number; data: CreateGachaPurchaseBodyType },
    lang: string = 'vi'
  ) {
    try {
      //tìm ra gachabanner và pity user

      const gachaBanner = await this.gachaBannerRepo.findByIdWithItemWithitemRate(
        data.bannerId
      )
      if (
        !gachaBanner ||
        gachaBanner.status !== GachaBannerStatus.ACTIVE ||
        gachaBanner.items.length === 0
      ) {
        throw new InvalidGachaBannerException()
      }

      // Tách 2 mảng
      // 1 cái là list để random, 1 cái là tỉ lệ
      const items: GachaItemType[] = gachaBanner.items.map(
        ({ gachaItemRate, ...rest }) => rest
      )
      const gachaItemRates: GachaItemRateType[] = gachaBanner.items.map(
        ({ gachaItemRate }) => gachaItemRate
      )
      const rollCount = data.rollCount || 1
      // Gộp lại để dễ random
      const gachaPool = items.map((item) => {
        const rateObj = gachaItemRates.find((r) => r.id === item.gachaItemRateId)
        return {
          id: item.pokemonId,
          rate: rateObj?.rate ?? 0,
          starType: rateObj?.starType ?? 'ONE'
        }
      })

      const totalCost = gachaBanner.costRoll * rollCount
      const userWallet = await this.walletService.checkEnoughBalance({
        userId,
        type: walletType.SPARKLES,
        amount: totalCost
      })
      if (!userWallet) throw new NotEnoughBalanceException()

      // 4) transaction
      // 1. Create purchase and minus balance
      const result = await this.gachaPurchaseRepo.withTransaction(async (prismaTx) => {
        // xem có tăng không

        const [purchase, updatedWallet, valueIncrease] = await Promise.all([
          this.gachaPurchaseRepo.create(
            {
              createdById: userId,
              data: {
                userId,
                bannerId: data.bannerId,
                walletTransId: null,
                rollCount: data.rollCount,
                totalCost: totalCost
              }
            },
            prismaTx
          ),
          this.walletService.minusBalanceToWalletWithTypeUserId(
            { userId, type: walletType.SPARKLES, amount: totalCost },
            prismaTx
          ),
          await this.userSubService.getValueConvertByfeatureKeyAndUserId(
            FeatureKey.COIN_MULTIPLIER,
            userId
          )
        ])
        if (!updatedWallet) throw new NotEnoughBalanceException()
        // 2. Create Wallet Transaction referencing the purchase
        const walletTrans = await this.walletTransactionService.record(
          {
            createdById: userId,
            data: {
              walletId: updatedWallet.id,
              userId,
              purpose: walletPurposeType.GACHA,
              referenceId: purchase.id,
              amount: totalCost,
              type: WalletTransactionType.DECREASE,
              source: WalletTransactionSourceType.SHOP_PURCHASE,
              description: `Gacha purchase ${purchase.id}`
            }
          },
          prismaTx
        )

        // 3. Update purchase with walletTransId
        const [finalPurchase] = await Promise.all([
          this.gachaPurchaseRepo.update(
            {
              id: purchase.id,
              data: { walletTransId: walletTrans.id },
              updatedById: userId
            },
            prismaTx
          )
        ])

        // 4. The pity is read (or started) here, inside the transaction: the
        // wallet debit above holds this user's wallet row, so purchases of one
        // user count pity one after another (it used to be read before the
        // transaction, and a concurrent purchase overwrote the count)
        const userPity =
          (await this.userGachaPityRepo.findStatusByUserId(
            userId,
            GachaPityType.PENDING,
            prismaTx
          )) ??
          (await this.userGachaPityRepo.create(
            {
              createdById: userId,
              data: { userId, status: GachaPityType.PENDING, pityCount: 0 }
            },
            prismaTx
          ))

        // Roll logic (collect all results first)
        let pityCount = userPity.pityCount
        let currentPityId = userPity.id
        let currentPityStatus = userPity.status
        const rollResults: any[] = []
        const gachaRollHistoryToCreate: any[] = []

        for (let i = 0; i < rollCount; i++) {
          const { result, pityCount: newPity } = this.rollGacha(
            gachaPool,
            pityCount,
            gachaBanner.hardPity5Star
          )
          // Pity update logic (defer DB update until after loop)
          if (result.starType === 'FIVE') {
            const newStatus =
              newPity === gachaBanner.hardPity5Star
                ? GachaPityType.COMPLETED_MAX
                : GachaPityType.COMPLETED_LUCK
            pityCount = 0
            currentPityStatus = GachaPityType.PENDING
            // Mark for update after loop
            gachaRollHistoryToCreate.push({
              updatePity: {
                id: currentPityId,
                data: { pityCount: newPity, status: newStatus }
              },
              createNewPity: true
            })
            // We'll create new pity after loop
          } else {
            pityCount = newPity
            gachaRollHistoryToCreate.push({
              updatePity: { id: currentPityId, data: { pityCount: newPity } },
              createNewPity: false
            })
          }
          rollResults.push(result)
        }

        // Guarantee at least one 3★+ for 10-roll
        if (data.rollCount === 10) {
          const hasHighStar = rollResults.some(
            (r) =>
              r.starType === 'THREE' || r.starType === 'FOUR' || r.starType === 'FIVE'
          )
          if (!hasHighStar) {
            const poolThree = gachaPool.filter((r) => r.starType === 'THREE')
            const poolFour = gachaPool.filter((r) => r.starType === 'FOUR')
            const threeFourTotal = poolThree.length + poolFour.length
            if (threeFourTotal > 0) {
              // Weighted pick between THREE and FOUR at 2:8 ratio (20%:80%)
              let guaranteed
              if (poolThree.length > 0 && poolFour.length > 0) {
                const pickFour = Math.random() < 0.8 // 80% chance FOUR
                const chosenPool = pickFour ? poolFour : poolThree
                guaranteed = chosenPool[Math.floor(Math.random() * chosenPool.length)]
              } else if (poolFour.length > 0) {
                guaranteed = poolFour[Math.floor(Math.random() * poolFour.length)]
              } else {
                guaranteed = poolThree[Math.floor(Math.random() * poolThree.length)]
              }
              const lowStarIndexes = rollResults
                .map((r, i) => (r.starType === 'ONE' || r.starType === 'TWO' ? i : -1))
                .filter((i) => i !== -1)
              if (lowStarIndexes.length > 0) {
                const replaceIndex =
                  lowStarIndexes[Math.floor(Math.random() * lowStarIndexes.length)]
                rollResults[replaceIndex] = guaranteed
              }
            }
          }
        }

        // 5. Batch check user ownership for all rolled pokemon

        const pokemonIds = rollResults.map((r) => r.id)
        // Use findMany to get all userPokemons with userId and pokemonId in list
        const userPokemons = await this.userPokemonService.findOwnedAmong(
          userId,
          pokemonIds,
          prismaTx
        )
        const ownedPokemonIds = new Set(userPokemons.map((up: any) => up.pokemonId))

        // 6. Prepare bulk create for userPokemon and wallet
        const addPokemonList: any[] = []
        const addSparklesList: any[] = []
        const parseItems: any[] = []
        for (let i = 0; i < rollResults.length; i++) {
          const roll = rollResults[i]
          const isOwned = ownedPokemonIds.has(roll.id)
          let starNum = 1
          if (roll.starType === 'TWO') starNum = 2
          if (roll.starType === 'THREE') starNum = 3
          if (roll.starType === 'FOUR') starNum = 4
          if (roll.starType === 'FIVE') starNum = 5
          // Lấy thông tin pokemon từ items[].pokemon (gachaBanner.items)
          const itemInfo = gachaBanner.items.find((it) => it.pokemonId === roll.id)

          const parseItem: any = {
            ...roll,
            isDuplicate: isOwned,
            pokemon:
              itemInfo && itemInfo['pokemon']
                ? {
                    id: itemInfo['pokemon'].id,
                    pokedex_number: itemInfo['pokemon'].pokedex_number,
                    nameJp: itemInfo['pokemon'].nameJp,
                    nameTranslations: itemInfo['pokemon'].nameTranslations,
                    imageUrl: itemInfo['pokemon'].imageUrl,
                    rarity: itemInfo['pokemon'].rarity
                  }
                : null
          }

          if (!isOwned) {
            addPokemonList.push({ userId, data: { pokemonId: roll.id } })
            // owned from here on: the same Pokemon later in this purchase is a
            // duplicate (it used to be added once per roll)
            ownedPokemonIds.add(roll.id)
            parseItem.parseItem = null
          } else {
            const reward =
              Math.floor(starNum * gachaBanner.costRoll * 0.2) * valueIncrease
            addSparklesList.push(reward)
            parseItem.parseItem = { sparkles: reward }
          }
          parseItems.push(parseItem)
        }

        // 7. Bulk create userPokemon

        if (addPokemonList.length > 0) {
          // one after another: adding reads the user's Pokemon (first one is main)
          for (const item of addPokemonList) {
            await this.userPokemonService.addPokemonByGacha(item, prismaTx)
          }
        }
        // 8. Bulk add SPARKLES
        if (addSparklesList.length > 0) {
          const totalSparkles = addSparklesList.reduce((a, b) => a + b, 0)

          await this.walletService.addBalanceToWalletWithType(
            {
              userId,
              type: walletType.SPARKLES,
              amount: totalSparkles
            },
            prismaTx
          )
        }

        // 9. Create GachaRollHistory for each roll
        for (let i = 0; i < rollResults.length; i++) {
          const roll = rollResults[i]
          await this.gachaRollHistoryRepo.create(
            {
              createdById: userId,
              data: {
                purchaseId: finalPurchase.id,
                userId,
                bannerId: data.bannerId,
                pokemonId: roll.id,
                rarity: roll.starType,
                pityId: currentPityId,
                pityNow: pityCount,
                pityStatus: currentPityStatus
              }
            },
            prismaTx
          )
        }

        // 10. Update pity status (after all rolls)
        // (for simplicity, just update the last one)
        if (gachaRollHistoryToCreate.length > 0) {
          for (const pityAction of gachaRollHistoryToCreate) {
            await this.userGachaPityRepo.update(pityAction.updatePity, prismaTx)
            if (pityAction.createNewPity) {
              const newPityObj = await this.userGachaPityRepo.create(
                {
                  createdById: userId,
                  data: {
                    userId,
                    status: GachaPityType.PENDING,
                    pityCount: 0
                  }
                },
                prismaTx
              )
              currentPityId = newPityObj.id
              currentPityStatus = GachaPityType.PENDING
            }
          }
        }

        return { finalPurchase, parseItems }
      })

      return {
        statusCode: 201,
        data: result.parseItems,
        message: this.i18nService.translate(GachaPurchaseMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) throw new NotFoundRecordException()
      if (isForeignKeyConstraintPrismaError(error)) throw new NotFoundRecordException()
      throw error
    }
  }

  async getByUser(userId: number, lang: string = 'vi') {
    const data = await this.gachaPurchaseRepo.findByUserId(userId)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(GachaPurchaseMessage.GET_LIST_SUCCESS, lang)
    }
  }

  rollGacha(
    pool: {
      id: number
      rate: number
      starType: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE'
    }[],
    pityCount: number, // số roll chưa ra 5★
    pityLimit: number = 90
  ) {
    let currentPity = pityCount

    const getRandomItem = () => {
      const totalRate = pool.reduce((sum, i) => sum + i.rate, 0)
      const rand = Math.random() * totalRate
      let cumulative = 0
      for (const item of pool) {
        cumulative += item.rate
        if (rand < cumulative) return item
      }
      return pool[pool.length - 1]
    }

    let selected

    // 🧭 Nếu đạt pity => đảm bảo 5★
    if (currentPity + 1 >= pityLimit) {
      const fiveStarPool = pool.filter((p) => p.starType === 'FIVE')
      selected = fiveStarPool[Math.floor(Math.random() * fiveStarPool.length)]
      currentPity++
    } else {
      selected = getRandomItem()
      currentPity = currentPity + 1
    }

    return { result: selected, pityCount: currentPity }
  }
}
