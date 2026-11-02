import {
  InvalidUserRewardHistoryDataException,
  USER_REWARD_HISTORY_MESSAGE,
  UserRewardHistoryNotFoundException
} from '@/modules/user-reward-history/dto/user-reward-history.error'
import {
  CreateUserRewardHistoryBodyType,
  GetMyRewardHistoryQueryType,
  GetUserRewardHistoryListQueryType,
  UpdateUserRewardHistoryBodyType
} from '@/modules/user-reward-history/entities/user-reward-history.entities'
import { UserRewardHistoryRepository } from '@/modules/user-reward-history/user-reward-history.repo'
import { RewardRepo } from '@/modules/reward/reward.repo'
import { TranslationService } from '@/modules/translation/translation.service'
import { LanguagesService } from '@/modules/languages/languages.service'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import { RewardTarget, UserRewardSourceType } from '@prisma/client'

@Injectable()
export class UserRewardHistoryService {
  private readonly logger = new Logger(UserRewardHistoryService.name)

  constructor(
    private readonly userRewardHistoryRepository: UserRewardHistoryRepository,
    private readonly rewardRepo: RewardRepo,
    private readonly translationService: TranslationService,
    private readonly languagesService: LanguagesService
  ) {}

  // Reusable builder for history payload
  createEntryPayload(params: {
    userId: number
    rewardId?: number
    rewardTargetSnapshot: RewardTarget
    amount?: number | null
    sourceType?: UserRewardSourceType
    note?: string
    meta?: Record<string, any>
    sourceId?: number
  }) {
    return {
      userId: params.userId,
      rewardId: params.rewardId,
      rewardTargetSnapshot: params.rewardTargetSnapshot,
      amount: params.amount ?? null,
      sourceType: params.sourceType ?? 'REWARD_SERVICE',
      note: params.note,
      meta: params.meta,
      sourceId: params.sourceId
    } as CreateUserRewardHistoryBodyType
  }

  appendEntriesFromRewards(
    entries: CreateUserRewardHistoryBodyType[],
    rewards: { id: number; rewardItem: number }[],
    userId: number,
    rewardTarget: RewardTarget,
    sourceType: UserRewardSourceType,
    amountMultiplier: number = 1,
    sourceId?: number | null
  ) {
    for (const reward of rewards) {
      this.logger.log(
        `Appending history entries for reward ID ${reward.id} with rewardItem ${reward.rewardItem} for user: ${userId} with sourceId: ${sourceId}`
      )
      entries.push(
        this.createEntryPayload({
          userId,
          rewardId: reward.id,
          rewardTargetSnapshot: rewardTarget,
          amount: reward.rewardItem * amountMultiplier,
          sourceType,
          sourceId: sourceId ?? undefined
        })
      )
    }
  }

  async create(body: CreateUserRewardHistoryBodyType) {
    try {
      // Nếu có rewardId, lấy thông tin reward và lưu vào meta
      let meta = body.meta
      if (body.rewardId) {
        const reward = await this.rewardRepo.findById(body.rewardId)
        if (reward) {
          const rewardInfo = {
            id: reward.id,
            nameKey: reward.nameKey,
            rewardType: reward.rewardType,
            rewardItem: reward.rewardItem,
            rewardTarget: reward.rewardTarget
          }
          // Merge với meta hiện tại nếu có
          meta = {
            ...(meta || {}),
            reward: rewardInfo
          }
        }
      }

      const history = await this.userRewardHistoryRepository.create({
        ...body,
        meta
      })
      return {
        statusCode: 201,
        data: history,
        message: USER_REWARD_HISTORY_MESSAGE.CREATE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error creating user reward history:', error)
      if (error instanceof HttpException) {
        throw error
      }
      throw InvalidUserRewardHistoryDataException
    }
  }

  async findAll(query: GetUserRewardHistoryListQueryType) {
    const { currentPage, pageSize } = query
    const result = await this.userRewardHistoryRepository.findMany(query)

    return {
      statusCode: 200,
      message: USER_REWARD_HISTORY_MESSAGE.GET_LIST_SUCCESS,
      data: {
        results: result.items,
        pagination: {
          current: currentPage,
          pageSize,
          totalPage: Math.ceil(result.total / pageSize),
          totalItem: result.total
        }
      }
    }
  }

  async getMy(
    userId: number,
    query: GetMyRewardHistoryQueryType,
    languageCode: string = 'vi'
  ) {
    if (!userId) {
      throw InvalidUserRewardHistoryDataException
    }
    const result = await this.userRewardHistoryRepository.findMany({
      ...query,
      userId
    })

    // Lấy languageId từ languageCode
    const normalizedLang = (languageCode || 'vi').toLowerCase().split('-')[0]
    let languageId: number | undefined
    try {
      const language = await this.languagesService.findByCode({ code: normalizedLang })
      languageId = language?.data?.id
    } catch {
      this.logger.warn(`Language ${normalizedLang} not found, using default`)
    }

    // Thêm nameTranslation cho mỗi item
    const resultsWithTranslation = await Promise.all(
      result.items.map(async (item: any) => {
        let nameTranslation: string | null = null
        let nameKey: string | null = null

        // Ưu tiên lấy từ meta.reward.nameKey, nếu không có thì query từ rewardId
        if (item.meta?.reward?.nameKey) {
          nameKey = item.meta.reward.nameKey
          this.logger.debug(`Using nameKey from meta.reward: ${nameKey}`)
        } else if (item.rewardId) {
          // Query lại reward để lấy nameKey
          try {
            const reward = await this.rewardRepo.findById(item.rewardId)
            if (reward?.nameKey) {
              nameKey = reward.nameKey
              this.logger.debug(`Using nameKey from reward query: ${nameKey}`)
            }
          } catch (error) {
            this.logger.warn(`Failed to get reward ${item.rewardId} for nameKey:`, error)
          }
        }

        // Lấy translation nếu có nameKey và languageId
        if (nameKey && languageId) {
          try {
            this.logger.debug(
              `Looking for translation: key=${nameKey}, languageId=${languageId}`
            )
            const translation = await this.translationService.findByKeyAndLanguage(
              nameKey,
              languageId
            )
            nameTranslation = translation?.value || null
            if (nameTranslation) {
              this.logger.debug(`Found translation: ${nameTranslation}`)
            } else {
              this.logger.warn(
                `Translation not found for key ${nameKey} with languageId ${languageId}`
              )
            }
          } catch (error) {
            this.logger.warn(
              `Failed to get translation for key ${nameKey} with languageId ${languageId}:`,
              error
            )
          }
        } else {
          if (!nameKey) {
            this.logger.debug(`No nameKey found for item ${item.id}`)
          }
          if (!languageId) {
            this.logger.debug(`No languageId found for languageCode ${normalizedLang}`)
          }
        }

        const resultItem = {
          ...item,
          reward: item.reward
            ? {
                id: item.reward.id,
                name: nameTranslation ?? null,
                rewardType: item.reward.rewardType,
                rewardItem: item.reward.rewardItem,
                rewardTarget: item.reward.rewardTarget
              }
            : undefined
        }

        this.logger.debug(
          `Item ${item.id} - name: ${nameTranslation}, reward exists: ${!!item.reward}`
        )

        return resultItem
      })
    )

    return {
      statusCode: 200,
      message: USER_REWARD_HISTORY_MESSAGE.GET_LIST_SUCCESS,
      data: {
        results: resultsWithTranslation,
        pagination: {
          current: result.page,
          pageSize: result.limit,
          totalPage: Math.ceil(result.total / result.limit),
          totalItem: result.total
        }
      }
    }
  }

  async findOne(id: number) {
    const history = await this.userRewardHistoryRepository.findUnique(id)
    if (!history) {
      throw UserRewardHistoryNotFoundException
    }
    return {
      data: history,
      message: USER_REWARD_HISTORY_MESSAGE.GET_SUCCESS
    }
  }

  async update(id: number, body: UpdateUserRewardHistoryBodyType) {
    try {
      const existing = await this.userRewardHistoryRepository.findUnique(id)
      if (!existing) {
        throw UserRewardHistoryNotFoundException
      }

      const history = await this.userRewardHistoryRepository.update(id, body)
      return {
        data: history,
        message: USER_REWARD_HISTORY_MESSAGE.UPDATE_SUCCESS
      }
    } catch (error) {
      this.logger.error(`Error updating user reward history ${id}:`, error)
      if (error instanceof HttpException) {
        throw error
      }
      throw InvalidUserRewardHistoryDataException
    }
  }

  async remove(id: number) {
    try {
      const existing = await this.userRewardHistoryRepository.findUnique(id)
      if (!existing) {
        throw UserRewardHistoryNotFoundException
      }

      const history = await this.userRewardHistoryRepository.delete(id)
      return {
        data: history,
        message: USER_REWARD_HISTORY_MESSAGE.DELETE_SUCCESS
      }
    } catch (error) {
      this.logger.error(`Error deleting user reward history ${id}:`, error)
      if (error instanceof HttpException) {
        throw error
      }
      throw InvalidUserRewardHistoryDataException
    }
  }
}
