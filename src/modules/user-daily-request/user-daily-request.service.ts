// DailyConditionType enum replaced by DailyRequestCategory.nameKey and DailyRequestCategory.isStreat
import { DailyRequestTypeType } from '@/common/constants/achievement.constant'
import { I18nService } from '@/i18n/i18n.service'
import { UserDailyRequestMessage } from '@/i18n/message-keys'
import { UserService } from '@/modules/user/user.service'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError,
  todayUTCWith0000
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { HttpStatus, Injectable } from '@nestjs/common'
import { DailyRequestRepo } from '../daily-request/daily-request.repo'
import { LanguagesRepo } from '../languages/languages.repo'
import { TranslationRepo } from '../translation/translation.repo'
import { UserDailyRequestAlreadyExistsException } from './dto/user-daily-request.error'
import {
  CreateUserDailyRequestBodyType,
  UpdateUserDailyRequestBodyType
} from './entities/user-daily-request.entity'
import { UserDailyRequestRepo } from './user-daily-request.repo'

@Injectable()
export class UserDailyRequestService {
  constructor(
    private userDailyRequestRepo: UserDailyRequestRepo,
    private readonly i18nService: I18nService,
    private readonly dailyReqRepo: DailyRequestRepo,
    private readonly langRepo: LanguagesRepo,
    private readonly translationRepo: TranslationRepo,
    private readonly userService: UserService
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.userDailyRequestRepo.list(pagination)
    return {
      data,
      message: this.i18nService.translate(UserDailyRequestMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const userDailyRequest = await this.userDailyRequestRepo.findById(id)
    if (!userDailyRequest) {
      throw new NotFoundRecordException()
    }
    return {
      statusCode: HttpStatus.OK,
      data: userDailyRequest,
      message: this.i18nService.translate(UserDailyRequestMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateUserDailyRequestBodyType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    try {
      let progress = 0
      //check xem dailyRequestId nay type la streak ha ? Neu la trick thi cap nhap progress
      const isDailyStreack = await this.dailyReqRepo.checkDailyRequestIsStreak(
        data.dailyRequestId
      )
      if (isDailyStreack) {
        progress = await this.checkStreakComplete(data.userId, data.dailyRequestId)
      }

      const date = todayUTCWith0000()

      const result = await this.userDailyRequestRepo.create({
        createdById,
        data: {
          ...data,
          date,
          progress
        }
      })
      return {
        statusCode: HttpStatus.CREATED,
        data: result,
        message: this.i18nService.translate(UserDailyRequestMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new UserDailyRequestAlreadyExistsException()
      }
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
      updatedById
    }: {
      id: number
      data: UpdateUserDailyRequestBodyType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    try {
      // check xem progress = daily.conditionValue ko
      const isUserdailyReq = await this.userDailyRequestRepo.findById(id)
      if (!isUserdailyReq) {
        throw new NotFoundRecordException()
      }
      const dailyConditionValue = await this.dailyReqRepo.findById(
        isUserdailyReq.dailyRequestId
      )

      if (data.progress && data.progress === dailyConditionValue?.conditionValue) {
        data.isCompleted = true
      }
      const userDailyRequest = await this.userDailyRequestRepo.update({
        id,
        updatedById,
        data
      })
      return {
        data: userDailyRequest,
        message: this.i18nService.translate(UserDailyRequestMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new UserDailyRequestAlreadyExistsException()
      }
      throw error
    }
  }

  async delete(
    { id, deletedById }: { id: number; deletedById: number },
    lang: string = 'vi'
  ) {
    try {
      await this.userDailyRequestRepo.delete({
        id,
        deletedById
      })
      return {
        data: null,
        message: this.i18nService.translate(UserDailyRequestMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async checkStreakComplete(userId: number, dailyRequestId: number) {
    const yesterday = todayUTCWith0000()
    yesterday.setDate(yesterday.getDate() - 1) // Hôm trước

    const userDailyRequest = await this.userDailyRequestRepo.findByUserIdDateDailyId(
      userId,
      yesterday,
      dailyRequestId
    )
    if (userDailyRequest && userDailyRequest.isCompleted) {
      return userDailyRequest.progress
    }
    // Nếu không có record hôm trước hoặc chưa hoàn thành, streak bắt đầu từ 0
    return 0
  }

  /**
   * Lấy danh sách daily request của user hôm nay
   * Nếu chưa có thì tự động tạo mới
   * Kèm theo nameTranslation và descriptionTranslation
   */
  async getUserDailyRequestsToday(userId: number, lang: string = 'vi') {
    try {
      const today = todayUTCWith0000()
      const bDate = todayUTCWith0000()
      bDate.setDate(bDate.getDate() - 1)

      // Lấy languageId từ code
      const languageId = await this.langRepo.getIdByCode(lang)
      if (!languageId) {
        throw new NotFoundRecordException()
      }
      // 1. Lấy tất cả daily requests đang active
      const activeDailyRequests = await this.dailyReqRepo.list(
        {
          currentPage: 1,
          pageSize: 1000,
          qs: 'isActive=true'
        },
        languageId
      )

      // 2. Lấy user daily requests hiện có của user hôm nay
      const existingUserDailyRequests = await this.userDailyRequestRepo.findByUserAndDate(
        userId,
        today
      )
      const existingDailyRequestIds = existingUserDailyRequests.map(
        (udr) => udr.dailyRequestId
      )

      // 3. Tìm những daily requests user chưa có hôm nay và tự động tạo
      const missingDailyRequests = activeDailyRequests.results.filter(
        (dr) => !existingDailyRequestIds.includes(dr.id)
      )

      for (const dailyRequest of missingDailyRequests) {
        try {
          let progress = 0
          // Check nếu là streak type thì tính progress
          const isStreak = await this.dailyReqRepo.checkDailyRequestIsStreak(
            dailyRequest.id
          )
          if (isStreak) {
            progress = await this.checkStreakComplete(userId, dailyRequest.id)
          }

          await this.userDailyRequestRepo.create({
            createdById: userId,
            data: {
              userId,
              dailyRequestId: dailyRequest.id,
              date: today,
              progress
            }
          })
        } catch (error) {
          throw error
        }
      }

      // 4. Lấy lại tất cả user daily requests của user hôm nay (bao gồm vừa tạo)
      const allUserDailyRequests =
        await this.userDailyRequestRepo.findByUserAndDateWithDetails(
          userId,
          today,
          languageId
        )

      // Repo đã map nameTranslation và descriptionTranslation rồi, trả về trực tiếp
      return {
        statusCode: HttpStatus.OK,
        data: allUserDailyRequests,
        message: this.i18nService.translate(
          UserDailyRequestMessage.GET_LIST_SUCCESS,
          lang
        )
      }
    } catch (error) {
      console.error('Error in getUserDailyRequestsToday:', error)
      throw error
    }
  }

  /**
   * Update progress cho daily request không phải streak
   */
  private async updateNormalProgress(userDailyRequestId: number, userId: number) {
    try {
      const userDailyRequest =
        await this.userDailyRequestRepo.findById(userDailyRequestId)
      if (!userDailyRequest) {
        throw new NotFoundRecordException()
      }

      // Lấy thông tin daily request để biết conditionValue
      const dailyRequest = await this.dailyReqRepo.findById(
        userDailyRequest.dailyRequestId
      )
      if (!dailyRequest) {
        throw new NotFoundRecordException()
      }

      // Tăng progress lên 1
      const newProgress = userDailyRequest.progress + 1

      // Check xem đã hoàn thành chưa
      const isCompleted = newProgress >= dailyRequest.conditionValue
      const completedAt = isCompleted ? new Date() : null

      await this.userDailyRequestRepo.update({
        id: userDailyRequestId,
        updatedById: userId,
        data: {
          progress: newProgress,
          isCompleted,
          completedAt
        }
      })
    } catch (error) {
      console.error('Error updating normal progress:', error)
      throw error
    }
  }

  /**
   * Update progress cho daily request streak
   */
  private async updateStreakProgress(userDailyRequestId: number, userId: number) {
    try {
      const userDailyRequest =
        await this.userDailyRequestRepo.findById(userDailyRequestId)
      if (!userDailyRequest) {
        throw new NotFoundRecordException()
      }

      // Lấy thông tin daily request để biết conditionValue
      const dailyRequest = await this.dailyReqRepo.findById(
        userDailyRequest.dailyRequestId
      )
      if (!dailyRequest) {
        throw new NotFoundRecordException()
      }

      // Đối với streak, progress được tính từ streak liên tiếp
      const streakProgress = await this.checkStreakComplete(userId, dailyRequest.id)

      // Check xem đã hoàn thành chưa
      const isCompleted = streakProgress >= dailyRequest.conditionValue
      const completedAt = isCompleted ? new Date() : null

      await this.userDailyRequestRepo.update({
        id: userDailyRequestId,
        updatedById: userId,
        data: {
          progress: streakProgress,
          isCompleted,
          completedAt
        }
      })
    } catch (error) {
      console.error('Error updating streak progress:', error)
      throw error
    }
  }

  async updateProgress({
    userId,
    dailyRequestType,
    progressAdd = 1
  }: {
    userId: number
    dailyRequestType: DailyRequestTypeType
    progressAdd: number
  }) {
    const today = todayUTCWith0000()
    const dailyRequests = await this.dailyReqRepo.findByType(dailyRequestType as any)

    const rewardsToGive: Array<{
      id: number
      rewardType: any
      rewardTarget: any
      rewardItem: number
    }> = []

    let updatedCount = 0

    for (const dr of dailyRequests) {
      const existing = await this.userDailyRequestRepo.findByUserIdDateDailyId(
        userId,
        today,
        dr.id
      )
      console.log('daily: ', dr)

      const isStreak = (dr as any).isStreak

      if (existing) {
        // Skip if already completed
        if (existing.isCompleted) {
          continue
        }
        console.log(existing)

        // Update existing - calculate new progress
        let newProgress: number
        if (isStreak) {
          // For streak, always recalculate from streak history
          newProgress = (await this.checkStreakComplete(userId, dr.id)) + progressAdd
          console.log('streak ne: ', newProgress)
        } else {
          // For non-streak, just increment progress
          newProgress = existing.progress + progressAdd
        }

        const isCompleted = newProgress >= dr.conditionValue
        const completedAt = isCompleted ? new Date() : null

        const willReceiveReward = !existing.isCompleted && isCompleted

        await this.userDailyRequestRepo.update({
          id: existing.id,
          updatedById: userId,
          data: {
            progress: newProgress,
            isCompleted,
            completedAt
          }
        })

        if (willReceiveReward && (dr as any).reward) {
          rewardsToGive.push({
            id: (dr as any).reward.id,
            rewardType: (dr as any).reward.rewardType,
            rewardTarget: (dr as any).reward.rewardTarget,
            rewardItem: (dr as any).reward.rewardItem
          })
        }
        updatedCount++
      } else {
        // create new
        const newProgress = isStreak
          ? (await this.checkStreakComplete(userId, dr.id)) + progressAdd
          : progressAdd
        const isCompleted = newProgress >= dr.conditionValue
        const completedAt = isCompleted ? new Date() : null

        await this.userDailyRequestRepo.create({
          createdById: userId,
          data: {
            userId,
            dailyRequestId: dr.id,
            date: today,
            progress: newProgress,
            isCompleted,
            completedAt
          }
        })

        if (isCompleted && (dr as any).reward) {
          rewardsToGive.push({
            id: (dr as any).reward.id,
            rewardType: (dr as any).reward.rewardType,
            rewardTarget: (dr as any).reward.rewardTarget,
            rewardItem: (dr as any).reward.rewardItem
          })
        }
        updatedCount++
      }
    }

    // Give rewards
    for (const reward of rewardsToGive) {
      if (reward.rewardTarget === 'EXP') {
        await this.userService.userAddExp(userId, reward.rewardItem, 'vi')
      } else if (reward.rewardTarget === 'POINT') {
        await this.userService.addFreeCoins(userId, reward.rewardItem, 'vi')
      }
    }

    return {
      statusCode: HttpStatus.OK,
      data: { updatedCount, rewardsReceived: rewardsToGive },
      message: this.i18nService.translate(UserDailyRequestMessage.UPDATE_SUCCESS, 'vi')
    }
  }

  async updateProgresses({
    userId,
    dailyRequestType,
    progressAdd = 1
  }: {
    userId: number
    dailyRequestType: DailyRequestTypeType[]
    progressAdd: number
  }) {
    const results: any[] = []
    let totalUpdated = 0
    const allRewards: Array<any> = []

    for (const t of dailyRequestType) {
      // call sequentially to avoid contention
      // cast result
      // eslint-disable-next-line no-await-in-loop
      const res: any = await this.updateProgress({
        userId,
        dailyRequestType: t,
        progressAdd
      })
      results.push(res)
      totalUpdated += res.data?.updatedCount ?? 0
      if (Array.isArray(res.data?.rewardsReceived))
        allRewards.push(...res.data.rewardsReceived)
    }

    return {
      statusCode: HttpStatus.OK,
      data: { totalUpdated, rewardsReceived: allRewards },
      message: this.i18nService.translate(UserDailyRequestMessage.UPDATE_SUCCESS, 'vi')
    }
  }
}
