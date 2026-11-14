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
import { UserTestAttemptService } from './user-test-attempt.service'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'

@ApiTags('User Test Attempt')
@Controller('user-test-attempt')
export class UserTestAttemptController {
  constructor(private readonly userTestAttemptService: UserTestAttemptService) {}

  @Post(':testId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo lần thử bài test mới' })
  @ApiResponse({
    status: 201,
    description: 'Tạo lần thử bài test thành công',
    type: UserTestAttemptResponseSwaggerDTO
  })
  @ZodSerializerDto(UserTestAttemptResDTO)
  create(
    @Param() { testId }: CreateUserTestAttemptParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userTestAttemptService.create(userId, testId, lang)
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
  findAll(@Query() query: GetUserTestAttemptListQueryDTO, @I18nLang() lang: string) {
    return this.userTestAttemptService.findAll(query, lang)
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
  findOne(@Param() { id }: GetUserTestAttemptByIdParamsDTO, @I18nLang() lang: string) {
    return this.userTestAttemptService.findOne(id, lang)
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
  update(
    @Param() { id }: GetUserTestAttemptByIdParamsDTO,
    @Body() body: UpdateUserTestAttemptBodyDTO,
    @I18nLang() lang: string
  ) {
    return this.userTestAttemptService.update(id, body, lang)
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
  remove(
    @Param() { id }: GetUserTestAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userTestAttemptService.remove(id, userId, lang)
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
  submitCompletion(
    @Param() { id }: GetUserTestAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @Body() body: CheckTestCompletionBodyDTO,
    @I18nLang() lang: string
  ) {
    return this.userTestAttemptService.submitTestCompletion(id, userId, body.time, lang)
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
  submitPlacementTestCompletion(
    @Param() { id }: GetUserTestAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @Body() body: CheckTestCompletionBodyDTO,
    @I18nLang() lang: string
  ) {
    return this.userTestAttemptService.submitPlacementTestCompletion(
      id,
      userId,
      body.time,
      lang
    )
  }

  @Get(':id/check-completion')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kiểm tra trạng thái hoàn thành bài test' })
  @ApiResponse({
    status: 200,
    description: 'Kiểm tra trạng thái hoàn thành thành công',
    type: TestCompletionResponseSwaggerDTO
  })
  checkCompletion(
    @Param() { id }: GetUserTestAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() languageCode: string
  ) {
    return this.userTestAttemptService.checkTestCompletion(id, userId, languageCode)
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
  abandon(
    @Param() { id }: GetUserTestAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @Body() body: CheckTestCompletionBodyDTO,
    @I18nLang() lang: string
  ) {
    return this.userTestAttemptService.abandon(id, userId, body.time, lang)
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
  getStatus(
    @Param() { id }: GetUserTestAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userTestAttemptService.getStatus(id, userId, lang)
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
  getTestAttemptByTestId(
    @Param() { id }: UserTestAttemptTestParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() languageCode: string
  ) {
    return this.userTestAttemptService.getTestAttemptByTestId(id, userId, languageCode)
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
  getTestAttemptReview(
    @Param() { id }: GetUserTestAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() languageCode: string
  ) {
    return this.userTestAttemptService.getTestAttemptReview(id, userId, languageCode)
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
  getLessonTestAttemptReview(
    @Param() { id }: GetUserTestAttemptByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() languageCode: string
  ) {
    return this.userTestAttemptService.getLessonTestAttemptReview(
      id,
      userId,
      languageCode
    )
  }
}
