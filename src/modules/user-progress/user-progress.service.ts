import {
  CreateUserProgressBodyType,
  GetUserProgressByIdParamsType,
  GetUserProgressListQueryType,
  UpdateUserProgressBodyType
} from '@/modules/user-progress/entities/user-progress.entities'
import {
  InvalidUserProgressDataException,
  UserProgressNotFoundException,
  USER_PROGRESS_MESSAGE
} from '@/modules/user-progress/dto/user-progress.error'
import { UserProgressRepository } from '@/modules/user-progress/user-progress.repo'
import { isNotFoundPrismaError } from '@/shared/helpers'
import { Injectable, Logger, HttpException } from '@nestjs/common'
import { ProgressStatus } from '@prisma/client'

@Injectable()
export class UserProgressService {
  private readonly logger = new Logger(UserProgressService.name)

  constructor(private readonly userProgressRepository: UserProgressRepository) {}

  async create(body: CreateUserProgressBodyType) {
    try {
      // Kiểm tra xem đã tồn tại progress cho user và lesson này chưa
      const existingProgress = await this.userProgressRepository.findByUserAndLesson(
        body.userId,
        body.lessonId
      )
      if (existingProgress) {
        throw InvalidUserProgressDataException
      }

      const userProgress = await this.userProgressRepository.create(body)

      return {
        data: userProgress,
        message: USER_PROGRESS_MESSAGE.CREATE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error creating user progress:', error)
      if (
        error instanceof HttpException ||
        error.message?.includes('đã tồn tại') ||
        error.message?.includes('không tồn tại')
      ) {
        throw error
      }
      throw InvalidUserProgressDataException
    }
  }

  async findAll(query: GetUserProgressListQueryType) {
    const {
      currentPage,
      pageSize,
      userId,
      lessonId,
      lessonCategoryId,
      status,
      progressPercentage
    } = query

    const result = await this.userProgressRepository.findMany({
      currentPage,
      pageSize,
      userId,
      lessonId,
      lessonCategoryId,
      status,
      progressPercentage
    })

    return {
      statusCode: 200,
      message: USER_PROGRESS_MESSAGE.GET_LIST_SUCCESS,
      data: {
        results: result.items,
        pagination: {
          current: result.page,
          pageSize: result.limit,
          totalPage: Math.ceil(result.total / result.limit),
          totalItem: result.total
        }
      }
    }
  }

  //KUMO
  async getMy(userId: number, query: GetUserProgressListQueryType) {
    const {
      currentPage,
      pageSize,
      lessonId,
      lessonCategoryId,
      status,
      progressPercentage
    } = query

    const result = await this.userProgressRepository.findMany({
      currentPage,
      pageSize,
      userId, // Tự động filter theo userId của user hiện tại
      lessonId,
      lessonCategoryId,
      status,
      progressPercentage
    })

    return {
      statusCode: 200,
      message: 'Lấy tiến độ học tập của tôi thành công',
      data: {
        results: result.items,
        pagination: {
          current: result.page,
          pageSize: result.limit,
          totalPage: Math.ceil(result.total / result.limit),
          totalItem: result.total
        }
      }
    }
  }

  async findOne(params: GetUserProgressByIdParamsType) {
    const userProgress = await this.userProgressRepository.findUnique({
      id: params.id
    })

    if (!userProgress) {
      throw UserProgressNotFoundException
    }

    return {
      data: userProgress,
      message: USER_PROGRESS_MESSAGE.GET_SUCCESS
    }
  }

  async findByUserAndLesson(userId: number, lessonId: number) {
    const userProgress = await this.userProgressRepository.findByUserAndLesson(
      userId,
      lessonId
    )

    if (!userProgress) {
      throw UserProgressNotFoundException
    }

    return {
      data: userProgress,
      message: USER_PROGRESS_MESSAGE.GET_SUCCESS
    }
  }

  async update(id: number, body: UpdateUserProgressBodyType) {
    try {
      // Validate progress percentage
      if (body.progressPercentage !== undefined) {
        if (body.progressPercentage < 0 || body.progressPercentage > 100) {
          throw InvalidUserProgressDataException
        }
      }

      const userProgress = await this.userProgressRepository.update({ id }, body)

      return {
        data: userProgress,
        message: USER_PROGRESS_MESSAGE.UPDATE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error updating user progress:', error)
      if (
        error instanceof HttpException ||
        error.message?.includes('không tồn tại') ||
        error.message?.includes('đã tồn tại')
      ) {
        throw error
      }
      throw InvalidUserProgressDataException
    }
  }

  async updateByUserAndLesson(
    userId: number,
    lessonId: number,
    body: UpdateUserProgressBodyType
  ) {
    try {
      // Validate progress percentage
      if (body.progressPercentage !== undefined) {
        if (body.progressPercentage < 0 || body.progressPercentage > 100) {
          throw InvalidUserProgressDataException
        }
      }

      const userProgress = await this.userProgressRepository.updateByUserAndLesson(
        userId,
        lessonId,
        body
      )

      return {
        data: userProgress,
        message: USER_PROGRESS_MESSAGE.UPDATE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error updating user progress by user and lesson:', error)
      if (
        error instanceof HttpException ||
        error.message?.includes('không tồn tại') ||
        error.message?.includes('đã tồn tại')
      ) {
        throw error
      }
      throw InvalidUserProgressDataException
    }
  }

  async remove(id: number) {
    try {
      const userProgress = await this.userProgressRepository.delete({ id })

      return {
        data: userProgress,
        message: USER_PROGRESS_MESSAGE.DELETE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error deleting user progress:', error)
      if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
        throw error
      }
      throw InvalidUserProgressDataException
    }
  }

  async startLesson(userId: number, lessonId: number) {
    try {
      const data = {
        userId,
        lessonId,
        status: 'IN_PROGRESS',
        progressPercentage: 0
      }

      const userProgress = await this.userProgressRepository.upsert(
        userId,
        lessonId,
        data
      )

      return {
        data: userProgress,
        message: 'Bắt đầu bài học thành công'
      }
    } catch (error) {
      this.logger.error('Error starting lesson:', error)
      throw InvalidUserProgressDataException
    }
  }

  async completeLesson(userId: number, lessonId: number, score?: number) {
    try {
      const data = {
        status: 'COMPLETED',
        progressPercentage: 100
      }

      const userProgress = await this.userProgressRepository.updateByUserAndLesson(
        userId,
        lessonId,
        data
      )

      return {
        data: userProgress,
        message: 'Hoàn thành bài học thành công'
      }
    } catch (error) {
      this.logger.error('Error completing lesson:', error)
      throw InvalidUserProgressDataException
    }
  }

  /**
   * Khởi tạo UserProgress cho tất cả lesson có trong hệ thống
   * @param userId ID của user
   */
  async initUserProgress(userId: number): Promise<void> {
    try {
      this.logger.log(`Initializing user progress for user ${userId}`)

      // Lấy tất cả lesson có trong hệ thống
      const lessons = await this.userProgressRepository.getAllLessons()

      if (lessons.length === 0) {
        this.logger.warn('No lessons found in the system')
        return
      }

      // Tạo UserProgress cho tất cả lesson với status NOT_STARTED
      const userProgressData = lessons.map((lesson) => ({
        userId,
        lessonId: lesson.id,
        status: 'NOT_STARTED' as const,
        progressPercentage: 0,
        testId: lesson.testId ?? null
      }))

      // Sử dụng bulk create để tạo tất cả UserProgress cùng lúc
      await this.userProgressRepository.bulkCreate(userProgressData)

      this.logger.log(
        `Successfully initialized ${userProgressData.length} user progress records for user ${userId}`
      )
    } catch (error) {
      this.logger.error(`Error initializing user progress for user ${userId}:`, error)
      // Không throw error để không ảnh hưởng đến quá trình tạo tài khoản
    }
  }

  /**
   * Admin API: Khởi tạo UserProgress cho tất cả lesson cho user cụ thể
   * @param userId ID của user
   */
  async initUserProgressForAdmin(userId: number) {
    try {
      this.logger.log(`Admin initializing user progress for user ${userId}`)

      // Kiểm tra user có tồn tại không (không cần thiết vì bulkCreate sẽ skip duplicates)

      // Lấy tất cả lesson có trong hệ thống
      const lessons = await this.userProgressRepository.getAllLessons()

      if (lessons.length === 0) {
        return {
          statusCode: 200,
          message: 'Không có lesson nào trong hệ thống',
          data: {
            userId,
            totalLessons: 0,
            createdProgress: 0
          }
        }
      }

      // Tạo UserProgress cho tất cả lesson với status NOT_STARTED
      const userProgressData = lessons.map((lesson) => ({
        userId,
        lessonId: lesson.id,
        status: 'NOT_STARTED' as const,
        progressPercentage: 0,
        testId: lesson.testId ?? null
      }))

      // Sử dụng bulk create để tạo tất cả UserProgress cùng lúc
      await this.userProgressRepository.bulkCreate(userProgressData)

      this.logger.log(
        `Admin successfully initialized ${userProgressData.length} user progress records for user ${userId}`
      )

      return {
        statusCode: 200,
        message: 'Khởi tạo UserProgress thành công',
        data: {
          userId,
          totalLessons: lessons.length,
          createdProgress: userProgressData.length
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in admin initializing user progress for user ${userId}:`,
        error
      )
      throw InvalidUserProgressDataException
    }
  }

  /**
   * Admin API: Khởi tạo UserProgress cho tất cả lesson cho TẤT CẢ user
   */
  async initAllUsersProgress() {
    try {
      this.logger.log('Admin initializing user progress for ALL users')

      // Lấy tất cả user có trong hệ thống
      const users = await this.userProgressRepository.getAllUsers()

      if (users.length === 0) {
        return {
          statusCode: 200,
          message: 'Không có user nào trong hệ thống',
          data: {
            totalUsers: 0,
            totalLessons: 0,
            totalCreatedProgress: 0,
            processedUsers: []
          }
        }
      }

      // Lấy tất cả lesson có trong hệ thống
      const lessons = await this.userProgressRepository.getAllLessons()

      if (lessons.length === 0) {
        return {
          statusCode: 200,
          message: 'Không có lesson nào trong hệ thống',
          data: {
            totalUsers: users.length,
            totalLessons: 0,
            totalCreatedProgress: 0,
            processedUsers: []
          }
        }
      }

      // Tạo UserProgress cho tất cả user và tất cả lesson
      const allUserProgressData: Array<{
        userId: number
        lessonId: number
        status: 'NOT_STARTED'
        progressPercentage: number
        testId: number | null
      }> = []
      const processedUsers: number[] = []

      for (const user of users) {
        for (const lesson of lessons) {
          allUserProgressData.push({
            userId: user.id,
            lessonId: lesson.id,
            status: 'NOT_STARTED' as const,
            progressPercentage: 0,
            testId: lesson.testId ?? null
          })
        }
        processedUsers.push(user.id)
      }

      // Sử dụng bulk create để tạo tất cả UserProgress cùng lúc
      await this.userProgressRepository.bulkCreate(allUserProgressData)

      this.logger.log(
        `Admin successfully initialized ${allUserProgressData.length} user progress records for ${users.length} users`
      )

      return {
        statusCode: 200,
        message: 'Khởi tạo UserProgress cho tất cả user thành công',
        data: {
          totalUsers: users.length,
          totalLessons: lessons.length,
          totalCreatedProgress: allUserProgressData.length,
          processedUsers
        }
      }
    } catch (error) {
      this.logger.error('Error in admin initializing user progress for all users:', error)
      throw InvalidUserProgressDataException
    }
  }

  async updateProgressByLesson(
    userId: number,
    lessonId: number,
    progressPercentage: number,
    status?: ProgressStatus
  ) {
    try {
      this.logger.log(
        `Updating progress for user ${userId}, lesson ${lessonId}: ${progressPercentage}%`
      )

      // Tìm UserProgress record
      const userProgress = await this.userProgressRepository.findByUserAndLesson(
        userId,
        lessonId
      )

      if (!userProgress) {
        this.logger.warn(`UserProgress not found for user ${userId}, lesson ${lessonId}`)
        return
      }

      // Không update status nếu đã là COMPLETED
      if (userProgress.status === ProgressStatus.COMPLETED) {
        this.logger.log(
          `UserProgress for user ${userId}, lesson ${lessonId} is already COMPLETED, skipping status update`
        )
        return
      }

      // Xác định status
      let finalStatus = status ?? ProgressStatus.IN_PROGRESS
      if (progressPercentage === 100) {
        finalStatus = ProgressStatus.TESTING_LAST
      }

      // Cập nhật progress percentage
      await this.userProgressRepository.update(
        { id: userProgress.id },
        {
          progressPercentage: progressPercentage,
          status: finalStatus,
          completedAt: progressPercentage === 100 ? new Date() : null
        }
      )
      this.logger.log(
        `Updated UserProgress for user ${userId}, lesson ${lessonId}: ${progressPercentage}% (${finalStatus})`
      )
    } catch (error) {
      this.logger.error('Error updating progress by lesson:', error)
      throw error
    }
  }

  async getCurrentInProgressLesson(userId: number) {
    try {
      this.logger.log(`Getting current in-progress lesson for user: ${userId}`)

      // Tìm UserProgress có status IN_PROGRESS
      const inProgressLesson =
        await this.userProgressRepository.findInProgressByUser(userId)

      if (inProgressLesson) {
        this.logger.log(
          `Found in-progress lesson ${inProgressLesson.lessonId} for user ${userId}`
        )
        return inProgressLesson
      }

      this.logger.log(`No in-progress lesson found for user ${userId}`)
      return null
    } catch (error) {
      this.logger.error('Error getting current in-progress lesson:', error)
      throw error
    }
  }

  async getUserProgressByLesson(userId: number, lessonId: number) {
    try {
      this.logger.log(`Getting user progress for user: ${userId}, lesson: ${lessonId}`)

      const userProgress = await this.userProgressRepository.findByUserAndLesson(
        userId,
        lessonId
      )

      if (userProgress) {
        this.logger.log(
          `Found user progress for user ${userId}, lesson ${lessonId}: ${userProgress.status}`
        )
        return userProgress
      }

      this.logger.log(`No user progress found for user ${userId}, lesson ${lessonId}`)
      return null
    } catch (error) {
      this.logger.error('Error getting user progress by lesson:', error)
      throw error
    }
  }

  /**
   * Lấy lesson trước đó theo lessonOrder trong cùng category
   */
  async getPreviousLessonId(lessonId: number): Promise<number | null> {
    return this.userProgressRepository.getPreviousLessonId(lessonId)
  }

  async getNextLessonId(lessonId: number): Promise<number | null> {
    return this.userProgressRepository.getNextLessonId(lessonId)
  }

  /**
   * Mở UserProgress theo level JLPT
   * - N5 (5): mở bài đầu tiên của N5 -> IN_PROGRESS
   * - N4 (4): mở TẤT CẢ bài N5 -> IN_PROGRESS và bài đầu tiên N4 -> IN_PROGRESS
   * - Tương tự cho N3 (3), N2 (2), N1 (1)
   * Lưu ý: levelJlpt trong schema là số 1..5 (1=N1, 5=N5)
   */
  async updateUserProgressLevelJlpt(userId: number, levelN: number) {
    this.logger.log(`updateUserProgressLevelJlpt for user ${userId}, level N${levelN}`)

    if (![1, 2, 3, 4, 5].includes(levelN)) {
      throw new Error('Invalid JLPT level. Must be 1..5')
    }

    // 1) Nếu level > 5 hoặc < 1 đã chặn ở trên. Với levelN, cần mở tất cả level lớn hơn (N5..N{levelN+1})
    for (let lv = 5; lv > levelN; lv--) {
      const lessonIds = await this.userProgressRepository.getLessonIdsByLevelJlpt(lv)
      if (lessonIds.length === 0) continue
      this.logger.log(
        `Opening ${lessonIds.length} lessons for level N${lv} to IN_PROGRESS`
      )
      for (const lessonId of lessonIds) {
        await this.userProgressRepository.upsert(userId, lessonId, {
          status: 'IN_PROGRESS',
          progressPercentage: 0
        })
      }
    }

    // 2) Mở bài đầu tiên của levelN
    const firstLessonId =
      await this.userProgressRepository.getFirstLessonIdByLevelJlpt(levelN)
    if (firstLessonId) {
      await this.userProgressRepository.upsert(userId, firstLessonId, {
        status: 'IN_PROGRESS',
        progressPercentage: 0
      })
      this.logger.log(
        `Opened first lesson ${firstLessonId} for level N${levelN} -> IN_PROGRESS`
      )
    } else {
      this.logger.warn(`No published lessons found for level N${levelN}`)
    }
    this.logger.log(
      `updateUserProgressLevelJlpt for user ${userId}, level N${levelN} completed`
    )
  }

  /**
   * Lấy danh sách bài học đã hoàn thành của user
   * Để check các achievement COMPLETE_LESSON đã hoàn thành tiêu chí chưa
   */
  async getCompletedLessonsForAchievements(userId: number) {
    const [totalCompleted, completedLessons] = await Promise.all([
      this.userProgressRepository.countAllCompleted(userId),
      this.userProgressRepository.listCompletedLessons(userId)
    ])
    return {
      totalCompleted,
      completedLessons: completedLessons.map((item: any) => ({
        lessonId: item.lessonId,
        levelJLPT: item.lesson?.levelJlpt ?? null,
        completedAt: item.completedAt ?? item.updatedAt ?? null
      }))
    }
  }
}
