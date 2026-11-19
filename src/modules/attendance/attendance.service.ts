import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { dailyRequestType } from '@/common/constants/achievement.constant'
import {
  walletPurposeType,
  WalletTransactionSourceType
} from '@/common/constants/wallet-transaction.constant'
import { walletType } from '@/common/constants/wallet.constant'
import { NotFoundRecordException } from 'src/shared/error'
import {
  getWeekDay,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError,
  todayUTCWith0000
} from 'src/shared/helpers'
import { UserDailyRequestService } from '../user-daily-request/user-daily-request.service'

import { AttendancesStatus } from '@/common/constants/attendance.constant'
import { WeekDayType } from '@/common/constants/attendence-config.constant'
import { NotificationType } from '@/common/constants/notification.constant'
import { FeatureKey } from '@/common/constants/subscription.constant'
import { NotificationMessage } from '@/i18n/message-keys'
import { AttendenceConfigService } from '@/modules/attendence-config/attendence-config.service'
import { NotificationService } from '@/modules/notification/notification.service'
import { UserSubscriptionService } from '@/modules/user-subscription/user-subscription.service'
import { UserCoreService } from '@/modules/user/user-core.service'
import { WalletService } from '@/modules/wallet/wallet.service'
import { AttendanceRepo } from './attendence.repo'
import { AttendancegAlreadyExistsException } from './dto/attendance.error'
import { CreateAttendanceBody, UpdateAttendanceBody } from './dto/attendance.zod-dto'
import { Attendance } from './entities/attendance.entity'
type AttendanceWithDayOfWeekType = Attendance & { dayOfWeek: WeekDayType }
@Injectable()
export class AttendanceService {
  constructor(
    private attendanceRepo: AttendanceRepo,
    private attendenceConfigService: AttendenceConfigService,
    private userCoreService: UserCoreService,
    private readonly userDailyRequestService: UserDailyRequestService,
    private readonly walletService: WalletService,
    private readonly userSubService: UserSubscriptionService,
    private readonly sharedNotificationService: NotificationService
  ) {}

  async list(pagination: PaginationQuery) {
    const data = await this.attendanceRepo.list(pagination)
    return data
  }

  async findById(id: number) {
    const attendance = await this.attendanceRepo.findById(id)
    if (!attendance) {
      throw new NotFoundRecordException()
    }
    return attendance
  }

  // New: return attendance records of the week containing the given date (Mon-Sun)
  async findByUserWeek(userId: number, date: Date = todayUTCWith0000()) {
    const [weekly, totalStreak, userInfo] = await Promise.all([
      this.findWeekAttendances(userId, date, true),
      this.findMaxStreakFromToday(userId),
      this.userCoreService.findUnique({ id: userId })
    ])

    if (!userInfo) {
      throw new NotFoundRecordException()
    }
    const data = {
      user: userInfo,
      attendances: weekly.attendances,
      count: weekly.count,
      totalStreak
    }
    return data
  }

  async create({ createdById }: { createdById: number }, lang: string = 'vi') {
    try {
      const date = todayUTCWith0000()
      console.log(date)

      const getWeekDate = getWeekDay(date)
      const attendenceConfig =
        await this.attendenceConfigService.findByDateOfWeek(getWeekDate)

      if (!attendenceConfig) {
        throw new NotFoundRecordException()
      }
      //check streat chua ?
      let isStreakSunday = false
      const streakData = await this.findStreakDate(createdById, date)
      // Kiểm tra xem hôm nay có phải là ngày thứ 7, 14, 21,... (bội số của 7) không
      // streakData.count là số ngày streak trước hôm nay
      // Nếu hôm nay là ngày streak thứ 7, 14, 21,... thì streakData.count sẽ là 6, 13, 20,...
      const totalStreakWithToday = streakData.count + 1 // Bao gồm cả hôm nay
      isStreakSunday = totalStreakWithToday % 7 === 0 ? true : false
      console.log('Streak count (before today):', streakData.count)
      console.log('Total streak (with today):', totalStreakWithToday)
      console.log('Is bonus day (7, 14, 21...):', isStreakSunday)

      const data: CreateAttendanceBody = {
        date,
        status: AttendancesStatus.PRESENT,
        coin: attendenceConfig.baseCoin,
        bonusCoin: isStreakSunday ? attendenceConfig.bonusCoin : 0,
        userId: createdById
      }

      const existing = await this.attendanceRepo.findByUserIdAndDate(createdById, date)

      // Nếu có bản ghi cũ đã xóa mềm → xóa hẳn trước khi tạo
      if (existing && existing.deletedAt) {
        await this.attendanceRepo.delete(
          { id: existing.id, deletedById: createdById },
          true
        )
      }

      // Update daily login requests
      const totalCoin = data.coin + data.bonusCoin
      // xem có tăng không
      const valueIncrease =
        await this.userSubService.getValueConvertByfeatureKeyAndUserId(
          FeatureKey.COIN_MULTIPLIER,
          createdById
        )

      const [attendance] = await Promise.all([
        this.attendanceRepo.create({
          createdById,
          data: data
        }),
        this.userDailyRequestService.updateProgress({
          userId: createdById,
          dailyRequestType: dailyRequestType.DAILY_LOGIN,
          progressAdd: 1
        }),
        this.userDailyRequestService.updateProgress({
          userId: createdById,
          dailyRequestType: dailyRequestType.STREAK_LOGIN,
          progressAdd: 1
        }),

        // Cộng coin vào ví SPARKLES + lịch sử wallet transaction (cùng transaction)
        this.walletService.credit(
          {
            userId: createdById,
            type: walletType.SPARKLES,
            amount: totalCoin * valueIncrease,
            createdById,
            purpose: walletPurposeType.DAILY_REQUEST,
            source: WalletTransactionSourceType.DAILY_CHECKIN,
            description: `Daily attendance reward: ${data.coin} base + ${data.bonusCoin} bonus`
          },
          undefined,
          // a user without the wallet gets it with the coins
          { createIfMissing: true }
        )
      ])

      // Tạo notification cho attendance
      await this.sharedNotificationService.create({
        userId: createdById,
        data: {
          userId: createdById,
          titleKey: NotificationMessage.NOTI_ATTENDANCE,
          bodyKey: NotificationMessage.YOU_HAVE_COMPLETED_ATTENDANCE,
          type: NotificationType.ATTENDANCE,
          data: {
            attendanceId: attendance.id,
            sparkle: data.coin,
            sparkleTotal: data.bonusCoin,
            totalCoin: totalCoin * valueIncrease,
            streakCount: totalStreakWithToday
          }
        }
      })

      return attendance
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new AttendancegAlreadyExistsException()
      }
      throw error
    }
  }

  async update({
    id,
    data,
    updatedById
  }: {
    id: number
    data: UpdateAttendanceBody
    updatedById: number
  }) {
    try {
      const updatedAttendanceg = await this.attendanceRepo.update({
        id,
        updatedById,
        data
      })
      return updatedAttendanceg
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new AttendancegAlreadyExistsException()
      }
      throw error
    }
  }

  async delete({ id, deletedById }: { id: number; deletedById: number }) {
    try {
      await this.attendanceRepo.delete({
        id,
        deletedById
      })
      return
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async findStreakDate(userId: number, date: Date, addDayOfWeek: boolean = false) {
    // 1️⃣ Tính streak liên tiếp từ hôm nay trở về trước
    const today = todayUTCWith0000()
    // Lấy tất cả điểm danh của user, sắp xếp theo ngày giảm dần
    const allAttendances = await this.attendanceRepo.findByUserId(userId)

    // Sắp xếp theo ngày giảm dần
    const sortedAttendances = allAttendances
      .filter((att) => {
        const attDate = new Date(att.date)
        attDate.setHours(0, 0, 0, 0)
        return attDate < today // Chỉ lấy các ngày trước hôm nay
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // 2️⃣ Đếm streak liên tiếp
    let streakCount = 0
    const expectedDate = new Date(today)
    expectedDate.setDate(expectedDate.getDate() - 1) // Bắt đầu từ hôm qua

    const streakAttendances: Attendance[] = []

    for (const att of sortedAttendances) {
      const attDate = new Date(att.date)
      attDate.setHours(0, 0, 0, 0)

      if (attDate.getTime() === expectedDate.getTime()) {
        streakCount++
        streakAttendances.push(att)
        // Tiếp tục kiểm tra ngày trước đó
        expectedDate.setDate(expectedDate.getDate() - 1)
      } else if (attDate.getTime() < expectedDate.getTime()) {
        // Có khoảng trống, dừng streak
        break
      }
    }

    // 3️⃣ Thêm dayOfWeek nếu cần
    let attendances: any[] = streakAttendances
    if (addDayOfWeek) {
      const attendancesWithDay: AttendanceWithDayOfWeekType[] = streakAttendances.map(
        (att) => ({
          ...att,
          dayOfWeek: getWeekDay(att.date)
        })
      )
      attendances = attendancesWithDay
    }

    const count = streakCount
    const isFullWeek = count >= 7

    return { count, isFullWeek, attendances }
  }

  // Helper: get all attendances in the week (Mon-Sun) of the given date
  async findWeekAttendances(userId: number, date: Date, addDayOfWeek: boolean = false) {
    // Determine start (Mon) and end (Sun) of the week for the given date
    const startOfWeek = new Date(date)
    // getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
    // To get Monday: subtract (getDay() + 6) % 7 days
    const dayOfWeek = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Adjust for Sunday
    startOfWeek.setDate(diff)
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6) // Sunday
    endOfWeek.setHours(23, 59, 59, 999)

    console.log(
      `[findWeekAttendances] Finding attendances between ${startOfWeek.toISOString()} and ${endOfWeek.toISOString()}`
    )

    let attendances = await this.attendanceRepo.findStreakWithStartEndDay(
      userId,
      startOfWeek,
      endOfWeek
    )

    console.log(
      `[findWeekAttendances] Found ${attendances.length} attendances for user ${userId}`
    )

    if (addDayOfWeek) {
      const attendancesWithDay: AttendanceWithDayOfWeekType[] = attendances.map(
        (att) => ({
          ...att,
          dayOfWeek: getWeekDay(att.date)
        })
      )
      attendances = attendancesWithDay as any
    }

    const count = attendances.length
    const isFullWeek = count >= 7

    return { count, isFullWeek, attendances }
  }

  /**
   * Tính tổng số streak liên tiếp từ hôm nay về trước
   * Bao gồm cả hôm nay nếu đã điểm danh
   */
  async findMaxStreakFromToday(userId: number) {
    const today = todayUTCWith0000()

    // Lấy tất cả điểm danh của user
    const allAttendances = await this.attendanceRepo.findByUserId(userId)

    // Sắp xếp theo ngày giảm dần
    const sortedAttendances = allAttendances
      .filter((att) => {
        const attDate = new Date(att.date)
        attDate.setHours(0, 0, 0, 0)
        return attDate <= today // Lấy các ngày <= hôm nay
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    if (sortedAttendances.length === 0) {
      return 0
    }

    // Đếm streak liên tiếp từ hôm nay
    let streakCount = 0
    const expectedDate = new Date(today)
    expectedDate.setHours(0, 0, 0, 0)

    for (const att of sortedAttendances) {
      const attDate = new Date(att.date)
      attDate.setHours(0, 0, 0, 0)

      if (attDate.getTime() === expectedDate.getTime()) {
        streakCount++
        // Kiểm tra ngày trước đó
        expectedDate.setDate(expectedDate.getDate() - 1)
      } else if (attDate.getTime() < expectedDate.getTime()) {
        // Có khoảng trống, dừng streak
        break
      }
    }

    return streakCount
  }
}
