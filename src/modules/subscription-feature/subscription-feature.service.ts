import { FeatureKey } from '@/common/constants/subscription.constant'
import { I18nService } from '@/i18n/i18n.service'
import { SubscriptionFeatureMessage } from '@/i18n/message-keys'
import { SubscriptionService } from '@/modules/subscription/subscription.service'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import {
  InvalidValueForCoinMultiplierExistsException,
  InvalidValueForXPMultiplierExistsException,
  SubscriptionFeatureIsDuplicateException,
  SubscriptionFeatureNotFoundException
} from './dto/subscription-feature.error'
import {
  CreateSubscriptionFeatureBody,
  UpdateSubscriptionFeatureBody,
  UpdateWithListItemBody
} from './dto/subscription-feature.zod-dto'
import { SubscriptionFeatureRepo } from './subscription-feature.repo'

@Injectable()
export class SubscriptionFeatureService {
  constructor(
    private subscriptionFeatureRepo: SubscriptionFeatureRepo,
    private readonly subscriptionService: SubscriptionService,
    private readonly i18nService: I18nService
  ) {}

  async list(pagination: PaginationQuery, lang: string = 'vi') {
    const data = await this.subscriptionFeatureRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(
        SubscriptionFeatureMessage.GET_LIST_SUCCESS,
        lang
      )
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const subscriptionFeature = await this.subscriptionFeatureRepo.findById(id)
    if (!subscriptionFeature) {
      throw new SubscriptionFeatureNotFoundException()
    }

    return {
      statusCode: 200,
      data: subscriptionFeature,
      message: this.i18nService.translate(
        SubscriptionFeatureMessage.GET_LIST_SUCCESS,
        lang
      )
    }
  }

  async create(
    { userId, data }: { userId: number; data: CreateSubscriptionFeatureBody },
    lang: string = 'vi'
  ) {
    try {
      // Validate numeric multiplier features for create
      // if (
      //   data.featureId === featureId.COIN_MULTIPLIER ||
      //   data.featureId === featureId.XP_MULTIPLIER
      // ) {
      //   const num = Number(data.value)
      //   if (!data.value || !Number.isFinite(num) || num < 1) {
      //     if (data.featureId === featureId.COIN_MULTIPLIER) {
      //       throw new InvalidValueForCoinMultiplierExistsException()
      //     } else {
      //       throw new InvalidValueForXPMultiplierExistsException()
      //     }
      //   }
      //   data.value = num.toString()
      // }
      const result = await this.subscriptionFeatureRepo.create({
        createdById: userId,
        data: {
          ...data
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(
          SubscriptionFeatureMessage.CREATE_SUCCESS,
          lang
        )
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
      data: UpdateSubscriptionFeatureBody
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      // Fetch existing if needed for validation (when only value changed)
      const existing = await this.subscriptionFeatureRepo.findById(id)
      if (!existing) {
        throw new SubscriptionFeatureNotFoundException()
      }
      const effectivefeatureId = data.featureId || existing.featureId
      // if (
      //   effectivefeatureId === featureId.COIN_MULTIPLIER ||
      //   effectivefeatureId === featureId.XP_MULTIPLIER
      // ) {
      //   // Determine value to validate (new value or existing if unchanged?) Only validate new value if provided
      //   if (data.value !== undefined) {
      //     const num = Number(data.value)
      //     if (!data.value || !Number.isFinite(num) || num < 1) {
      //       if (effectivefeatureId === featureId.COIN_MULTIPLIER) {
      //         throw new InvalidValueForCoinMultiplierExistsException()
      //       } else {
      //         throw new InvalidValueForXPMultiplierExistsException()
      //       }
      //     }
      //     data.value = num.toString()
      //   }
      // }
      const subscriptionFeature = await this.subscriptionFeatureRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return {
        statusCode: 200,
        data: subscriptionFeature,
        message: this.i18nService.translate(
          SubscriptionFeatureMessage.UPDATE_SUCCESS,
          lang
        )
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new SubscriptionFeatureNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existSubscriptionFeature = await this.subscriptionFeatureRepo.findById(id)
      if (!existSubscriptionFeature) {
        throw new SubscriptionFeatureNotFoundException()
      }

      await this.subscriptionFeatureRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(
          SubscriptionFeatureMessage.DELETE_SUCCESS,
          lang
        )
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new SubscriptionFeatureNotFoundException()
      }
      throw error
    }
  }

  async updateWithListFeature(
    {
      subscriptionId,
      updatedById,
      data
    }: {
      subscriptionId: number
      updatedById: number
      data: UpdateWithListItemBody
    },
    lang: string = 'vi'
  ) {
    try {
      const isExistSubscription = await this.subscriptionService.getById(subscriptionId)
      if (!isExistSubscription) {
        throw new NotFoundRecordException()
      }
      const created = await this.subscriptionFeatureRepo.withTransaction(async (tx) => {
        const { items } = data

        // 1. Delete existing subscription features for subscriptionId
        await this.subscriptionFeatureRepo.deleteBySubscription(subscriptionId, tx)

        // 2. Get all featureIds to validate
        const featureIds = items.map((item) => item.featureId)
        const features = await this.subscriptionFeatureRepo.findLiveFeatureKeys(
          featureIds,
          tx
        )

        // Build map for quick lookup
        const featureMap = new Map(features.map((f) => [f.id, f.featureKey]))

        // 3. Prepare data for createMany with validation
        const createData = items.map((item) => {
          const featureKey = featureMap.get(item.featureId)

          // Validate numeric multiplier features
          if (featureKey === FeatureKey.COIN_MULTIPLIER) {
            const num = Number(item.value)
            if (!item.value || !Number.isFinite(num) || num < 1) {
              throw new InvalidValueForCoinMultiplierExistsException()
            }
            return {
              subscriptionId,
              featureId: item.featureId,
              value: num.toString(),
              createdById: updatedById,
              updatedById
            }
          } else if (featureKey === FeatureKey.XP_MULTIPLIER) {
            const num = Number(item.value)
            if (!item.value || !Number.isFinite(num) || num < 1) {
              throw new InvalidValueForXPMultiplierExistsException()
            }
            return {
              subscriptionId,
              featureId: item.featureId,
              value: num.toString(),
              createdById: updatedById,
              updatedById
            }
          }

          return {
            subscriptionId,
            featureId: item.featureId,
            value: item.value,
            createdById: updatedById,
            updatedById
          }
        })

        // 4. Create all features at once
        await this.subscriptionFeatureRepo.createManyRows(createData, tx)

        // 5. Re-fetch created data
        return await this.subscriptionFeatureRepo.listBySubscription(subscriptionId, tx)
      })

      return {
        statusCode: 200,
        data: created,
        message: this.i18nService.translate(
          SubscriptionFeatureMessage.UPDATE_SUCCESS,
          lang
        )
      }
    } catch (error) {
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new SubscriptionFeatureIsDuplicateException()
      }
      throw error
    }
  }
}
