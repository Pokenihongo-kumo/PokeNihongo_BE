import {
  walletPurposeType,
  WalletTransactionSourceType
} from '@/common/constants/wallet-transaction.constant'
import { walletType } from '@/common/constants/wallet.constant'
import { PokemonService } from '@/modules/pokemon/pokemon.service'
import { WalletService } from '@/modules/wallet/wallet.service'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQuery } from '@/shared/models/request.model'
import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { ShopBannerRepo } from '../shop-banner/shop-banner.repo'
import { ShopItemRepo } from '../shop-item/shop-item.repo'
import { UserHasPokemonException } from '../user-pokemon/dto/user-pokemon.error'
import { UserPokemonService } from '../user-pokemon/user-pokemon.service'
import {
  NotEnoughBalanceException,
  PurchaseLimitReachedException,
  ShopNotOpenException,
  ShopPurchaseNotFoundException
} from './dto/shop-purchase.error'
import {
  CreateShopPurchaseBody,
  UpdateShopPurchaseBody
} from './dto/shop-purchase.zod-dto'
import { ShopPurchaseRepo } from './shop-purchase.repo'

@Injectable()
export class ShopPurchaseService {
  constructor(
    private shopPurchaseRepo: ShopPurchaseRepo,
    private readonly shopItemRepo: ShopItemRepo,
    @Inject(forwardRef(() => ShopBannerRepo))
    private readonly shopBannerRepo: ShopBannerRepo,
    private readonly walletService: WalletService,
    private readonly userPokemonService: UserPokemonService,
    private readonly pokemonService: PokemonService
  ) {}

  async list(pagination: PaginationQuery) {
    const data = await this.shopPurchaseRepo.list(pagination)
    return data
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number) {
    const shopPurchase = await this.shopPurchaseRepo.findById(id)
    if (!shopPurchase) {
      throw new ShopPurchaseNotFoundException()
    }

    return shopPurchase
  }

  async create({ userId, data }: { userId: number; data: CreateShopPurchaseBody }) {
    try {
      const shopItem = await this.shopItemRepo.findById(data.shopItemId)
      if (!shopItem) throw new NotFoundRecordException()

      // 2)tong tien ne
      const totalPrice = data.quantity * shopItem.price

      // 3)may co du tien ko ?
      const [userWallet, existed, totalPurchased, shopBanner] = await Promise.all([
        this.walletService.checkEnoughBalance({
          userId,
          type: walletType.SPARKLES,
          amount: totalPrice
        }),
        this.userPokemonService.findByUserAndPokemon(userId, shopItem.pokemonId),
        this.shopPurchaseRepo.getTotalPurchasedQuantityByUserAndItem(
          userId,
          data.shopItemId
        ),
        this.shopBannerRepo.findById(shopItem.shopBannerId)
      ])

      // shop mo cua chua ma doi mua ??
      if (!shopBanner) throw new NotFoundRecordException()

      if (shopBanner.status !== 'ACTIVE') {
        throw new ShopNotOpenException()
      }
      // ko du ma doi mua ha ?
      if (!userWallet) throw new NotEnoughBalanceException()

      // 3.5) user da co pokemon nay chua
      if (existed) {
        throw new UserHasPokemonException()
      }

      // 3.6) Check purchase limit (nếu có giới hạn)
      if (shopItem.purchaseLimit !== null) {
        const newTotal = totalPurchased + data.quantity
        if (newTotal > shopItem.purchaseLimit) {
          throw new PurchaseLimitReachedException()
        }
      }

      // 4) transaction
      const result = await this.shopPurchaseRepo.withTransaction(async (prismaTx) => {
        // 4.1) tao lich su mua hang (tam thoi chua co walletTransId)
        const purchase = await this.shopPurchaseRepo.create(
          {
            createdById: userId,
            data: {
              userId,
              shopItemId: data.shopItemId,
              walletTransId: null,
              quantity: data.quantity,
              totalPrice
            }
          },
          prismaTx
        )

        // 4.2) tru tien + ghi wallet transaction tham chieu purchase; ko du la chui
        const debited = await this.walletService.debit(
          {
            userId,
            type: walletType.SPARKLES,
            amount: totalPrice,
            createdById: userId,
            purpose: walletPurposeType.SHOP,
            referenceId: purchase.id,
            source: WalletTransactionSourceType.SHOP_PURCHASE,
            description: `Shop purchase ${purchase.id}`
          },
          prismaTx
        )
        if (!debited) throw new NotEnoughBalanceException()
        const walletTrans = debited.transaction

        // 4.4) Update purchase with walletTransId
        // Add Pokemon to user inventory (level 1, nickname null, isMain false)

        const [finalPurchase] = await Promise.all([
          this.shopPurchaseRepo.update(
            {
              id: purchase.id,
              data: { walletTransId: walletTrans.id },
              updatedById: userId
            },
            prismaTx
          ),
          this.userPokemonService.addPokemonByShop(
            { userId, pokemonId: shopItem.pokemonId },
            prismaTx as any
          ),
          this.shopItemRepo.incrementPurchasedCount(
            data.shopItemId,
            data.quantity,
            prismaTx
          )
        ])

        return finalPurchase
      })

      return result
    } catch (error) {
      if (isNotFoundPrismaError(error)) throw new NotFoundRecordException()
      if (isForeignKeyConstraintPrismaError(error)) throw new NotFoundRecordException()
      throw error
    }
  }

  async update({
    id,
    data,
    userId
  }: {
    id: number
    data: UpdateShopPurchaseBody
    userId?: number
  }) {
    try {
      // 0) lay cai purchase ra
      const existing = await this.shopPurchaseRepo.findById(id)
      if (!existing) throw new ShopPurchaseNotFoundException()

      // 1) xem coi item moi hay cu, co doi so luong ko
      const effectiveShopItemId = data.shopItemId ?? existing.shopItemId
      const effectiveQuantity = data.quantity ?? existing.quantity

      // 2) lay ra item de tinh tien
      const shopItem = await this.shopItemRepo.findById(effectiveShopItemId)
      if (!shopItem) throw new NotFoundRecordException()

      // 3) Compute totals
      const oldTotal = existing.totalPrice
      const newTotal = effectiveQuantity * shopItem.price

      // 4) transaction
      const result = await this.shopPurchaseRepo.withTransaction(async (prismaTx) => {
        // 4.1) If total changed: refund old, then charge new
        if (newTotal !== oldTotal) {
          const movement = {
            userId: existing.userId,
            type: walletType.SPARKLES,
            createdById: userId,
            purpose: walletPurposeType.SHOP,
            referenceId: id,
            source: WalletTransactionSourceType.SHOP_PURCHASE
          }
          // nhet lai tien cu ve vi (INCREASE)
          const refunded = await this.walletService.credit(
            {
              ...movement,
              amount: oldTotal,
              description: `Refund previous total for purchase ${id}`
            },
            prismaTx
          )
          if (!refunded) throw new NotEnoughBalanceException()

          // tru tien moi (DECREASE); ko du tien thi null
          const charged = await this.walletService.debit(
            {
              ...movement,
              amount: newTotal,
              description: `Charge new total for purchase ${id}`
            },
            prismaTx
          )
          if (!charged) throw new NotEnoughBalanceException()
        }

        // 4.2) Update purchase record
        const updated = await this.shopPurchaseRepo.update(
          {
            id,
            data: {
              ...data,
              shopItemId: effectiveShopItemId,
              quantity: effectiveQuantity,
              totalPrice: newTotal
            } as any,
            updatedById: userId
          },
          prismaTx
        )
        return updated
      })

      return result
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new ShopPurchaseNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }) {
    try {
      const existShopPurchase = await this.shopPurchaseRepo.findById(id)
      if (!existShopPurchase) throw new ShopPurchaseNotFoundException()

      await this.shopPurchaseRepo.withTransaction(async (prismaTx) => {
        // 1) Refund full amount to wallet + log refund transaction
        const refunded = await this.walletService.credit(
          {
            userId: existShopPurchase.userId,
            type: walletType.SPARKLES,
            amount: existShopPurchase.totalPrice,
            createdById: userId,
            purpose: walletPurposeType.SHOP,
            referenceId: id,
            source: WalletTransactionSourceType.SHOP_PURCHASE,
            description: `Refund on delete purchase ${id}`
          },
          prismaTx
        )
        if (!refunded) throw new NotFoundRecordException()

        // 3) Soft delete purchase
        await this.shopPurchaseRepo.delete(id, false, prismaTx)
      })

      return
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new ShopPurchaseNotFoundException()
      }
      throw error
    }
  }

  async getByUser(userId: number) {
    const data = await this.shopPurchaseRepo.findByUserId(userId)
    return data
  }
}
