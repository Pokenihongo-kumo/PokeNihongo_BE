import { RarityPokemonType } from '@/common/constants/pokemon.constant'
import { ShopBannerStatus } from '@/common/constants/shop-banner.constant'
import { I18nService } from '@/i18n/i18n.service'
import { ShopRarityPriceMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQuery } from '@/shared/models/request.model'
import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { ShopBannerRepo } from '../shop-banner/shop-banner.repo'
import { ShopItemRepo } from '../shop-item/shop-item.repo'
import {
  ShopRarityPriceAlreadyExistsException,
  ShopRarityPriceNotFoundException
} from './dto/shop-rarity-price.error'
import {
  CreateShopRarityPriceBody,
  UpdateShopRarityPriceBody
} from './entities/shop-rarity-price.entity'
import { ShopRarityPriceRepo } from './shop-rarity-price.repo'

@Injectable()
export class ShopRarityPriceService {
  constructor(
    private shopRarityPriceRepo: ShopRarityPriceRepo,
    private readonly i18nService: I18nService,
    @Inject(forwardRef(() => ShopBannerRepo))
    private shopBannerRepo: ShopBannerRepo,
    @Inject(forwardRef(() => ShopItemRepo))
    private shopItemRepo: ShopItemRepo
  ) {}

  async list(pagination: PaginationQuery, lang: string = 'vi') {
    const data = await this.shopRarityPriceRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(ShopRarityPriceMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const shopRarityPrice = await this.shopRarityPriceRepo.findById(id)
    if (!shopRarityPrice) {
      throw new ShopRarityPriceNotFoundException()
    }

    return {
      statusCode: 200,
      data: shopRarityPrice,
      message: this.i18nService.translate(ShopRarityPriceMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async create(
    { userId, data }: { userId: number; data: CreateShopRarityPriceBody },
    lang: string = 'vi'
  ) {
    try {
      //check exist gacha item rate by star type
      const existShopRarityPrice = await this.shopRarityPriceRepo.getByType(data.rarity)
      if (existShopRarityPrice) {
        throw new ShopRarityPriceAlreadyExistsException()
      }

      const result = await this.shopRarityPriceRepo.create({
        createdById: userId,
        data: {
          ...data
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(ShopRarityPriceMessage.CREATE_SUCCESS, lang)
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
      data: UpdateShopRarityPriceBody
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      // Get current rarity price to know which rarity is being updated
      const currentRarityPrice = await this.shopRarityPriceRepo.findById(id)
      if (!currentRarityPrice) {
        throw new ShopRarityPriceNotFoundException()
      }

      if (data.rarity) {
        //check exist gacha item rate by star type
        const existShopRarityPrice = await this.shopRarityPriceRepo.getByType(data.rarity)
        if (existShopRarityPrice && existShopRarityPrice.id !== id) {
          throw new ShopRarityPriceAlreadyExistsException()
        }
      }

      // Extract isChangeAllShopPreview flag before updating
      const { isChangeAllShopPreview, ...updateData } = data

      const shopRarityPrice = await this.shopRarityPriceRepo.update({
        id,
        data: updateData,
        updatedById: userId
      })

      // If isChangeAllShopPreview is true, update all PREVIEW shop banners' items
      if (isChangeAllShopPreview === true && data.price !== undefined) {
        // Get all PREVIEW shop banners
        const previewBanners = await this.shopBannerRepo.list(
          { currentPage: 1, pageSize: 1000, qs: `status=${ShopBannerStatus.PREVIEW}` },
          undefined,
          false
        )

        // For each preview banner, get all shop items and update price by rarity
        const targetRarity = data.rarity ?? currentRarityPrice.rarity
        const newPrice = data.price

        for (const banner of previewBanners.results) {
          // Get all items in this banner
          const items = await this.shopItemRepo.list({
            currentPage: 1,
            pageSize: 1000,
            qs: `shopBannerId=${banner.id}`
          })

          // Update items that match the rarity
          const updatePromises = items.results
            .filter((item: any) => item.pokemon?.rarity === targetRarity)
            .map((item: any) =>
              this.shopItemRepo.update({
                id: item.id,
                data: { price: newPrice },
                updatedById: userId
              })
            )

          await Promise.all(updatePromises)
        }
      }

      return {
        statusCode: 200,
        data: shopRarityPrice,
        message: this.i18nService.translate(ShopRarityPriceMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new ShopRarityPriceNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existShopRarityPrice = await this.shopRarityPriceRepo.findById(id)
      if (!existShopRarityPrice) {
        throw new ShopRarityPriceNotFoundException()
      }

      await this.shopRarityPriceRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(ShopRarityPriceMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new ShopRarityPriceNotFoundException()
      }
      throw error
    }
  }

  async getByType(rarity: RarityPokemonType) {
    return await this.shopRarityPriceRepo.getByType(rarity)
  }
}
