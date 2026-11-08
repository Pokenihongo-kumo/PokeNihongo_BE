import { PaginationQueryType } from '@/shared/models/request.model'
import { HttpStatus, Injectable } from '@nestjs/common'

import { dailyRequestType } from '@/common/constants/achievement.constant'
import {
  walletPurposeType,
  WalletTransactionSourceType,
  WalletTransactionType
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
import { I18nService } from '@/i18n/i18n.service'
import {
  AttendanceMessage,
  ENTITY_MESSAGE,
  NotificationMessage
} from '@/i18n/message-keys'
import { SharedUserRepository } from '@/shared/repositories/shared-user.repo'
import { SharedNotificationService } from '@/shared/services/shared-notification.service'
import { SharedUserSubscriptionService } from '@/shared/services/user-subscription.service'
import { AttendenceConfigRepo } from '../attendence-config/attendence-config.repo'
import { LanguagesRepo } from '../languages/languages.repo'
import { WalletTransactionRepo } from '../wallet-transaction/wallet-transaction.repo'
import { WalletRepo } from '../wallet/wallet.repo'
import { AttendanceRepo } from './attendence.repo'
import { AttendancegAlreadyExistsException } from './dto/attendance.error'
import {
  AttendanceType,
  CreateAttendanceBodyType,
  UpdateAttendanceBodyType
} from './entities/attendance.entity'
type AttendanceWithDayOfWeekType = AttendanceType & { dayOfWeek: WeekDayType }
@Injectable()
export class AttendanceService {
  constructor(
    private attendanceRepo: AttendanceRepo,
    private attendanceConfigRepo: AttendenceConfigRepo,
    private shareUserRepo: SharedUserRepository,
    private readonly i18nService: I18nService,
    private readonly languageRepo: LanguagesRepo,
    private readonly userDailyRequestService: UserDailyRequestService,
    private readonly walletRepo: WalletRepo,
    private readonly walletTransactionRepo: WalletTransactionRepo,
    private readonly userSubService: SharedUserSubscriptionService,
    private readonly sharedNotificationService: SharedNotificationService
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    await this.getLand(lang)
    const data = await this.attendanceRepo.list(pagination)
    return {
      statusCode: HttpStatus.OK,
      data,
      message: this.i18nService.translate(AttendanceMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    await this.getLand(lang)
    const attendance = await this.attendanceRepo.findById(id)
    if (!attendance) {
      throw new NotFoundRecordException()
    }
    return {
      statusCode: HttpStatus.OK,
      data: attendance,
      message: this.i18nService.translate(AttendanceMessage.GET_SUCCESS, lang)
    }
  }

  async findByUser(userId: number, date: Date = new Date()) {
    console.log(date)

    const attendances = await this.findStreakDate(userId, date, true)
    const userInfo = await this.shareUserRepo.findUnique({ id: userId })
    if (!userInfo) {
      throw new NotFoundRecordException()
    }
    const data = {
      user: userInfo,
      attendances: attendances.attendances,
      count: attendances.count
    }
    return {
      statusCode: HttpStatus.OK,
      data,
      message: ENTITY_MESSAGE.GET_SUCCESS
    }
  }

  // New: return attendance records of the week containing the given date (Mon-Sun)
  async findByUserWeek(
    userId: number,
    date: Date = todayUTCWith0000(),
    lang: string = 'vi'
  ) {
    const [, weekly, totalStreak, userInfo] = await Promise.all([
      this.getLand(lang),
      this.findWeekAttendances(userId, date, true),
      this.findMaxStreakFromToday(userId),
      this.shareUserRepo.findUnique({ id: userId })
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
    return {
      statusCode: HttpStatus.OK,
      data,
      message: this.i18nService.translate(AttendanceMessage.GET_SUCCESS, lang)
    }
  }

  async create({ createdById }: { createdById: number }, lang: string = 'vi') {
    try {
      const date = todayUTCWith0000()
      console.log(date)

      const getWeekDate = getWeekDay(date)
      // lay list config theo ngay trong tuan kem check xem co ngon ngu ko
      const [attendenceConfig] = await Promise.all([
        this.attendanceConfigRepo.findByDateOfWeek(getWeekDate),
        this.getLand(lang)
      ])

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

      const data: CreateAttendanceBodyType = {
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

      const [attendance, , , wallet] = await Promise.all([
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

        // Cộng coin vào ví SPARKLES
        this.walletRepo.addBalanceToWalletWithType({
          userId: createdById,
          type: walletType.SPARKLES,
          amount: totalCoin * valueIncrease
        })
      ])

      // Lưu lịch sử wallet transaction
      if (wallet) {
        await this.walletTransactionRepo.create({
          createdById,
          data: {
            walletId: wallet.id,
            userId: createdById,
            purpose: walletPurposeType.DAILY_REQUEST,
            referenceId: null,
            amount: totalCoin * valueIncrease,
            type: WalletTransactionType.INCREASE,
            source: WalletTransactionSourceType.DAILY_CHECKIN,
            description: `Daily attendance reward: ${data.coin} base + ${data.bonusCoin} bonus`
          }
        })
      }

      // Tạo notification cho attendance
      await this.sharedNotificationService.create(
        {
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
        },
        lang
      )

      return {
        statusCode: HttpStatus.CREATED,
        data: attendance,
        message: this.i18nService.translate(AttendanceMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new AttendancegAlreadyExistsException()
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
      data: UpdateAttendanceBodyType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    try {
      await this.getLand(lang)
      const updatedAttendanceg = await this.attendanceRepo.update({
        id,
        updatedById,
        data
      })
      return {
        statusCode: HttpStatus.OK,
        data: updatedAttendanceg,
        message: this.i18nService.translate(AttendanceMessage.UPDATE_SUCCESS, lang)
      }
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

  async delete(
    { id, deletedById }: { id: number; deletedById: number },
    lang: string = 'vi'
  ) {
    try {
      await this.getLand(lang)
      await this.attendanceRepo.delete({
        id,
        deletedById
      })
      return {
        statusCode: HttpStatus.OK,
        data: null,
        message: this.i18nService.translate(AttendanceMessage.DELETE_SUCCESS, lang)
      }
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
    let expectedDate = new Date(today)
    expectedDate.setDate(expectedDate.getDate() - 1) // Bắt đầu từ hôm qua

    const streakAttendances: AttendanceType[] = []

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
    let expectedDate = new Date(today)
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

  async getLand(lang: string) {
    const langId = await this.languageRepo.getIdByCode(lang)
    if (!langId) {
      throw new NotFoundRecordException()
    }
    return langId
  }
}
