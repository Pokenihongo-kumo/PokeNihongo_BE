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

@ApiTags('User Exercise Attempt')
@Controller('user-exercise-attempt')
export class UserExerciseAttemptController {
  constructor(private readonly userExerciseAttemptService: UserExerciseAttemptService) {}

  @Post(':exerciseId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo lần thử bài tập mới' })
  @ApiResponse({
    status: 201,
    description: 'Tạo lần thử bài tập thành công',
    type: UserExerciseAttemptResponseSwaggerDTO
  })
  @ZodSerializerDto(UserExerciseAttemptResDTO)
  create(
    @Param() { exerciseId }: CreateUserExerciseAttemptParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userExerciseAttemptService.create(userId, exerciseId, lang)
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
  findAll(@Query() query: GetUserExerciseAttemptListQueryDTO, @I18nLang() lang: string) {
    return this.userExerciseAttemptService.findAll(query, lang)
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
  findOne(
    @Param() { id }: GetUserExerciseAttemptByIdParamsDTO,
    @I18nLang() lang: string
  ) {
    return this.userExerciseAttemptService.findOne(id, lang)
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
  update(
    @Param() { id }: GetUserExerciseAttemptByIdParamsDTO,
    @Body() body: UpdateUserExerciseAttemptBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userExerciseAttemptService.update(id, body, userId, lang)
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
  remove(@Param() { id }: GetUserExerciseAttemptByIdParamsDTO, @I18nLang() lang: string) {
    return this.userExerciseAttemptService.remove(id, lang)
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
  submitCompletion(
    @Param() { id }: GetUserExerciseAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @Body() body: CheckExerciseCompletionBodyDTO,
    @I18nLang() lang: string
  ) {
    return this.userExerciseAttemptService.submitExerciseCompletion(
      id,
      userId,
      body.time,
      lang
    )
  }

  @Get(':id/check-completion')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kiểm tra trạng thái hoàn thành bài tập' })
  @ApiResponse({
    status: 200,
    description: 'Kiểm tra trạng thái hoàn thành thành công',
    type: ExerciseCompletionResponseSwaggerDTO
  })
  checkCompletion(
    @Param() { id }: GetUserExerciseAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userExerciseAttemptService.checkExerciseCompletion(id, userId, lang)
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
  getLatestStatus(
    @Param() { id }: GetUserExerciseAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userExerciseAttemptService.getLatestStatus(id, userId, lang)
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
  abandon(
    @Param() { id }: GetUserExerciseAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @Body() body: CheckExerciseCompletionBodyDTO,
    @I18nLang() lang: string
  ) {
    return this.userExerciseAttemptService.abandon(id, userId, body.time, lang)
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
  getStatus(
    @Param() { id }: GetUserExerciseAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userExerciseAttemptService.getStatus(id, userId, lang)
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
  getLatestExerciseAttemptsByLesson(
    @Param() { lessonId }: UserExerciseAttemptLessonParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userExerciseAttemptService.getLatestExerciseAttemptsByLesson(
      userId,
      lessonId,
      lang
    )
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
  getExerciseAttemptByExerciseId(
    @Param() { id }: GetUserExerciseAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() languageCode: string
  ) {
    return this.userExerciseAttemptService.getExerciseAttemptByExerciseId(
      id,
      userId,
      languageCode
    )
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
  getExerciseAttemptReview(
    @Param() { id }: GetUserExerciseAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() languageCode: string
  ) {
    return this.userExerciseAttemptService.getExerciseAttemptReview(
      id,
      userId,
      languageCode
    )
  }
}
