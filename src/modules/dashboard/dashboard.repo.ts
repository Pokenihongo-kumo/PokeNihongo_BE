import { RoleName } from '@/common/constants/role.constant'
import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable, NotFoundException } from '@nestjs/common'
import { InvoiceStatus, PrismaClient, UserSubscriptionStatus } from '@prisma/client'
import { todayUTCWith0000 } from 'src/shared/helpers'
import { PrismaService } from 'src/shared/services/prisma.service'
import { USER_SEASON_HISTORY_FIELDS } from '../user-subscription/entities/user-subscription.entity'

@Injectable()
export class DashboardRepo {
  constructor(private prismaService: PrismaService) {}
  async withTransaction<T>(callback: (prismaTx: PrismaClient) => Promise<T>): Promise<T> {
    return this.prismaService.$transaction(callback)
  }

  /**
   * Lấy thống kê các gói subscription đang active
   */
  async getSubscriptionStats() {
    // Lấy danh sách các gói đang active
    const activePlans = await this.prismaService.subscriptionPlan.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        subscriptionId: true,
        durationInDays: true,
        price: true,
        type: true,
        subscription: {
          select: {
            id: true,
            nameKey: true,
            descriptionKey: true,
            tagName: true,
            nameTranslations: {
              select: {
                id: true,
                languageId: true,
                value: true,
                language: {
                  select: {
                    code: true
                  }
                }
              }
            },
            descriptionTranslations: {
              select: {
                id: true,
                languageId: true,
                value: true,
                language: {
                  select: {
                    code: true
                  }
                }
              }
            },
            features: {
              select: {
                id: true,
                value: true,
                feature: {
                  select: {
                    id: true,
                    nameKey: true,
                    featureKey: true,
                    nameTranslations: {
                      select: {
                        id: true,
                        languageId: true,
                        value: true,
                        language: {
                          select: {
                            code: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    // Lấy tổng số user trong hệ thống
    const totalUsers = await this.prismaService.user.count({
      where: {
        deletedAt: null
      }
    })

    // Lấy thống kê cho từng gói
    const stats = await Promise.all(
      activePlans.map(async (plan) => {
        const [totalPurchases, activeUsers] = await Promise.all([
          // Tổng lượt mua thành công (đếm invoice PAID)
          this.prismaService.invoice.count({
            where: {
              subscriptionPlanId: plan.id,
              deletedAt: null,
              status: InvoiceStatus.PAID
            }
          }),
          // Số người đang có gói (ACTIVE)
          this.prismaService.userSubscription.count({
            where: {
              subscriptionPlanId: plan.id,
              deletedAt: null,
              status: UserSubscriptionStatus.ACTIVE
            }
          })
        ])

        return {
          planId: plan.id,
          subscriptionId: plan.subscriptionId,
          subscription: plan.subscription,
          durationInDays: plan.durationInDays,
          price: plan.price,
          type: plan.type,
          stats: {
            totalPurchases,
            activeUsers,
            inactiveUsers: totalUsers - activeUsers
          }
        }
      })
    )

    return {
      totalActivePlans: activePlans.length,
      plans: stats
    }
  }

  /**
   * Lấy thống kê doanh thu theo tháng/năm
   */
  async getRevenueStats(month?: number, year?: number) {
    const currentYear = year || new Date().getFullYear()
    const currentMonth = month || new Date().getMonth() + 1

    // Lấy danh sách các gói đang active
    const activePlans = await this.prismaService.subscriptionPlan.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        subscriptionId: true,
        durationInDays: true,
        price: true,
        type: true,
        subscription: {
          select: {
            id: true,
            nameKey: true,
            descriptionKey: true,
            tagName: true
          }
        }
      }
    })

    // Tính doanh thu cho từng gói
    const revenueByPlan = await Promise.all(
      activePlans.map(async (plan) => {
        // Doanh thu tháng hiện tại
        const monthRevenue = await this.prismaService.invoice.aggregate({
          where: {
            subscriptionPlanId: plan.id,
            status: InvoiceStatus.PAID,
            deletedAt: null,
            createdAt: {
              gte: new Date(currentYear, currentMonth - 1, 1),
              lt: new Date(currentYear, currentMonth, 1)
            }
          },
          _sum: {
            totalAmount: true
          },
          _count: true
        })

        // Doanh thu năm hiện tại
        const yearRevenue = await this.prismaService.invoice.aggregate({
          where: {
            subscriptionPlanId: plan.id,
            status: InvoiceStatus.PAID,
            deletedAt: null,
            createdAt: {
              gte: new Date(currentYear, 0, 1),
              lt: new Date(currentYear + 1, 0, 1)
            }
          },
          _sum: {
            totalAmount: true
          },
          _count: true
        })

        return {
          planId: plan.id,
          subscriptionId: plan.subscriptionId,
          subscription: plan.subscription,
          durationInDays: plan.durationInDays,
          price: plan.price,
          type: plan.type,
          revenue: {
            month: {
              total: monthRevenue._sum?.totalAmount || 0,
              count: monthRevenue._count
            },
            year: {
              total: yearRevenue._sum?.totalAmount || 0,
              count: yearRevenue._count
            }
          }
        }
      })
    )

    // Tính tổng doanh thu
    const totalMonthRevenue = revenueByPlan.reduce(
      (sum, plan) => sum + (plan.revenue.month.total || 0),
      0
    )
    const totalYearRevenue = revenueByPlan.reduce(
      (sum, plan) => sum + (plan.revenue.year.total || 0),
      0
    )

    return {
      period: {
        month: currentMonth,
        year: currentYear
      },
      totalRevenue: {
        month: totalMonthRevenue,
        year: totalYearRevenue
      },
      plans: revenueByPlan
    }
  }

  /**
   * Lấy thống kê doanh thu 12 tháng của năm
   * Mỗi tháng có: doanh thu các gói, số người đăng ký, tăng giảm so với tháng trước
   */
  async getYearlyRevenueBreakdown(lang: string = 'vi', year?: number) {
    const targetYear = year || new Date().getFullYear()

    // Lấy danh sách các gói đang active
    const activePlans = await this.prismaService.subscriptionPlan.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        subscriptionId: true,
        price: true,
        type: true,
        subscription: {
          select: {
            id: true,
            nameKey: true,
            tagName: true,
            nameTranslations: {
              select: {
                value: true,
                language: {
                  select: {
                    code: true
                  }
                }
              }
            }
          }
        }
      }
    })

    // Tạo array 12 tháng
    const monthlyData = await Promise.all(
      Array.from({ length: 12 }, async (_, index) => {
        const month = index + 1
        const startDate = new Date(targetYear, month - 1, 1)
        const endDate = new Date(targetYear, month, 1)

        // Tính doanh thu và số lượt mua cho từng gói trong tháng
        const planStats = await Promise.all(
          activePlans.map(async (plan) => {
            const invoiceData = await this.prismaService.invoice.aggregate({
              where: {
                subscriptionPlanId: plan.id,
                status: InvoiceStatus.PAID,
                deletedAt: null,
                createdAt: {
                  gte: startDate,
                  lt: endDate
                }
              },
              _sum: {
                totalAmount: true
              },
              _count: true
            })

            // Đếm số người đăng ký mới trong tháng (theo startDate của UserSubscription)
            const newSubscribers = await this.prismaService.userSubscription.count({
              where: {
                subscriptionPlanId: plan.id,
                deletedAt: null,
                startDate: {
                  gte: startDate,
                  lt: endDate
                }
              }
            })

            // Tìm translation theo lang code
            const nameTranslation =
              plan.subscription.nameTranslations.find((t) => t.language.code === lang)
                ?.value || plan.subscription.nameKey

            return {
              planId: plan.id,
              nameTranslation,
              tagName: plan.subscription.tagName,
              revenue: invoiceData._sum?.totalAmount || 0,
              purchases: invoiceData._count,
              newSubscribers
            }
          })
        )

        // Tổng doanh thu tháng
        const totalRevenue = planStats.reduce((sum, p) => sum + p.revenue, 0)
        const totalPurchases = planStats.reduce((sum, p) => sum + p.purchases, 0)
        const totalNewSubscribers = planStats.reduce(
          (sum, p) => sum + p.newSubscribers,
          0
        )

        return {
          month,
          year: targetYear,
          totalRevenue,
          totalPurchases,
          totalNewSubscribers,
          plans: planStats
        }
      })
    )

    // Tính tăng giảm so với tháng trước cho mỗi tháng
    const monthlyDataWithGrowth = monthlyData.map((currentMonth, index) => {
      if (index === 0) {
        // Tháng 1 không có tháng trước để so sánh
        return {
          ...currentMonth,
          growth: {
            revenue: { amount: 0, percentage: 0, trend: 'stable' as const },
            purchases: { amount: 0, percentage: 0, trend: 'stable' as const },
            newSubscribers: { amount: 0, percentage: 0, trend: 'stable' as const }
          }
        }
      }

      const previousMonth = monthlyData[index - 1]

      // Tính tăng giảm doanh thu
      const revenueDiff = currentMonth.totalRevenue - previousMonth.totalRevenue
      const revenuePercentage =
        previousMonth.totalRevenue > 0
          ? (revenueDiff / previousMonth.totalRevenue) * 100
          : currentMonth.totalRevenue > 0
            ? 100
            : 0

      // Tính tăng giảm số lượt mua
      const purchasesDiff = currentMonth.totalPurchases - previousMonth.totalPurchases
      const purchasesPercentage =
        previousMonth.totalPurchases > 0
          ? (purchasesDiff / previousMonth.totalPurchases) * 100
          : currentMonth.totalPurchases > 0
            ? 100
            : 0

      // Tính tăng giảm số người đăng ký mới
      const subscribersDiff =
        currentMonth.totalNewSubscribers - previousMonth.totalNewSubscribers
      const subscribersPercentage =
        previousMonth.totalNewSubscribers > 0
          ? (subscribersDiff / previousMonth.totalNewSubscribers) * 100
          : currentMonth.totalNewSubscribers > 0
            ? 100
            : 0

      return {
        ...currentMonth,
        growth: {
          revenue: {
            amount: revenueDiff,
            percentage: Math.round(revenuePercentage * 100) / 100,
            trend:
              revenuePercentage > 0
                ? ('up' as const)
                : revenuePercentage < 0
                  ? ('down' as const)
                  : ('stable' as const)
          },
          purchases: {
            amount: purchasesDiff,
            percentage: Math.round(purchasesPercentage * 100) / 100,
            trend:
              purchasesPercentage > 0
                ? ('up' as const)
                : purchasesPercentage < 0
                  ? ('down' as const)
                  : ('stable' as const)
          },
          newSubscribers: {
            amount: subscribersDiff,
            percentage: Math.round(subscribersPercentage * 100) / 100,
            trend:
              subscribersPercentage > 0
                ? ('up' as const)
                : subscribersPercentage < 0
                  ? ('down' as const)
                  : ('stable' as const)
          }
        }
      }
    })

    // Tổng hợp cả năm
    const yearTotal = {
      revenue: monthlyData.reduce((sum, m) => sum + m.totalRevenue, 0),
      purchases: monthlyData.reduce((sum, m) => sum + m.totalPurchases, 0),
      newSubscribers: monthlyData.reduce((sum, m) => sum + m.totalNewSubscribers, 0)
    }

    return {
      year: targetYear,
      yearTotal,
      months: monthlyDataWithGrowth
    }
  }

  // Lấy danh sách user đăng ký gần đây

  async getUsersSubWithSubPlan(pagination: PaginationQueryType, langId?: number) {
    const { where, orderBy } = parseQs(pagination.qs, USER_SEASON_HISTORY_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere: any = {
      deletedAt: null,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.userSubscription.count({ where: filterWhere }),
      this.prismaService.userSubscription.findMany({
        where: filterWhere,
        include: {
          // invoice: true,
          subscriptionPlan: {
            include: {
              subscription: {
                include: {
                  nameTranslations: { select: { value: true, languageId: true } },
                  descriptionTranslations: { select: { value: true, languageId: true } }
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc',
          ...orderBy
        },
        skip,
        take
      })
    ])

    const results = data.map((us: any) => {
      const plan = us.subscriptionPlan
      if (!plan || !plan.subscription) return us
      const sub = plan.subscription
      const { nameTranslations, descriptionTranslations, ...subRest } = sub

      const nameTranslation = langId
        ? (nameTranslations?.find((t: any) => t.languageId === langId)?.value ??
          sub.nameKey)
        : sub.nameKey
      const descriptionTranslation = langId
        ? (descriptionTranslations?.find((t: any) => t.languageId === langId)?.value ??
          sub.descriptionKey)
        : sub.descriptionKey

      return {
        ...us,
        subscriptionPlan: {
          ...plan,
          subscription: {
            ...subRest,
            nameTranslations,
            descriptionTranslations,
            nameTranslation,
            descriptionTranslation
          }
        }
      }
    })

    return {
      results,
      pagination: {
        current: pagination.currentPage,
        pageSize: pagination.pageSize,
        totalPage: Math.ceil(totalItems / pagination.pageSize),
        totalItem: totalItems
      }
    }
  }

  /**
   * Tổng số người dùng có role = learner
   */
  async getTotalUsers() {
    const total = await this.prismaService.user.count({
      where: {
        deletedAt: null,
        role: {
          name: RoleName.Learner
        }
      }
    })

    return { total }
  }

  /**
   * Số lượng người dùng mới theo period (day/week/month)
   */
  async getNewUsers(period: string = 'month') {
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        weekStart.setHours(0, 0, 0, 0)
        startDate = weekStart
        break
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
    }

    const count = await this.prismaService.user.count({
      where: {
        deletedAt: null,
        role: {
          name: RoleName.Learner
        },
        createdAt: {
          gte: startDate,
          lte: now
        }
      }
    })

    return { count, period }
  }

  /**
   * Người dùng hoạt động theo period - dựa vào Device.lastActive
   */
  async getActiveUsers(period: string = 'month') {
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        weekStart.setHours(0, 0, 0, 0)
        startDate = weekStart
        break
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
    }

    // Count distinct users with devices that have lastActive in the period
    const activeUsers = await this.prismaService.user.count({
      where: {
        deletedAt: null,
        role: {
          name: RoleName.Learner
        },
        devices: {
          some: {
            lastActive: {
              gte: startDate,
              lte: now
            }
          }
        }
      }
    })

    return { activeUsers, period }
  }

  /**
   * Kích hoạt account: pending_test, test_again, pending_choose_level_jlpt, pending_choose_pokemon
   * - pending_test: Count distinct users with any PLACEMENT_TEST_DONE status != COMPLETED
   * - test_again: Count distinct users with PLACEMENT_TEST_DONE status = COMPLETED
   * - pending_choose_level_jlpt: User có levelJLPT = null
   * - pending_choose_pokemon: User chưa có UserPokemon nào
   */
  async getAccountActivation() {
    // Get total learner users
    const totalUsers = await this.prismaService.user.count({
      where: {
        deletedAt: null,
        role: { name: RoleName.Learner }
      }
    })

    // Get distinct users with PLACEMENT_TEST status != COMPLETED
    const pendingTestUsers = await this.prismaService.userTestAttempt.findMany({
      where: {
        status: { not: 'COMPLETED' },
        test: {
          testType: 'PLACEMENT_TEST_DONE'
        }
      },
      select: {
        userId: true
      },
      distinct: ['userId']
    })

    // Get distinct users with PLACEMENT_TEST status = COMPLETED
    const testAgainUsers = await this.prismaService.userTestAttempt.findMany({
      where: {
        status: 'COMPLETED',
        test: {
          testType: 'PLACEMENT_TEST_DONE'
        }
      },
      select: {
        userId: true
      },
      distinct: ['userId']
    })

    const [pendingChooseLevelJLPT, pendingChoosePokemon] = await Promise.all([
      // Count users with levelJLPT = null
      this.prismaService.user.count({
        where: {
          deletedAt: null,
          role: { name: RoleName.Learner },
          levelJLPT: null
        }
      }),
      // Count users without any UserPokemon
      this.prismaService.user.count({
        where: {
          deletedAt: null,
          role: { name: RoleName.Learner },
          levelId: null
        }
      })
    ])

    const pendingTest = pendingTestUsers.length
    const testAgain = testAgainUsers.length

    // Calculate percentages (avoid division by zero)
    const calculatePercent = (count: number, total: number): number => {
      return total > 0 ? Math.round((count / total) * 100 * 100) / 100 : 0
    }

    return {
      summary: {
        total: totalUsers
      },
      pending_test: {
        count: pendingTest,
        percent: calculatePercent(pendingTest, totalUsers)
      },
      test_again: {
        count: testAgain,
        percent: calculatePercent(testAgain, totalUsers)
      },
      pending_choose_level_jlpt: {
        count: pendingChooseLevelJLPT,
        percent: calculatePercent(pendingChooseLevelJLPT, totalUsers)
      },
      pending_choose_pokemon: {
        count: pendingChoosePokemon,
        percent: calculatePercent(pendingChoosePokemon, totalUsers)
      }
    }
  }

  /**
   * Phân bổ trình độ JLPT: N3, N4, N5
   */
  async getJLPTDistribution() {
    const distribution = await this.prismaService.user.groupBy({
      by: ['levelJLPT'],
      where: {
        deletedAt: null,
        role: { name: RoleName.Learner },
        levelJLPT: {
          in: [3, 4, 5]
        }
      },
      _count: true
    })

    const total = await this.prismaService.user.count({
      where: {
        deletedAt: null,
        role: { name: RoleName.Learner },
        levelJLPT: {
          in: [3, 4, 5]
        }
      }
    })

    const result = {
      N3: { total: 0, percent: 0 },
      N4: { total: 0, percent: 0 },
      N5: { total: 0, percent: 0 }
    }

    for (const item of distribution) {
      const levelKey = `N${item.levelJLPT}`
      if (result[levelKey]) {
        result[levelKey].total = item._count
        result[levelKey].percent =
          total > 0 ? ((item._count / total) * 100).toFixed(2) : 0
      }
    }

    return {
      summary: result,
      totalUsers: total
    }
  }

  /**
   * Tỷ lệ Duy trì Streak - xem qua attendance
   * Tính streak liên tiếp từ hôm nay trở về trước (dựa trên Attendance.date)
   */
  async getStreakRetention() {
    const today = todayUTCWith0000()
    const windowStart = new Date(today)
    windowStart.setDate(windowStart.getDate() - 60) // enough lookback to cover long streaks

    const [attendances, totalUsers] = await Promise.all([
      this.prismaService.attendance.findMany({
        where: {
          deletedAt: null,
          date: {
            gte: windowStart,
            lte: today
          },
          user: {
            role: { name: RoleName.Learner },
            deletedAt: null
          }
        },
        select: {
          userId: true,
          date: true
        },
        orderBy: [{ userId: 'asc' }, { date: 'desc' }]
      }),
      this.prismaService.user.count({
        where: {
          deletedAt: null,
          role: { name: RoleName.Learner }
        }
      })
    ])

    // Normalize to midnight UTC for consistent day comparisons
    const normalize = (value: Date) => {
      const normalized = new Date(value)
      normalized.setUTCHours(0, 0, 0, 0)
      return normalized
    }

    const sameDay = (a: Date, b: Date) => a.getTime() === b.getTime()

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const streakByUser = new Map<number, number>()
    let currentUser: number | null = null
    let currentStreak = 0
    let expectedDate: Date | null = null
    let skipUser = false // once a gap is found, streak from today ends

    for (const attendance of attendances) {
      const attendanceDate = normalize(attendance.date)

      if (attendance.userId !== currentUser) {
        if (currentUser !== null) {
          streakByUser.set(currentUser, currentStreak)
        }
        currentUser = attendance.userId
        currentStreak = 0
        expectedDate = null
        skipUser = false
      }

      if (skipUser) continue

      if (!expectedDate) {
        // Cho phép streak nếu attendance mới nhất là hôm nay hoặc hôm qua
        if (!sameDay(attendanceDate, today) && !sameDay(attendanceDate, yesterday)) {
          skipUser = true
          continue
        }
        currentStreak = 1
        expectedDate = new Date(attendanceDate)
        expectedDate.setDate(expectedDate.getDate() - 1)
        continue
      }

      if (sameDay(attendanceDate, expectedDate)) {
        currentStreak++
        expectedDate.setDate(expectedDate.getDate() - 1)
      } else if (attendanceDate.getTime() < expectedDate.getTime()) {
        skipUser = true
      }
    }

    if (currentUser !== null) {
      streakByUser.set(currentUser, currentStreak)
    }

    const streakValues = Array.from(streakByUser.values())
    const dailyStreakCount = streakValues.filter((value) => value >= 1).length
    const monthlyStreakCount = streakValues.filter((value) => value >= 7).length

    const calculatePercent = (count: number, total: number): number => {
      return total > 0 ? Math.round((count / total) * 100 * 100) / 100 : 0
    }

    return {
      daily_streak: {
        count: dailyStreakCount,
        percent: calculatePercent(dailyStreakCount, totalUsers)
      },
      monthly_streak: {
        count: monthlyStreakCount,
        percent: calculatePercent(monthlyStreakCount, totalUsers)
      },
      totalUsers
    }
  }

  /**
   * Helper: Tính streak cho tất cả Learner users (reused by getStreakRetention & leaderboard stats)
   * Trả về Map<userId, streakCount>
   */
  async calculateUserStreaks(): Promise<Map<number, number>> {
    const today = todayUTCWith0000()
    const windowStart = new Date(today)
    windowStart.setDate(windowStart.getDate() - 60)

    const attendances = await this.prismaService.attendance.findMany({
      where: {
        deletedAt: null,
        date: {
          gte: windowStart,
          lte: today
        },
        user: {
          role: { name: RoleName.Learner },
          deletedAt: null
        }
      },
      select: {
        userId: true,
        date: true
      },
      orderBy: [{ userId: 'asc' }, { date: 'desc' }]
    })

    const normalize = (value: Date) => {
      const normalized = new Date(value)
      normalized.setUTCHours(0, 0, 0, 0)
      return normalized
    }

    const sameDay = (a: Date, b: Date) => a.getTime() === b.getTime()

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const streakByUser = new Map<number, number>()
    let currentUser: number | null = null
    let currentStreak = 0
    let expectedDate: Date | null = null
    let skipUser = false

    for (const attendance of attendances) {
      const attendanceDate = normalize(attendance.date)

      if (attendance.userId !== currentUser) {
        if (currentUser !== null) {
          streakByUser.set(currentUser, currentStreak)
        }
        currentUser = attendance.userId
        currentStreak = 0
        expectedDate = null
        skipUser = false
      }

      if (skipUser) continue

      if (!expectedDate) {
        if (!sameDay(attendanceDate, today) && !sameDay(attendanceDate, yesterday)) {
          skipUser = true
          continue
        }
        currentStreak = 1
        expectedDate = new Date(attendanceDate)
        expectedDate.setDate(expectedDate.getDate() - 1)
        continue
      }

      if (sameDay(attendanceDate, expectedDate)) {
        currentStreak++
        expectedDate.setDate(expectedDate.getDate() - 1)
      } else if (attendanceDate.getTime() < expectedDate.getTime()) {
        skipUser = true
      }
    }

    if (currentUser !== null) {
      streakByUser.set(currentUser, currentStreak)
    }

    return streakByUser
  }

  /**
   * Phân phối Pokémon Khởi đầu - tỉ lệ user chọn các pokemon khởi đầu
   */
  async getStarterPokemonDistribution() {
    // Get starter pokemons (isStarted = true)
    const starterDistribution = await this.prismaService.userPokemon.groupBy({
      by: ['pokemonId'],
      where: {
        deletedAt: null,
        pokemon: {
          isStarted: true
        }
      },
      _count: true
    })

    // Get details of each starter pokemon
    const starterDetails = await this.prismaService.pokemon.findMany({
      where: {
        isStarted: true
      },
      select: {
        id: true,
        nameJp: true,
        imageUrl: true,
        nameTranslations: true
      }
    })

    const totalStarters = await this.prismaService.userPokemon.count({
      where: {
        deletedAt: null,
        pokemon: {
          isStarted: true
        }
      }
    })

    // Map with details
    const result = starterDetails.map((starter) => {
      const count =
        starterDistribution.find((d) => d.pokemonId === starter.id)?._count || 0
      const percent =
        totalStarters > 0 ? Math.round((count / totalStarters) * 100 * 100) / 100 : 0

      return {
        pokemonId: starter.id,
        nameJp: starter.nameJp,
        nameTranslations: starter.nameTranslations,
        imageUrl: starter.imageUrl,
        count,
        percent
      }
    })

    return {
      starters: result,
      totalCount: totalStarters
    }
  }

  /**
   * Hoạt động Battle - trả ra các mùa (EXPIRED, ACTIVE)
   * ACTIVE: dùng eloscore của user hiện tại
   * EXPIRED: dùng userSeasonHistory
   */
  async getBattleActivity(lang: string = 'vi') {
    // Get all seasons (both ACTIVE and EXPIRED)
    const seasons = await this.prismaService.leaderboardSeason.findMany({
      where: {
        deletedAt: null
      },
      include: {
        nameTranslations: {
          select: {
            value: true,
            language: {
              select: {
                code: true
              }
            }
          }
        }
      },
      orderBy: {
        startDate: 'desc'
      }
    })

    const seasonData = await Promise.all(
      seasons.map(async (season) => {
        // Get nameTranslation
        const nameTranslation =
          season.nameTranslations.find((t) => t.language.code === lang)?.value ||
          season.nameKey

        // Get unique user IDs in this season's matches via participants
        const participants = await this.prismaService.matchParticipant.findMany({
          where: {
            match: {
              leaderboardSeasonId: season.id
            }
          },
          select: {
            userId: true
          },
          distinct: ['userId']
        })

        const userIdsInMatches = new Set(participants.map((p) => p.userId))
        const totalUsersJoined = userIdsInMatches.size

        // Total learner users
        const totalUsers = await this.prismaService.user.count({
          where: {
            deletedAt: null,
            role: { name: RoleName.Learner }
          }
        })

        const totalUsersNotJoined = totalUsers - totalUsersJoined

        // Get JLPT distribution for users in this season
        let levelDistribution: any = {}

        if (season.status === 'ACTIVE') {
          // For ACTIVE seasons: use current user eloscore
          const userElos = await this.prismaService.user.findMany({
            where: {
              id: { in: Array.from(userIdsInMatches) },
              deletedAt: null
            },
            select: {
              id: true,
              eloscore: true
            }
          })

          // Map eloscore to JLPT level (N5 < N4 < N3)
          const eloToLevel = (elo: number) => {
            if (elo >= 2000) return 'N3'
            if (elo >= 1000) return 'N4'
            return 'N5'
          }

          levelDistribution = {
            N3: { total: 0, percent: 0 },
            N4: { total: 0, percent: 0 },
            N5: { total: 0, percent: 0 }
          }

          userElos.forEach((user) => {
            const level = eloToLevel(user.eloscore || 0)
            levelDistribution[level].total += 1
          })

          // Calculate percentages
          Object.keys(levelDistribution).forEach((level) => {
            levelDistribution[level].percent =
              totalUsersJoined > 0
                ? Math.round(
                    (levelDistribution[level].total / totalUsersJoined) * 100 * 100
                  ) / 100
                : 0
          })
        } else {
          // For EXPIRED seasons: use userSeasonHistory
          const historyByLevel = await this.prismaService.userSeasonHistory.groupBy({
            by: ['finalRank'],
            where: {
              seasonId: season.id,
              deletedAt: null
            },
            _count: true
          })

          levelDistribution = {
            N3: { total: 0, percent: 0 },
            N4: { total: 0, percent: 0 },
            N5: { total: 0, percent: 0 }
          }

          historyByLevel.forEach((item) => {
            const level = item.finalRank || 'N5'
            if (levelDistribution[level]) {
              levelDistribution[level].total = item._count
            }
          })

          // Calculate percentages
          Object.keys(levelDistribution).forEach((level) => {
            levelDistribution[level].percent =
              totalUsersJoined > 0
                ? Math.round(
                    (levelDistribution[level].total / totalUsersJoined) * 100 * 100
                  ) / 100
                : 0
          })
        }

        return {
          seasonId: season.id,
          nameKey: season.nameKey,
          nameTranslation,
          status: season.status,
          startDate: season.startDate,
          endDate: season.endDate,
          totalUsersJoined,
          totalUsersNotJoined,
          totalUsersInSystem: totalUsers,
          levelDistribution
        }
      })
    )

    return {
      seasons: seasonData
    }
  }

  /**
   * Mức độ tích lũy sparkles của user
   */
  async getSparklesAccumulation() {
    // Get users with their sparkles balance
    const users = await this.prismaService.user.findMany({
      where: {
        deletedAt: null,
        role: { name: RoleName.Learner }
      },
      select: {
        id: true,
        Wallet: {
          where: {
            type: 'SPARKLES'
          },
          select: {
            balance: true
          }
        }
      }
    })

    // Define sparkles ranges
    const ranges = [
      { min: 0, max: 100, label: '0-100' },
      { min: 101, max: 500, label: '101-500' },
      { min: 501, max: 1000, label: '501-1000' },
      { min: 1001, max: 5000, label: '1001-5000' },
      { min: 5001, max: Infinity, label: '5000+' }
    ]

    const distribution: any = {}
    ranges.forEach((range) => {
      distribution[range.label] = { count: 0, percent: 0 }
    })

    // Categorize users by sparkles
    users.forEach((user) => {
      const sparklesBalance = user.Wallet[0]?.balance || 0
      const range = ranges.find(
        (r) => sparklesBalance >= r.min && sparklesBalance <= r.max
      )
      if (range) {
        distribution[range.label].count += 1
      }
    })

    const totalUsers = users.length

    // Calculate percentages
    Object.keys(distribution).forEach((label) => {
      distribution[label].percent =
        totalUsers > 0
          ? Math.round((distribution[label].count / totalUsers) * 100 * 100) / 100
          : 0
    })

    return {
      distribution,
      totalUsers,
      averageSparkles: Math.round(
        users.reduce((sum, u) => sum + (u.Wallet[0]?.balance || 0), 0) / totalUsers
      )
    }
  }

  /**
   * Nội dung Phổ biến nhất - phần học nào được học nhiều nhất
   */
  async getPopularContent(lang: string = 'vi') {
    // Get all lessons
    const lessons = await this.prismaService.lesson.findMany({
      where: {}
    })

    // Get language ID for the requested language
    const language = await this.prismaService.languages.findFirst({
      where: {
        code: lang
      },
      select: {
        id: true
      }
    })

    const languageId = language?.id || 1 // Default to first language if not found

    // Get user progress counts for each lesson
    const lessonStats = await Promise.all(
      lessons.map(async (lesson) => {
        const completedCount = await this.prismaService.userProgress.count({
          where: {
            lessonId: lesson.id,
            status: 'COMPLETED'
          }
        })

        // Get translated title from Translation table using titleKey
        const translation = await this.prismaService.translation.findFirst({
          where: {
            key: lesson.titleKey,
            languageId: languageId
          },
          select: {
            value: true
          }
        })

        const titleTranslation = translation?.value || lesson.titleJp || lesson.titleKey

        return {
          lessonId: lesson.id,
          titleKey: lesson.titleKey,
          titleJp: lesson.titleJp,
          titleTranslation,
          completedCount
        }
      })
    )

    // Sort by most completed
    const sorted = lessonStats
      .sort((a, b) => b.completedCount - a.completedCount)
      .slice(0, 20) // Top 20

    const totalLessons = lessons.length
    const totalCompletions = lessonStats.reduce((sum, l) => sum + l.completedCount, 0)

    return {
      topContent: sorted,
      stats: {
        totalLessons,
        totalCompletions,
        averageCompletionPerLesson: Math.round(totalCompletions / totalLessons || 0)
      }
    }
  }

  /**
   * Tỷ lệ Hoàn thành Bài học (Completion Rate)
   */
  async getLessonCompletionRate(lang: string = 'vi') {
    // Get all lessons
    const lessons = await this.prismaService.lesson.findMany({
      where: {}
    })

    // Get language ID for the requested language
    const language = await this.prismaService.languages.findFirst({
      where: {
        code: lang
      },
      select: {
        id: true
      }
    })

    const languageId = language?.id || 1

    // Calculate completion rate for each lesson
    const lessonCompletionData = await Promise.all(
      lessons.map(async (lesson) => {
        // Count users who started this lesson
        const totalAttempts = await this.prismaService.userProgress.count({
          where: {
            lessonId: lesson.id
          }
        })

        // Count users who completed this lesson
        const completedCount = await this.prismaService.userProgress.count({
          where: {
            lessonId: lesson.id,
            status: 'COMPLETED'
          }
        })

        // Get translated title
        const translation = await this.prismaService.translation.findFirst({
          where: {
            key: lesson.titleKey,
            languageId: languageId
          },
          select: {
            value: true
          }
        })

        const titleTranslation = translation?.value || lesson.titleJp || lesson.titleKey
        const completionRate =
          totalAttempts > 0 ? (completedCount / totalAttempts) * 100 : 0

        return {
          lessonId: lesson.id,
          titleKey: lesson.titleKey,
          titleJp: lesson.titleJp,
          titleTranslation,
          totalAttempts,
          completedCount,
          completionRate: Math.round(completionRate * 100) / 100 // Round to 2 decimals
        }
      })
    )

    // Sort by highest completion rate
    const sorted = lessonCompletionData.sort(
      (a, b) => b.completionRate - a.completionRate
    )

    // Calculate overall statistics
    const totalAttempts = lessonCompletionData.reduce(
      (sum, l) => sum + l.totalAttempts,
      0
    )
    const totalCompleted = lessonCompletionData.reduce(
      (sum, l) => sum + l.completedCount,
      0
    )
    const overallCompletionRate =
      totalAttempts > 0
        ? Math.round((totalCompleted / totalAttempts) * 100 * 100) / 100
        : 0

    return {
      lessonCompletionRates: sorted,
      stats: {
        totalLessons: lessons.length,
        totalAttempts,
        totalCompleted,
        overallCompletionRate,
        averageCompletionRatePerLesson:
          Math.round(
            (lessonCompletionData.reduce((sum, l) => sum + l.completionRate, 0) /
              lessons.length) *
              100
          ) / 100
      }
    }
  }

  /**
   * Gacha Stats - Tổng quan
   * - Tổng gacha ACTIVE | EXPIRED
   * - Tổng lượt quay (GachaPurchase)
   * - Tỉ lệ ra các sao 1-5 (từ GachaRollHistory, gộp tất cả banner)
   * - List các gacha với pagination
   */
  async getGachaStatsOverview(
    lang: string = 'vi',
    page: number = 1,
    pageSize: number = 10
  ) {
    // Đếm banner theo trạng thái
    const [totalActive, totalExpired, totalPreview] = await Promise.all([
      this.prismaService.gachaBanner.count({
        where: { status: 'ACTIVE', deletedAt: null }
      }),
      this.prismaService.gachaBanner.count({
        where: { status: 'EXPIRED', deletedAt: null }
      }),
      this.prismaService.gachaBanner.count({
        where: { status: 'PREVIEW', deletedAt: null }
      })
    ])

    const totalBanners = totalActive + totalExpired + totalPreview

    // Tỉ lệ ra các sao 1-5 (gộp tất cả banner) từ GachaRollHistory
    const rollsByRarity = await this.prismaService.gachaRollHistory.groupBy({
      by: ['rarity'],
      where: { deletedAt: null },
      _count: true
    })

    const totalRolls = rollsByRarity.reduce((sum, r) => sum + r._count, 0)
    const starDistribution = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'].map((star) => {
      const found = rollsByRarity.find((r) => String(r.rarity) === star)
      const count = found?._count || 0
      return {
        star,
        count,
        percentage:
          totalRolls > 0 ? Math.round((count / totalRolls) * 100 * 100) / 100 : 0
      }
    })

    const fiveStarStats =
      starDistribution.find((s) => s.star === 'FIVE') ||
      ({ count: 0, percentage: 0 } as {
        count: number
        percentage: number
      })

    return {
      summary: {
        totalBanners,
        totalActive,
        totalExpired,
        totalPreview,
        totalRolls,
        totalFiveStar: fiveStarStats.count,
        fiveStarRate: fiveStarStats.percentage,
        starDistribution
      }
    }
  }

  /**
   * Gacha Stats - Chi tiết 1 banner
   * - Info banner
   * - Có item gì (GachaItem): tên banner, tên pokemon, sao
   * - Tổng lượt gacha cho banner
   * - Tỉ lệ ra các sao 1-5 cho banner
   */
  async getGachaStatsDetail(gachaBannerId: number, lang: string = 'vi') {
    const banner = await this.prismaService.gachaBanner.findUnique({
      where: { id: gachaBannerId, deletedAt: null },
      include: {
        nameTranslations: {
          include: { language: { select: { code: true } } }
        },
        items: {
          where: { deletedAt: null },
          include: {
            pokemon: {
              select: {
                id: true,
                nameJp: true,
                nameTranslations: true,
                rarity: true
              }
            },
            gachaItemRate: {
              select: {
                starType: true,
                rate: true
              }
            }
          }
        },
        purchases: {
          where: { deletedAt: null },
          select: { id: true }
        },
        rollLogs: {
          where: { deletedAt: null },
          select: { rarity: true }
        }
      }
    })

    if (!banner) {
      throw new NotFoundException()
    }

    // Format nameTranslations
    const nameTranslations = ['en', 'ja', 'vi']
      .map((code) => {
        const trans = banner.nameTranslations.find((t) => t.language.code === code)
        return trans ? { key: code, value: trans.value } : null
      })
      .filter((t) => t !== null)

    const nameTranslation =
      banner.nameTranslations.find((t) => t.language.code === lang)?.value || ''

    // Tổng lượt gacha cho banner
    const totalPurchases = banner.purchases.length

    // Tỉ lệ ra các sao từ GachaRollHistory
    const rollsByRarity = banner.rollLogs.reduce(
      (acc, roll) => {
        acc[String(roll.rarity)] = (acc[String(roll.rarity)] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const totalRolls = banner.rollLogs.length
    const starDistribution = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'].map((star) => {
      const count = rollsByRarity[star] || 0
      return {
        star,
        count,
        percentage:
          totalRolls > 0 ? Math.round((count / totalRolls) * 100 * 100) / 100 : 0
      }
    })

    // Format items
    const items = banner.items.map((item) => {
      const nameTranslationsObj =
        typeof item.pokemon.nameTranslations === 'string'
          ? JSON.parse(item.pokemon.nameTranslations)
          : item.pokemon.nameTranslations
      const pokemonName = nameTranslationsObj[lang] || item.pokemon.nameJp || ''

      return {
        pokemonId: item.pokemon.id,
        pokemonName,
        rarity: item.pokemon.rarity,
        starType: item.gachaItemRate.starType,
        rate: item.gachaItemRate.rate
      }
    })

    return {
      id: banner.id,
      nameKey: banner.nameKey,
      nameTranslation,
      nameTranslations,
      status: banner.status,
      startDate: banner.startDate,
      endDate: banner.endDate,
      hardPity5Star: banner.hardPity5Star,
      costRoll: banner.costRoll,
      totalPurchases,
      totalRolls,
      starDistribution,
      items
    }
  }
}
