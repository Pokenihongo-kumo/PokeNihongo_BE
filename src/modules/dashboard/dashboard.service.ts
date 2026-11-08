import { RoleName } from '@/common/constants/role.constant'
import { convertEloToRank } from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable, NotFoundException } from '@nestjs/common'
import { LanguagesRepo } from '../languages/languages.repo'
import { DashboardRepo } from './dashboard.repo'

@Injectable()
export class DashboardService {
  constructor(
    private dashboardRepo: DashboardRepo,
    private readonly langRepo: LanguagesRepo,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Thống kê các gói subscription
   */
  async getSubStats(lang: string = 'vi') {
    const result = await this.dashboardRepo.getSubscriptionStats()

    // Format lại plans với nameTranslation và descriptionTranslation theo lang
    const formattedPlans = result.plans.map((plan) => {
      const { subscription } = plan

      // Tìm translation theo lang code
      const nameTranslation =
        subscription.nameTranslations.find((t) => t.language.code === lang)?.value || ''
      const descriptionTranslation =
        subscription.descriptionTranslations.find((t) => t.language.code === lang)
          ?.value || ''

      // Format nameTranslations theo thứ tự en, ja, vi
      const sortedNameTranslations = ['en', 'ja', 'vi']
        .map((code) => {
          const trans = subscription.nameTranslations.find(
            (t) => t.language.code === code
          )
          return trans ? { key: trans.language.code, value: trans.value } : null
        })
        .filter((t) => t !== null)

      // Format descriptionTranslations theo thứ tự en, ja, vi
      const sortedDescriptionTranslations = ['en', 'ja', 'vi']
        .map((code) => {
          const trans = subscription.descriptionTranslations.find(
            (t) => t.language.code === code
          )
          return trans ? { key: trans.language.code, value: trans.value } : null
        })
        .filter((t) => t !== null)

      // Format features với nameTranslation
      const formattedFeatures = subscription.features.map((sf) => {
        const sortedFeatureNameTranslations = ['en', 'ja', 'vi']
          .map((code) => {
            const trans = sf.feature.nameTranslations.find(
              (t) => t.language.code === code
            )
            return trans ? { key: trans.language.code, value: trans.value } : null
          })
          .filter((t) => t !== null)

        return {
          id: sf.id,
          value: sf.value,
          feature: {
            id: sf.feature.id,
            nameKey: sf.feature.nameKey,
            featureKey: sf.feature.featureKey,
            nameTranslation:
              sf.feature.nameTranslations.find((t) => t.language.code === lang)?.value ||
              '',
            nameTranslations: sortedFeatureNameTranslations
          }
        }
      })

      return {
        planId: plan.planId,
        subscriptionId: plan.subscriptionId,
        subscription: {
          id: subscription.id,
          nameKey: subscription.nameKey,
          descriptionKey: subscription.descriptionKey,
          tagName: subscription.tagName,
          nameTranslation,
          nameTranslations: sortedNameTranslations,
          descriptionTranslation,
          descriptionTranslations: sortedDescriptionTranslations,
          features: formattedFeatures
        },
        durationInDays: plan.durationInDays,
        price: plan.price,
        type: plan.type,
        stats: plan.stats
      }
    })

    return {
      totalActivePlans: result.totalActivePlans,
      plans: formattedPlans
    }
  }

  /**
   * Thống kê doanh thu theo tháng/năm
   */
  async getSubStatsRevenue(lang: string = 'vi', month?: number, year?: number) {
    return this.dashboardRepo.getRevenueStats(month, year)
  }

  /**
   * Thống kê doanh thu 12 tháng của năm
   */
  async getYearlyRevenue(lang: string = 'vi', year?: number) {
    return this.dashboardRepo.getYearlyRevenueBreakdown(lang, year)
  }

  async getListUserRegister(query: PaginationQueryType, lang: string = 'vi') {
    const langId = await this.langRepo.getIdByCode(lang)
    if (!langId) {
      return this.dashboardRepo.getUsersSubWithSubPlan(query)
    }
    return this.dashboardRepo.getUsersSubWithSubPlan(query, langId)
  }

  /**
   * Tổng số người dùng (role = learner)
   */
  async getTotalUsers() {
    return this.dashboardRepo.getTotalUsers()
  }

  /**
   * Số lượng người dùng mới theo period (day/week/month)
   */
  async getNewUsers(period: string = 'month') {
    return this.dashboardRepo.getNewUsers(period)
  }

  /**
   * Người dùng hoạt động theo period (day/week/month) - dựa vào lastActive
   */
  async getActiveUsers(period: string = 'month') {
    return this.dashboardRepo.getActiveUsers(period)
  }

  /**
   * Kích hoạt account: pending_test, pending_choose_level_jlpt, pending_choose_pokemon
   */
  async getAccountActivation() {
    return this.dashboardRepo.getAccountActivation()
  }

  /**
   * Phân bổ trình độ JLPT: N3, N4, N5 với total và percent
   */
  async getJLPTDistribution() {
    return this.dashboardRepo.getJLPTDistribution()
  }

  /**
   * Tỷ lệ Duy trì Streak - xem qua attendance
   */
  async getStreakRetention() {
    return this.dashboardRepo.getStreakRetention()
  }

  /**
   * Phân phối Pokémon Khởi đầu
   */
  async getStarterPokemonDistribution() {
    return this.dashboardRepo.getStarterPokemonDistribution()
  }

  /**
   * Hoạt động Battle - trả ra các mùa với thống kê user theo JLPT
   */
  async getBattleActivity(lang: string = 'vi') {
    return this.dashboardRepo.getBattleActivity(lang)
  }

  /**
   * Mức độ tích lũy sparkles của user
   */
  async getSparklesAccumulation() {
    return this.dashboardRepo.getSparklesAccumulation()
  }

  /**
   * Nội dung Phổ biến nhất - phần học nào được học nhiều nhất
   */
  async getPopularContent(lang: string = 'vi') {
    return this.dashboardRepo.getPopularContent(lang)
  }

  /**
   * Tỷ lệ Hoàn thành Bài học (Completion Rate)
   */
  async getLessonCompletionRate(lang: string = 'vi') {
    return this.dashboardRepo.getLessonCompletionRate(lang)
  }

  /**
   * Leaderboard Season Overview - Tổng quan giải đấu
   */
  async getLeaderboardSeasonOverview(lang: string = 'vi') {
    const totalSeasons = await this.prisma.leaderboardSeason.count({
      where: { deletedAt: null }
    })

    const activeSeasons = await this.prisma.leaderboardSeason.count({
      where: { status: 'ACTIVE', deletedAt: null }
    })

    const currentSeason = await this.prisma.leaderboardSeason.findFirst({
      where: { status: 'ACTIVE', deletedAt: null },
      include: {
        userHistories: {
          where: { user: { role: { name: RoleName.Learner }, deletedAt: null } },
          select: { userId: true }
        }
      },
      orderBy: { startDate: 'desc' }
    })

    const currentParticipants = currentSeason?.userHistories.length || 0

    const previousSeason = await this.prisma.leaderboardSeason.findFirst({
      where: { status: 'EXPIRED', deletedAt: null },
      include: {
        userHistories: {
          where: { user: { role: { name: RoleName.Learner }, deletedAt: null } },
          select: { userId: true }
        }
      },
      orderBy: { endDate: 'desc' }
    })

    const previousParticipants = previousSeason?.userHistories.length || 0
    let participationChangeRate = 0
    let participationChange = 0

    if (previousParticipants > 0) {
      participationChange = currentParticipants - previousParticipants
      participationChangeRate = (participationChange / previousParticipants) * 100
    } else if (currentParticipants > 0) {
      participationChangeRate = 100
      participationChange = currentParticipants
    }

    return {
      totalSeasons,
      activeSeasons,
      currentParticipants,
      previousParticipants,
      participationChange,
      participationChangeRate: parseFloat(participationChangeRate.toFixed(2))
    }
  }

  /**
   * Helper: Generate time periods for grouping
   */
  private generatePeriods(
    startDate: Date,
    endDate: Date,
    period: string = 'month'
  ): Array<{ start: Date; end: Date; key: string }> {
    const periods: Array<{ start: Date; end: Date; key: string }> = []
    const current = new Date(startDate)

    while (current <= endDate) {
      if (period === 'day') {
        const dayStart = new Date(current)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(current)
        dayEnd.setHours(23, 59, 59, 999)

        periods.push({
          start: dayStart,
          end: dayEnd > endDate ? endDate : dayEnd,
          key: dayStart.toISOString().split('T')[0]
        })

        current.setDate(current.getDate() + 1)
      } else if (period === 'week') {
        const weekStart = new Date(current)
        weekStart.setHours(0, 0, 0, 0)
        const weekEnd = new Date(current)
        weekEnd.setDate(weekEnd.getDate() + 6)
        weekEnd.setHours(23, 59, 59, 999)

        const actualEnd = weekEnd > endDate ? endDate : weekEnd
        periods.push({
          start: weekStart,
          end: actualEnd,
          key: `${weekStart.toISOString().split('T')[0]}_to_${actualEnd.toISOString().split('T')[0]}`
        })

        current.setDate(current.getDate() + 7)
      } else {
        const monthStart = new Date(
          current.getFullYear(),
          current.getMonth(),
          1,
          0,
          0,
          0,
          0
        )
        const monthEnd = new Date(
          current.getFullYear(),
          current.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        )

        const actualStart = monthStart < startDate ? startDate : monthStart
        const actualEnd = monthEnd > endDate ? endDate : monthEnd

        periods.push({
          start: actualStart,
          end: actualEnd,
          key: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
        })

        current.setMonth(current.getMonth() + 1)
      }
    }

    return periods
  }

  /**
   * Leaderboard Stats - Tổng quan (Danh sách mùa ACTIVE + EXPIRED với pagination)
   */
  async getLeaderboardSeasonStats(
    lang: string = 'vi',
    page: number = 1,
    pageSize: number = 10,
    period: string = 'month'
  ) {
    const skip = (page - 1) * pageSize

    // Lấy danh sách mùa ACTIVE + EXPIRED
    const seasons = await this.prisma.leaderboardSeason.findMany({
      where: {
        status: { in: ['ACTIVE', 'EXPIRED'] },
        deletedAt: null
      },
      include: {
        nameTranslations: {
          include: { language: { select: { code: true } } }
        },
        userHistories: {
          where: {
            user: {
              role: { name: RoleName.Learner },
              deletedAt: null
            }
          },
          select: {
            id: true,
            userId: true,
            finalElo: true,
            finalRank: true,
            createdAt: true,
            user: { select: { eloscore: true } }
          }
        },
        matches: {
          select: {
            id: true,
            status: true,
            winnerId: true,
            createdAt: true,
            participants: {
              select: { userId: true }
            }
          }
        }
      },
      orderBy: { startDate: 'desc' },
      skip,
      take: pageSize
    })

    // Tính tổng số mùa (cho pagination)
    const totalCount = await this.prisma.leaderboardSeason.count({
      where: {
        status: { in: ['ACTIVE', 'EXPIRED'] },
        deletedAt: null
      }
    })

    // Tính tổng user Learner trong hệ thống
    const totalUsers = await this.prisma.user.count({
      where: {
        role: { name: RoleName.Learner },
        deletedAt: null
      }
    })

    // Tính streak cho tất cả learner (reuse logic từ getStreakRetention)
    const streakByUser = await this.dashboardRepo.calculateUserStreaks()

    // Format lại data cho mỗi mùa
    const formattedSeasons = await Promise.all(
      seasons.map(async (season) => {
        // Format nameTranslations
        const nameTranslations = ['en', 'ja', 'vi']
          .map((code) => {
            const trans = season.nameTranslations.find((t) => t.language.code === code)
            return trans ? { key: code, value: trans.value } : null
          })
          .filter((t) => t !== null)

        // Lấy nameTranslation theo lang của user
        const nameTranslation =
          season.nameTranslations.find((t) => t.language.code === lang)?.value || ''

        // Determine end date based on season status
        const seasonEnd = season.status === 'ACTIVE' ? new Date() : season.endDate

        // Generate periods
        const periods = this.generatePeriods(season.startDate, seasonEnd, period)

        // Calculate stats for each period
        const periodStats: Record<string, any> = {}

        periods.forEach((p) => {
          // Total participants up to end of this period (cumulative)
          const participantsInPeriodCount = season.userHistories.filter(
            (uh) => uh.createdAt <= p.end
          ).length

          // New participants who joined within this period window
          const newParticipantsInPeriod = season.userHistories.filter(
            (uh) => uh.createdAt >= p.start && uh.createdAt <= p.end
          ).length

          // Matches in this period
          const matchesInPeriod = season.matches.filter(
            (m) =>
              m.createdAt >= p.start && m.createdAt <= p.end && m.status === 'COMPLETED'
          )

          // Active participants (unique users who played matches in the period)
          const activeParticipantsSet = new Set<number>()
          matchesInPeriod.forEach((match) => {
            match.participants.forEach((pt) => activeParticipantsSet.add(pt.userId))
          })
          const activeParticipantsInPeriod = activeParticipantsSet.size

          // Calculate win/loss/draw stats
          const userStats = new Map<
            number,
            { wins: number; losses: number; draws: number }
          >()
          matchesInPeriod.forEach((match) => {
            match.participants.forEach((participant) => {
              if (!userStats.has(participant.userId)) {
                userStats.set(participant.userId, { wins: 0, losses: 0, draws: 0 })
              }
              const stats = userStats.get(participant.userId)!
              if (match.winnerId === participant.userId) {
                stats.wins++
              } else if (match.winnerId == null) {
                stats.draws++
              } else {
                stats.losses++
              }
            })
          })

          let totalWins = 0
          let totalLosses = 0
          let totalDraws = 0
          userStats.forEach((stats) => {
            totalWins += stats.wins
            totalLosses += stats.losses
            totalDraws += stats.draws
          })

          const totalCompletedMatches = totalWins + totalLosses + totalDraws
          const winRate =
            totalCompletedMatches > 0
              ? parseFloat(((totalWins / totalCompletedMatches) * 100).toFixed(2))
              : 0
          const lossRate =
            totalCompletedMatches > 0
              ? parseFloat(((totalLosses / totalCompletedMatches) * 100).toFixed(2))
              : 0
          const drawRate =
            totalCompletedMatches > 0
              ? parseFloat(((totalDraws / totalCompletedMatches) * 100).toFixed(2))
              : 0

          periodStats[p.key] = {
            participantsInPeriod: participantsInPeriodCount,
            newParticipantsInPeriod,
            activeParticipantsInPeriod,
            matchesInPeriod: matchesInPeriod.length,
            totalWins,
            totalLosses,
            totalDraws,
            winRate,
            lossRate,
            drawRate
          }
        })

        // Số user tham gia mùa này (từ UserSeasonHistory)
        const participantCount = season.userHistories.length
        const nonParticipantCount = totalUsers - participantCount

        // Tính rank distribution
        const rankDistribution = this.calculateRankDistribution(
          season.userHistories,
          season.status
        )

        // Tổng số trận COMPLETED trong mùa
        const totalMatchesCompleted = season.matches.filter(
          (m) => m.status === 'COMPLETED'
        ).length

        // Tổng số trận trong mùa
        const totalMatches = season.matches.length

        // User IDs tham gia các trận đấu trong season này
        const userIdsInMatches = new Set<number>()
        season.matches.forEach((match) => {
          match.participants.forEach((p) => userIdsInMatches.add(p.userId))
        })

        // User có UserSeasonHistory nhưng không có MatchParticipant nào
        const participantsWithNoMatches = season.userHistories.filter(
          (uh) => !userIdsInMatches.has(uh.userId)
        ).length

        // Learner KHÔNG có UserSeasonHistory cho season này NHƯNG có streak > 0
        const userIdsInSeason = new Set(season.userHistories.map((uh) => uh.userId))
        const learnersNotInSeasonWithStreak = Array.from(streakByUser.entries()).filter(
          ([userId, streak]) => !userIdsInSeason.has(userId) && streak > 0
        ).length

        return {
          id: season.id,
          nameKey: season.nameKey,
          nameTranslation,
          nameTranslations,
          status: season.status,
          startDate: season.startDate,
          endDate: season.endDate,
          totalParticipants: participantCount,
          totalNonParticipants: nonParticipantCount,
          totalMatches,
          totalMatchesSuccess: totalMatchesCompleted,
          participantsWithNoMatches,
          learnersNotInSeasonWithStreak,
          rankDistribution,
          periodStats
        }
      })
    )

    return {
      data: formattedSeasons,
      pagination: {
        current: page,
        pageSize,
        totalItem: totalCount,
        totalPage: Math.ceil(totalCount / pageSize)
      }
    }
  }

  /**
   * Leaderboard Stats - Chi tiết 1 mùa
   */
  async getLeaderboardSeasonDetail(
    seasonId: number,
    lang: string = 'vi',
    period: string = 'month'
  ) {
    const season = await this.prisma.leaderboardSeason.findUnique({
      where: { id: seasonId, deletedAt: null },
      include: {
        nameTranslations: {
          include: { language: { select: { code: true } } }
        },
        userHistories: {
          where: {
            user: {
              role: { name: RoleName.Learner },
              deletedAt: null
            }
          },
          select: {
            id: true,
            userId: true,
            createdAt: true,
            finalElo: true,
            finalRank: true,
            user: { select: { eloscore: true } }
          }
        },
        matches: {
          include: {
            participants: {
              select: { userId: true }
            }
          }
        }
      }
    })

    if (!season) {
      throw new NotFoundException()
    }

    // Format nameTranslations
    const nameTranslations = ['en', 'ja', 'vi']
      .map((code) => {
        const trans = season.nameTranslations.find((t) => t.language.code === code)
        return trans ? { key: code, value: trans.value } : null
      })
      .filter((t) => t !== null)

    // Lấy nameTranslation theo lang của user
    const nameTranslation =
      season.nameTranslations.find((t) => t.language.code === lang)?.value || ''

    // Tính tổng user Learner trong hệ thống
    const totalUsers = await this.prisma.user.count({
      where: {
        role: { name: RoleName.Learner },
        deletedAt: null
      }
    })

    // Tính streak cho tất cả learner
    const streakByUser = await this.dashboardRepo.calculateUserStreaks()

    // Số user tham gia mùa này (từ UserSeasonHistory)
    const participantCount = season.userHistories.length
    const nonParticipantCount = totalUsers - participantCount

    // Tính rank distribution
    const rankDistribution = this.calculateRankDistribution(
      season.userHistories,
      season.status
    )

    // Tổng số trận và số trận COMPLETED trong mùa
    const totalMatches = season.matches.length
    const totalMatchesCompleted = season.matches.filter(
      (m) => m.status === 'COMPLETED'
    ).length

    // User IDs tham gia các trận đấu trong season này
    const userIdsInMatches = new Set<number>()
    season.matches.forEach((match) => {
      match.participants.forEach((p) => userIdsInMatches.add(p.userId))
    })

    // User có UserSeasonHistory nhưng không có MatchParticipant nào
    const participantsWithNoMatches = season.userHistories.filter(
      (uh) => !userIdsInMatches.has(uh.userId)
    ).length

    // Learner KHÔNG có UserSeasonHistory cho season này NHƯNG có streak > 0
    const userIdsInSeason = new Set(season.userHistories.map((uh) => uh.userId))
    const learnersNotInSeasonWithStreak = Array.from(streakByUser.entries()).filter(
      ([userId, streak]) => !userIdsInSeason.has(userId) && streak > 0
    ).length

    // Tính periodStats tương tự endpoint stats
    const seasonEnd = season.status === 'ACTIVE' ? new Date() : season.endDate
    const periods = this.generatePeriods(season.startDate, seasonEnd, period)

    const periodStats: Record<string, any> = {}

    periods.forEach((p) => {
      // Total participants up to end of this period (cumulative)
      const participantsInPeriodCount = season.userHistories.filter(
        (uh) => uh.createdAt <= p.end
      ).length

      // New participants who joined within this period window
      const newParticipantsInPeriod = season.userHistories.filter(
        (uh) => uh.createdAt >= p.start && uh.createdAt <= p.end
      ).length

      const matchesInPeriod = season.matches.filter(
        (m) => m.createdAt >= p.start && m.createdAt <= p.end && m.status === 'COMPLETED'
      )

      // Active participants (unique users who played matches in the period)
      const activeParticipantsSet = new Set<number>()
      matchesInPeriod.forEach((match) => {
        match.participants.forEach((pt) => activeParticipantsSet.add(pt.userId))
      })
      const activeParticipantsInPeriod = activeParticipantsSet.size

      const userStats = new Map<number, { wins: number; losses: number; draws: number }>()

      matchesInPeriod.forEach((match) => {
        match.participants.forEach((participant) => {
          if (!userStats.has(participant.userId)) {
            userStats.set(participant.userId, { wins: 0, losses: 0, draws: 0 })
          }
          const stats = userStats.get(participant.userId)!
          if (match.winnerId === participant.userId) {
            stats.wins++
          } else if (match.winnerId == null) {
            stats.draws++
          } else {
            stats.losses++
          }
        })
      })

      let totalWins = 0
      let totalLosses = 0
      let totalDraws = 0
      userStats.forEach((stats) => {
        totalWins += stats.wins
        totalLosses += stats.losses
        totalDraws += stats.draws
      })

      const totalCompletedMatches = totalWins + totalLosses + totalDraws
      const winRate =
        totalCompletedMatches > 0
          ? parseFloat(((totalWins / totalCompletedMatches) * 100).toFixed(2))
          : 0
      const lossRate =
        totalCompletedMatches > 0
          ? parseFloat(((totalLosses / totalCompletedMatches) * 100).toFixed(2))
          : 0
      const drawRate =
        totalCompletedMatches > 0
          ? parseFloat(((totalDraws / totalCompletedMatches) * 100).toFixed(2))
          : 0

      periodStats[p.key] = {
        participantsInPeriod: participantsInPeriodCount,
        newParticipantsInPeriod,
        activeParticipantsInPeriod,
        matchesInPeriod: matchesInPeriod.length,
        totalWins,
        totalLosses,
        totalDraws,
        winRate,
        lossRate,
        drawRate
      }
    })

    return {
      id: season.id,
      nameKey: season.nameKey,
      nameTranslation,
      nameTranslations,
      status: season.status,
      startDate: season.startDate,
      endDate: season.endDate,
      totalParticipants: participantCount,
      totalNonParticipants: nonParticipantCount,
      totalMatches,
      totalMatchesSuccess: totalMatchesCompleted,
      participantsWithNoMatches,
      learnersNotInSeasonWithStreak,
      rankDistribution,
      periodStats
    }
  }

  /**
   * Helper: Tính rank distribution dựa trên trạng thái mùa
   * - EXPIRED: dùng finalRank từ UserSeasonHistory
   * - ACTIVE: dùng eloscore hiện tại và convertEloToRank
   */
  private calculateRankDistribution(userHistories: any[], status: string) {
    const rankCounts = { N3: 0, N4: 0, N5: 0 }

    for (const uh of userHistories) {
      let rank: string

      if (status === 'EXPIRED') {
        // Dùng finalRank từ UserSeasonHistory
        rank = uh.finalRank || 'N5'
      } else {
        // ACTIVE: dùng eloscore hiện tại
        const currentElo = uh.user?.eloscore || 0
        rank = convertEloToRank(currentElo)
      }

      if (rank in rankCounts) {
        rankCounts[rank]++
      }
    }

    const totalParticipants = userHistories.length || 1 // Tránh chia cho 0

    return ['N3', 'N4', 'N5'].map((rankName) => ({
      rankName,
      count: rankCounts[rankName],
      percentage: parseFloat(
        ((rankCounts[rankName] / totalParticipants) * 100).toFixed(2)
      )
    }))
  }

  /**
   * Gacha Stats - Tổng quan (tổng ACTIVE/EXPIRED + list banner với pagination)
   */
  async getGachaStatsOverview(
    lang: string = 'vi',
    page: number = 1,
    pageSize: number = 10
  ) {
    return this.dashboardRepo.getGachaStatsOverview(lang, page, pageSize)
  }

  /**
   * Gacha Stats - Chi tiết 1 banner
   */
  async getGachaStatsDetail(gachaBannerId: number, lang: string = 'vi') {
    return this.dashboardRepo.getGachaStatsDetail(gachaBannerId, lang)
  }
}
