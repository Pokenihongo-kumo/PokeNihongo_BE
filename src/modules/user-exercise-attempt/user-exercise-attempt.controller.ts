import { I18nService } from '@/i18n/i18n.service'
import { UserExerciseAttemptMessage as M } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import {
  CreateUserExerciseAttemptBodyDTO,
  CreateUserExerciseAttemptParamsDTO,
  GetUserExerciseAttemptByIdParamsDTO,
  GetUserExerciseAttemptListQueryDTO,
  UpdateUserExerciseAttemptBodyDTO,
  UserExerciseAttemptListResDTO,
  UserExerciseAttemptResDTO,
  LatestExerciseAttemptsByLessonResDTO,
  CheckExerciseCompletionBodyDTO,
  UserExerciseAttemptLessonParamsDTO
} from '@/modules/user-exercise-attempt/dto/user-exercise-attempt.zod-dto'
import {
  UserExerciseAttemptResponseSwaggerDTO,
  UserExerciseAttemptListResponseSwaggerDTO,
  GetUserExerciseAttemptListQuerySwaggerDTO,
  CreateUserExerciseAttemptParamsSwaggerDTO,
  UpdateUserExerciseAttemptSwaggerDTO,
  ExerciseCompletionResponseSwaggerDTO,
  LatestExerciseAttemptsByLessonResSwaggerDTO,
  TimeSwaggerDTO
} from '@/modules/user-exercise-attempt/dto/user-exercise-attempt.dto'
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { UserExerciseAttemptService } from './user-exercise-attempt.service'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'

const COMPLETION_MESSAGE = {
  'not-all-answered': M.NOT_ALL_ANSWERED,
  'no-answer': M.SUBMITTED_NO_ANSWER,
  incomplete: M.SUBMITTED_INCOMPLETE,
  'all-correct': M.ALL_CORRECT,
  'some-incorrect': M.SOME_INCORRECT
} as const

@ApiTags('User Exercise Attempt')
@Controller('user-exercise-attempt')
export class UserExerciseAttemptController {
  constructor(
    private readonly userExerciseAttemptService: UserExerciseAttemptService,
    private readonly i18nService: I18nService
  ) {}

  @Post(':exerciseId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo lần thử bài tập mới' })
  @ApiResponse({
    status: 201,
    description: 'Tạo lần thử bài tập thành công',
    type: UserExerciseAttemptResponseSwaggerDTO
  })
  @ZodSerializerDto(UserExerciseAttemptResDTO)
  async create(
    @Param() { exerciseId }: CreateUserExerciseAttemptParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.CREATE_SUCCESS, lang),
      data: await this.userExerciseAttemptService.create(userId, exerciseId)
    }
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách lần thử bài tập với phân trang và lọc' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách lần thử bài tập thành công',
    type: UserExerciseAttemptListResponseSwaggerDTO
  })
  @ApiQuery({ type: GetUserExerciseAttemptListQuerySwaggerDTO })
  @ZodSerializerDto(UserExerciseAttemptListResDTO)
  async findAll(
    @Query() query: GetUserExerciseAttemptListQueryDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang),
      data: await this.userExerciseAttemptService.findAll(query)
    }
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin lần thử bài tập theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin lần thử bài tập thành công',
    type: UserExerciseAttemptResponseSwaggerDTO
  })
  @ZodSerializerDto(UserExerciseAttemptResDTO)
  async findOne(
    @Param() { id }: GetUserExerciseAttemptByIdParamsDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.GET_SUCCESS, lang),
      data: await this.userExerciseAttemptService.findOne(id)
    }
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật lần thử bài tập theo ID' })
  @ApiBody({ type: UpdateUserExerciseAttemptSwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật lần thử bài tập thành công',
    type: UserExerciseAttemptResponseSwaggerDTO
  })
  @ZodSerializerDto(UserExerciseAttemptResDTO)
  async update(
    @Param() { id }: GetUserExerciseAttemptByIdParamsDTO,
    @Body() body: UpdateUserExerciseAttemptBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.UPDATE_SUCCESS, lang),
      data: await this.userExerciseAttemptService.update(id, body, userId)
    }
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa lần thử bài tập theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Xóa lần thử bài tập thành công',
    type: UserExerciseAttemptResponseSwaggerDTO
  })
  @ZodSerializerDto(UserExerciseAttemptResDTO)
  async remove(
    @Param() { id }: GetUserExerciseAttemptByIdParamsDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.DELETE_SUCCESS, lang),
      data: await this.userExerciseAttemptService.remove(id)
    }
  }

  @Put(':id/submit-completion')
  @ApiBearerAuth()
  @ApiBody({ type: TimeSwaggerDTO })
  @ApiOperation({ summary: 'Kiểm tra trạng thái hoàn thành bài tập' })
  @ApiResponse({
    status: 200,
    description: 'Kiểm tra trạng thái hoàn thành thành công',
    type: ExerciseCompletionResponseSwaggerDTO
  })
  async submitCompletion(
    @Param() { id }: GetUserExerciseAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @Body() body: CheckExerciseCompletionBodyDTO,
    @I18nLang() lang: string
  ) {
    const { outcome, data } =
      await this.userExerciseAttemptService.submitExerciseCompletion(
        id,
        userId,
        body.time
      )
    return {
      message: this.i18nService.translate(COMPLETION_MESSAGE[outcome], lang),
      data
    }
  }

  @Get(':id/check-completion')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kiểm tra trạng thái hoàn thành bài tập' })
  @ApiResponse({
    status: 200,
    description: 'Kiểm tra trạng thái hoàn thành thành công',
    type: ExerciseCompletionResponseSwaggerDTO
  })
  async checkCompletion(
    @Param() { id }: GetUserExerciseAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    const { outcome, data } =
      await this.userExerciseAttemptService.checkExerciseCompletion(id, userId)
    return {
      message: this.i18nService.translate(COMPLETION_MESSAGE[outcome], lang),
      data
    }
  }

  @Get(':id/latest')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy trạng thái hoàn thành bài tập gần nhất' })
  @ApiResponse({
    status: 200,
    description: 'Lấy trạng thái hoàn thành bài tập gần nhất thành công',
    type: UserExerciseAttemptResponseSwaggerDTO
  })
  @ZodSerializerDto(UserExerciseAttemptResDTO)
  async getLatestStatus(
    @Param() { id }: GetUserExerciseAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.GET_STATUS_SUCCESS, lang),
      data: await this.userExerciseAttemptService.getLatestStatus(id, userId)
    }
  }

  @Put(':id/abandon')
  @ApiBearerAuth()
  @ApiBody({ type: TimeSwaggerDTO })
  @ApiOperation({ summary: 'Đánh dấu bài tập là bỏ dở (khi user thoát ra ngoài)' })
  @ApiResponse({
    status: 200,
    description: 'Đánh dấu bài tập bỏ dở thành công',
    type: UserExerciseAttemptResponseSwaggerDTO
  })
  @ZodSerializerDto(UserExerciseAttemptResDTO)
  async abandon(
    @Param() { id }: GetUserExerciseAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @Body() body: CheckExerciseCompletionBodyDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.ABANDON_SUCCESS, lang),
      data: await this.userExerciseAttemptService.abandon(id, userId, body.time)
    }
  }

  @Get(':id/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy trạng thái hiện tại của bài tập' })
  @ApiResponse({
    status: 200,
    description: 'Lấy trạng thái bài tập thành công',
    type: UserExerciseAttemptResponseSwaggerDTO
  })
  @ZodSerializerDto(UserExerciseAttemptResDTO)
  async getStatus(
    @Param() { id }: GetUserExerciseAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.GET_STATUS_SUCCESS, lang),
      data: await this.userExerciseAttemptService.getStatus(id, userId)
    }
  }

  @Get('latest/lesson/:lessonId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy danh sách exercise gần nhất của người dùng theo lesson',
    description:
      'API này trả về exercise attempt gần nhất của user cho mỗi exercise trong lesson. Nếu user có nhiều attempts cho cùng 1 exercise, sẽ lấy cái mới nhất.'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách exercise gần nhất thành công',
    type: LatestExerciseAttemptsByLessonResSwaggerDTO
  })
  @ZodSerializerDto(LatestExerciseAttemptsByLessonResDTO)
  async getLatestExerciseAttemptsByLesson(
    @Param() { lessonId }: UserExerciseAttemptLessonParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.LATEST_BY_LESSON_SUCCESS, lang),
      data: await this.userExerciseAttemptService.getLatestExerciseAttemptsByLesson(
        userId,
        lessonId
      )
    }
  }

  @Get('/exercise/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy trạng thái hoàn thành bài tập của user cho exercise'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy bài tập của user cho exercise thành công',
    type: UserExerciseAttemptResponseSwaggerDTO
  })
  async getExerciseAttemptByExerciseId(
    @Param() { id }: GetUserExerciseAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() languageCode: string
  ) {
    return {
      message: this.i18nService.translate(M.QUESTIONS_SUCCESS, languageCode),
      data: await this.userExerciseAttemptService.getExerciseAttemptByExerciseId(
        id,
        userId,
        languageCode
      )
    }
  }

  @Get('/exercise/:id/review')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy trạng thái hoàn thành bài tập của user cho exercise'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy bài tập của user cho exercise thành công',
    type: UserExerciseAttemptResponseSwaggerDTO
  })
  async getExerciseAttemptReview(
    @Param() { id }: GetUserExerciseAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() languageCode: string
  ) {
    const { completed, data } =
      await this.userExerciseAttemptService.getExerciseAttemptReview(
        id,
        userId,
        languageCode
      )
    return {
      message: this.i18nService.translate(
        completed ? M.REVIEW_SUCCESS : M.REVIEW_NOT_COMPLETED,
        languageCode
      ),
      data
    }
  }
}
