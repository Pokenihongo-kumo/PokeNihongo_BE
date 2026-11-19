import { I18nService } from '@/i18n/i18n.service'
import { UserTestAttemptMessage as M } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import {
  CreateUserTestAttemptBodyDTO,
  CreateUserTestAttemptParamsDTO,
  GetUserTestAttemptByIdParamsDTO,
  GetUserTestAttemptListQueryDTO,
  UpdateUserTestAttemptBodyDTO,
  UserTestAttemptListResDTO,
  UserTestAttemptResDTO,
  CheckTestCompletionBodyDTO,
  UserTestAttemptTestParamsDTO
} from '@/modules/user-test-attempt/dto/user-test-attempt.zod-dto'
import {
  UserTestAttemptResponseSwaggerDTO,
  UserTestAttemptListResponseSwaggerDTO,
  GetUserTestAttemptListQuerySwaggerDTO,
  CreateUserTestAttemptParamsSwaggerDTO,
  UpdateUserTestAttemptSwaggerDTO,
  TestCompletionResponseSwaggerDTO,
  TimeSwaggerDTO
} from '@/modules/user-test-attempt/dto/user-test-attempt.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
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
import {
  TestCompletionOutcome,
  UserTestAttemptService
} from './user-test-attempt.service'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'

const COMPLETION_MESSAGE: Record<TestCompletionOutcome, string> = {
  'not-enough-answers': M.NOT_ENOUGH_ANSWERS,
  'no-answer': M.SUBMITTED_NO_ANSWER,
  incomplete: M.SUBMITTED_INCOMPLETE,
  'all-correct': M.TEST_COMPLETED_ALL_CORRECT,
  'some-wrong': M.TEST_COMPLETED_SOME_WRONG,
  'review-passed': M.LESSON_REVIEW_PASSED,
  'review-failed': M.LESSON_REVIEW_FAILED
}

@ApiTags('User Test Attempt')
@Controller('user-test-attempt')
export class UserTestAttemptController {
  constructor(
    private readonly userTestAttemptService: UserTestAttemptService,
    private readonly i18nService: I18nService
  ) {}

  @Post(':testId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo lần thử bài test mới' })
  @ApiResponse({
    status: 201,
    description: 'Tạo lần thử bài test thành công',
    type: UserTestAttemptResponseSwaggerDTO
  })
  @ZodSerializerDto(UserTestAttemptResDTO)
  async create(
    @Param() { testId }: CreateUserTestAttemptParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.CREATE_SUCCESS, lang),
      data: await this.userTestAttemptService.create(userId, testId)
    }
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách lần thử bài test với phân trang và lọc' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách lần thử bài test thành công',
    type: UserTestAttemptListResponseSwaggerDTO
  })
  @ApiQuery({ type: GetUserTestAttemptListQuerySwaggerDTO })
  @ZodSerializerDto(UserTestAttemptListResDTO)
  async findAll(
    @Query() query: GetUserTestAttemptListQueryDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang),
      data: await this.userTestAttemptService.findAll(query)
    }
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin lần thử bài test theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin lần thử bài test thành công',
    type: UserTestAttemptResponseSwaggerDTO
  })
  @ZodSerializerDto(UserTestAttemptResDTO)
  async findOne(
    @Param() { id }: GetUserTestAttemptByIdParamsDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.GET_SUCCESS, lang),
      data: await this.userTestAttemptService.findOne(id)
    }
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật lần thử bài test theo ID' })
  @ApiBody({ type: UpdateUserTestAttemptSwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật lần thử bài test thành công',
    type: UserTestAttemptResponseSwaggerDTO
  })
  @ZodSerializerDto(UserTestAttemptResDTO)
  async update(
    @Param() { id }: GetUserTestAttemptByIdParamsDTO,
    @Body() body: UpdateUserTestAttemptBodyDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.UPDATE_SUCCESS, lang),
      data: await this.userTestAttemptService.update(id, body)
    }
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa lần thử bài test theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Xóa lần thử bài test thành công',
    type: UserTestAttemptResponseSwaggerDTO
  })
  @ZodSerializerDto(UserTestAttemptResDTO)
  async remove(
    @Param() { id }: GetUserTestAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.DELETE_SUCCESS, lang),
      data: await this.userTestAttemptService.remove(id, userId)
    }
  }

  @Put(':id/submit-completion')
  @ApiBearerAuth()
  @ApiBody({ type: TimeSwaggerDTO })
  @ApiOperation({ summary: 'Nộp bài test (submit completion)' })
  @ApiResponse({
    status: 200,
    description: 'Nộp bài test thành công',
    type: TestCompletionResponseSwaggerDTO
  })
  async submitCompletion(
    @Param() { id }: GetUserTestAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @Body() body: CheckTestCompletionBodyDTO,
    @I18nLang() lang: string
  ) {
    const { outcome, data } = await this.userTestAttemptService.submitTestCompletion(
      id,
      userId,
      body.time
    )
    return {
      message: this.i18nService.translate(COMPLETION_MESSAGE[outcome], lang),
      data
    }
  }

  @Put(':id/placement-test/submit-completion')
  @ApiBearerAuth()
  @ApiBody({ type: TimeSwaggerDTO })
  @ApiOperation({ summary: 'Nộp bài placement test và đánh giá trình độ (levelN)' })
  @ApiResponse({
    status: 200,
    description: 'Nộp bài placement test thành công',
    type: MessageResDTO
  })
  async submitPlacementTestCompletion(
    @Param() { id }: GetUserTestAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @Body() body: CheckTestCompletionBodyDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.PLACEMENT_DONE, lang),
      data: await this.userTestAttemptService.submitPlacementTestCompletion(
        id,
        userId,
        body.time
      )
    }
  }

  @Get(':id/check-completion')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kiểm tra trạng thái hoàn thành bài test' })
  @ApiResponse({
    status: 200,
    description: 'Kiểm tra trạng thái hoàn thành thành công',
    type: TestCompletionResponseSwaggerDTO
  })
  async checkCompletion(
    @Param() { id }: GetUserTestAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() languageCode: string
  ) {
    const { outcome, data } = await this.userTestAttemptService.checkTestCompletion(
      id,
      userId
    )
    return {
      message: this.i18nService.translate(COMPLETION_MESSAGE[outcome], languageCode),
      data
    }
  }

  @Put(':id/abandon')
  @ApiBearerAuth()
  @ApiBody({ type: TimeSwaggerDTO })
  @ApiOperation({ summary: 'Đánh dấu bài test là bỏ dở (khi user thoát ra ngoài)' })
  @ApiResponse({
    status: 200,
    description: 'Đánh dấu bài test bỏ dở thành công',
    type: UserTestAttemptResponseSwaggerDTO
  })
  @ZodSerializerDto(UserTestAttemptResDTO)
  async abandon(
    @Param() { id }: GetUserTestAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @Body() body: CheckTestCompletionBodyDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.ABANDON_SUCCESS, lang),
      data: await this.userTestAttemptService.abandon(id, userId, body.time)
    }
  }

  @Get(':id/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy trạng thái hiện tại của bài test' })
  @ApiResponse({
    status: 200,
    description: 'Lấy trạng thái bài test thành công',
    type: UserTestAttemptResponseSwaggerDTO
  })
  @ZodSerializerDto(UserTestAttemptResDTO)
  async getStatus(
    @Param() { id }: GetUserTestAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.GET_STATUS_SUCCESS, lang),
      data: await this.userTestAttemptService.getStatus(id, userId)
    }
  }

  @Get('/test/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy bài test của user cho test (với questions và answers)',
    description:
      'API này trả về thông tin bài test với các TestSets, questions và answers. Tự động tạo attempt mới nếu cần.'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy bài test của user thành công',
    type: UserTestAttemptResponseSwaggerDTO
  })
  async getTestAttemptByTestId(
    @Param() { id }: UserTestAttemptTestParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() languageCode: string
  ) {
    return {
      data: await this.userTestAttemptService.getTestAttemptByTestId(
        id,
        userId,
        languageCode
      ),
      message: this.i18nService.translate(M.QUESTIONS_SUCCESS, languageCode)
    }
  }

  @Get('/test/:id/review')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy review bài test của user (chỉ khi đã hoàn thành và đạt >= 80%)'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy review bài test thành công',
    type: UserTestAttemptResponseSwaggerDTO
  })
  async getTestAttemptReview(
    @Param() { id }: GetUserTestAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() languageCode: string
  ) {
    const { completed, data } = await this.userTestAttemptService.getTestAttemptReview(
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

  //KUMO new
  @Get('/lesson/test/:id/review')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy review bài test của user (chỉ khi đã hoàn thành và đạt >= 80%)'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy review bài test thành công',
    type: UserTestAttemptResponseSwaggerDTO
  })
  async getLessonTestAttemptReview(
    @Param() { id }: GetUserTestAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() languageCode: string
  ) {
    const { completed, data } =
      await this.userTestAttemptService.getLessonTestAttemptReview(
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
