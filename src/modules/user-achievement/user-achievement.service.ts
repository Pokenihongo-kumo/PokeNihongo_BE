import {
  AchievementType as AchievementTypeEnum,
  UserAchievementStatus
} from '@/common/constants/achievement.constant'
import { I18nService } from '@/i18n/i18n.service'
import { UserAchievementMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { PrismaService } from '@/shared/services/prisma.service'
import { HttpStatus, Injectable } from '@nestjs/common'
import { UserRewardSourceType } from '@prisma/client'
import { AchievementGroupRepo } from '../achievement-group/achievement-group.repo'
import { AchievementRepo } from '../achievement/achievement.repo'
import { LanguagesRepo } from '../languages/languages.repo'
import { RewardService } from '../reward/reward.service'
import { UserProgressService } from '../user-progress/user-progress.service'
import {
  StatusClaimedException,
  UserAchievementNotFoundException
} from './dto/user-achievement.error'
import {
  CreateUserAchievementBodyType,
  UpdateUserAchievementBodyType
} from './entities/user-achievement.entity'
import { UserAchievementRepo } from './user-achievement.repo'

@Injectable()
export class UserAchievementService {
  constructor(
    private userAchievementRepo: UserAchievementRepo,
    private achievementGroupRepo: AchievementGroupRepo,
    private achievementRepo: AchievementRepo,
    private readonly languageRepo: LanguagesRepo,
    private readonly prismaService: PrismaService,
    private readonly i18nService: I18nService,
    private readonly userProgressService: UserProgressService,

    private readonly rewardService: RewardService
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.userAchievementRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(UserAchievementMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const userAchievement = await this.userAchievementRepo.findById(id)
    if (!userAchievement) {
      throw new UserAchievementNotFoundException()
    }

    return {
      statusCode: 200,
      data: userAchievement,
      message: this.i18nService.translate(UserAchievementMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async create(
    { userId, data }: { userId: number; data: CreateUserAchievementBodyType },
    lang: string = 'vi'
  ) {
    try {
      const result = await this.userAchievementRepo.create({
        createdById: userId,
        data: {
          ...data
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(UserAchievementMessage.CREATE_SUCCESS, lang)
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
      data: UpdateUserAchievementBodyType
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      const userAchievement = await this.userAchievementRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return {
        statusCode: 200,
        data: userAchievement,
        message: this.i18nService.translate(UserAchievementMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserAchievementNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existUserAchievement = await this.userAchievementRepo.findById(id)
      if (!existUserAchievement) {
        throw new UserAchievementNotFoundException()
      }

      await this.userAchievementRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(UserAchievementMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserAchievementNotFoundException()
      }
      throw error
    }
  }

  async getListAchieveforUser(
    userId: number,
    lang: string = 'vi',
    pagination: PaginationQueryType,
    achCurrentPage?: number,
    achPageSize?: number,
    achievementGroupId?: number
  ) {
    // 1. Resolve language id
    const langId = await this.languageRepo.getIdByCode(lang)

    // 2. Fetch paginated achievement groups (non-admin view)
    // NOTE: even when achievementGroupId is provided we still return the groups list
    // and only apply achievementGroupId to which group's achievements are paginated by
    // the provided achCurrentPage/achPageSize. This prevents losing other groups.
    const groupsPage: any = await this.achievementGroupRepo.list(
      pagination,
      langId ?? undefined,
      false
    )

    const groupIds = (groupsPage.results || []).map((g: any) => g.id)
    if (groupIds.length === 0) {
      return {
        statusCode: 200,
        data: groupsPage,
        message: this.i18nService.translate(UserAchievementMessage.GET_LIST_SUCCESS, lang)
      }
    }

    // 3. Fetch achievements for these groups (only active ones for user)
    // If achPagination is provided, paginate achievements *per group*; otherwise use default per-group pagination.
    let achievements: any[] = []
    const perGroupAchievementCounts: Map<number, number> = new Map()

    const defaultPageSize = 3
    const achSkip = achCurrentPage && achPageSize ? (achCurrentPage - 1) * achPageSize : 0
    const achTake = achCurrentPage && achPageSize ? achPageSize : defaultPageSize

    const perGroupPromises = (groupsPage.results || []).map(async (g: any) => {
      // decide whether this group should use the provided achCurrentPage/achPageSize
      const isTargetGroup = achievementGroupId ? achievementGroupId === g.id : true

      // when achCurrentPage/achPageSize are provided, only apply them to the target group(s)
      const skip = achCurrentPage && achPageSize && isTargetGroup ? achSkip : 0
      const take =
        achCurrentPage && achPageSize && isTargetGroup ? achTake : defaultPageSize

      const [count, rows] = await Promise.all([
        this.prismaService.achievement.count({
          where: { groupId: g.id, deletedAt: null, isActive: true }
        }),
        this.prismaService.achievement.findMany({
          where: { groupId: g.id, deletedAt: null, isActive: true },
          include: {
            nameTranslations: { select: { value: true, languageId: true } },
            reward: {
              include: { nameTranslations: { select: { value: true, languageId: true } } }
            }
          },
          orderBy: [{ achievementTierType: 'asc' }, { id: 'asc' }],
          skip,
          take
        })
      ])
      perGroupAchievementCounts.set(g.id, count)
      return { groupId: g.id, rows }
    })

    const perGroupResults = await Promise.all(perGroupPromises)
    perGroupResults.forEach((r) => {
      achievements.push(...r.rows)
    })

    const achievementIds = achievements.map((a: any) => a.id)

    // 4. Fetch existing userAchievement for this user and these achievements
    const existingUserAchievements = achievementIds.length
      ? await this.prismaService.userAchievement.findMany({
          where: { userId, achievementId: { in: achievementIds }, deletedAt: null }
        })
      : []

    const existingMap = new Map<number, any>()
    existingUserAchievements.forEach((ua: any) => existingMap.set(ua.achievementId, ua))

    // 5. Create missing userAchievement records (only for active achievements we fetched)
    const missingAchievementIds = achievementIds.filter((id) => !existingMap.has(id))
    if (missingAchievementIds.length > 0) {
      await this.userAchievementRepo.withTransaction(async (tx) => {
        const creates = missingAchievementIds.map((aid) =>
          this.userAchievementRepo.create(
            {
              createdById: userId,
              data: {
                userId,
                achievementId: aid,
                status: UserAchievementStatus.IN_PROGRESS
              }
            },
            tx
          )
        )
        const created = await Promise.all(creates)
        created.forEach((c: any) => existingMap.set(c.achievementId, c))
      })
    }

    // check các achievement COMPLETE_LESSON đã hoàn thành tiêu chí chưa
    // (nếu có) => nếu có thì cập nhật status và achievedAt
    await this.checkAnyAchievementcompletetheCriteria(userId, achievements, existingMap)

    // 6. Group achievements by groupId for attaching to group results
    const achByGroup = new Map<number, any[]>()
    for (const a of achievements) {
      const arr = achByGroup.get(a.groupId) || []
      arr.push(a)
      achByGroup.set(a.groupId, arr)
    }

    // 7. Build final grouped results: for each group include achievements and userAchievement
    //    - strip raw translation arrays from groups and achievements to keep payload light
    const results = (groupsPage.results || []).map((g: any) => {
      const { nameTranslations: _nt, ...groupWithoutTranslations } = g
      const groupAchList = achByGroup.get(g.id) || []
      const achs = groupAchList.map((a: any) => {
        const nameTranslation = langId
          ? (a.nameTranslations?.find((t: any) => t.languageId === langId)?.value ??
            a.nameKey)
          : undefined
        const ua = existingMap.get(a.id) || null
        // extract raw translations and reward raw translations
        const {
          nameTranslations: _ant,
          reward: _r,
          ...achievementWithoutTranslations
        } = a

        // map reward (include only current language translation)
        let reward = null
        if (a.reward) {
          const rewardName = langId
            ? (a.reward.nameTranslations?.find((t: any) => t.languageId === langId)
                ?.value ?? a.reward.nameKey)
            : undefined
          const { nameTranslations: _rnt, ...rewardWithoutTranslations } = a.reward
          reward = {
            ...rewardWithoutTranslations,
            nameTranslation: rewardName
          }
        }

        return {
          ...achievementWithoutTranslations,
          nameTranslation,
          userAchievement: ua,
          reward
        }
      })

      // build achievements pagination info per-group
      const isTargetGroup = achievementGroupId ? achievementGroupId === g.id : true
      const achPage =
        achCurrentPage && achPageSize && isTargetGroup
          ? {
              current: achCurrentPage,
              pageSize: achPageSize,
              totalItem: perGroupAchievementCounts.get(g.id) ?? 0,
              totalPage: Math.ceil(
                (perGroupAchievementCounts.get(g.id) ?? 0) / achPageSize
              )
            }
          : undefined

      const defaultPageSize = 3
      const totalItem = perGroupAchievementCounts.get(g.id) ?? achs.length
      const defaultAchPage = {
        current: 1,
        pageSize: defaultPageSize,
        totalItem,
        totalPage: totalItem > 0 ? Math.ceil(totalItem / defaultPageSize) : 0
      }
      const finalAchPage = achPage ? achPage : defaultAchPage

      return {
        ...groupWithoutTranslations,
        achievements: {
          results: achs
        }
      }
    })

    return {
      statusCode: 200,
      data: {
        results,
        pagination: groupsPage.pagination
      },
      message: this.i18nService.translate(UserAchievementMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async getReward({ id, userId }: { id: number; userId: number }, lang: string = 'vi') {
    try {
      // 1. Fetch user achievement with achievement details
      const userAchievement = await this.prismaService.userAchievement.findUnique({
        where: { id, deletedAt: null },
        include: {
          achievement: {
            include: {
              reward: true
            }
          }
        }
      })

      if (!userAchievement) {
        throw new UserAchievementNotFoundException()
      }

      // 2. Verify ownership
      if (userAchievement.userId !== userId) {
        throw new NotFoundRecordException()
      }

      // 3. Check if achievement is completed but not claimed yet
      if (userAchievement.status !== UserAchievementStatus.COMPLETED_NOT_CLAIMED) {
        throw new StatusClaimedException() // Can add a specific exception like UserCanNotClaimRewardsException
      }

      // 4. Check if achievement has a reward
      if (!userAchievement.achievement?.reward) {
        throw new StatusClaimedException() // Can add a specific exception like UserNotHaveRewardsToClaimException
      }

      // 5. Get reward ID
      const rewardId = userAchievement.achievement.reward.id

      // 6. Convert and give reward to user
      const rewardResults = await this.rewardService.convertRewardsWithUser(
        [rewardId],
        userId,
        UserRewardSourceType.ACHIEVEMENT_REWARD
      )

      // 7. Update status to CLAIMED
      await this.userAchievementRepo.update({
        id,
        data: {
          status: UserAchievementStatus.CLAIMED
        },
        updatedById: userId
      })

      return {
        statusCode: HttpStatus.OK,
        data: rewardResults,
        message: this.i18nService.translate(
          UserAchievementMessage.GET_REWARD_SUCCESS,
          lang
        )
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserAchievementNotFoundException()
      }
      throw error
    }
  }

  // check các achievement COMPLETE_LESSON đã hoàn thành tiêu chí chưa
  async checkAnyAchievementcompletetheCriteria(
    userId: number,
    achievements: any[],
    userAchievementMap: Map<number, any>
  ) {
    if (!achievements.length) return

    const lessonAchievements = achievements.filter(
      (a) => a?.conditionType === AchievementTypeEnum.COMPLETE_LESSON
    )
    if (!lessonAchievements.length) return

    const progressData =
      await this.userProgressService.getCompletedLessonsForAchievements(userId)
    const completedLessons = progressData.completedLessons || []

    if (!completedLessons.length) return

    const completedLessonIds = new Map<number, Date>()
    completedLessons.forEach((p) => {
      const completedAt = p.completedAt ?? new Date()
      completedLessonIds.set(p.lessonId, completedAt)
    })

    const totalCompleted = progressData.totalCompleted || completedLessons.length

    for (const achievement of lessonAchievements) {
      const ua = userAchievementMap.get(achievement.id)
      if (!ua || ua.status === UserAchievementStatus.CLAIMED) continue

      let qualified = false
      let achievedAt: Date | null = ua.achievedAt ?? null

      // Thành tựu yêu cầu hoàn thành một bài cụ thể (conditionElementId = lessonId)
      if (achievement.conditionElementId) {
        const lessonDate = completedLessonIds.get(achievement.conditionElementId)
        if (lessonDate) {
          qualified = true
          achievedAt = achievedAt ?? lessonDate
        }
        // Thành tựu yêu cầu hoàn thành đủ số lượng bài (conditionValue = số bài)
      } else if (achievement.conditionValue && achievement.conditionValue > 0) {
        if (totalCompleted >= achievement.conditionValue) {
          qualified = true
          const index = Math.min(
            achievement.conditionValue - 1,
            completedLessons.length - 1
          )
          const milestone = completedLessons[index]
          achievedAt = achievedAt ?? milestone.completedAt ?? new Date()
        }
      }

      if (!qualified) continue

      if (ua.status !== UserAchievementStatus.COMPLETED_NOT_CLAIMED || !ua.achievedAt) {
        const updated = await this.prismaService.userAchievement.update({
          where: { id: ua.id },
          data: {
            status:
              ua.status === UserAchievementStatus.CLAIMED
                ? ua.status
                : UserAchievementStatus.COMPLETED_NOT_CLAIMED,
            achievedAt: achievedAt ?? new Date()
          }
        })
        userAchievementMap.set(achievement.id, updated)
      }
    }
  }
}
