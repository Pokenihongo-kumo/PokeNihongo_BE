import { ActiveUser } from '@/common/decorators/active-user.decorator'
import {
  CreateUserTestAttemptBodyDTO,
  CreateUserTestAttemptParamsDTO,
  GetUserTestAttemptByIdParamsDTO,
  GetUserTestAttemptListQueryDTO,
  UpdateUserTestAttemptBodyDTO,
  UserTestAttemptListResDTO,
  UserTestAttemptResDTO,
  CheckTestCompletionBodyDTO
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
  create(@Param('testId') testId: string, @ActiveUser('userId') userId: number) {
    return this.userTestAttemptService.create(userId, parseInt(testId, 10))
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
  findAll(@Query() query: GetUserTestAttemptListQueryDTO) {
    return this.userTestAttemptService.findAll(query)
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
  findOne(@Param('id') id: string, @I18nLang() lang: string) {
    return this.userTestAttemptService.findOne(Number(id), lang)
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
    @Param('id') id: string,
    @Body() body: UpdateUserTestAttemptBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userTestAttemptService.update(Number(id), body)
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
  remove(@Param('id') id: string) {
    return this.userTestAttemptService.remove(Number(id))
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
    @Param('id') id: string,
    @ActiveUser('userId') userId: number,
    @Body() body: CheckTestCompletionBodyDTO
  ) {
    return this.userTestAttemptService.submitTestCompletion(
      Number(id),
      userId,
      body?.time
    )
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
  supmitPlacementTestCompletion(
    @Param('id') id: string,
    @ActiveUser('userId') userId: number,
    @Body() body: CheckTestCompletionBodyDTO
  ) {
    return this.userTestAttemptService.submitPlacementTestCompletion(
      Number(id),
      userId,
      body?.time
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
    @Param('id') id: string,
    @ActiveUser('userId') userId: number,
    @I18nLang() languageCode: string
  ) {
    return this.userTestAttemptService.checkTestCompletion(
      Number(id),
      userId,
      languageCode
    )
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
    @Param('id') id: string,
    @ActiveUser('userId') userId: number,
    @Body() body: TimeSwaggerDTO
  ) {
    return this.userTestAttemptService.abandon(Number(id), userId, body?.time)
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
    @Param('id') id: string,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userTestAttemptService.getStatus(Number(id), userId, lang)
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
    @Param('id') id: string,
    @ActiveUser('userId') userId: number,
    @I18nLang() languageCode: string
  ) {
    return this.userTestAttemptService.getTestAttemptByTestId(
      Number(id),
      userId,
      languageCode
    )
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
    @Param('id') id: string,
    @ActiveUser('userId') userId: number,
    @I18nLang() languageCode: string
  ) {
    return this.userTestAttemptService.getTestAttemptReview(
      Number(id),
      userId,
      languageCode
    )
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
    @Param('id') id: string,
    @ActiveUser('userId') userId: number,
    @I18nLang() languageCode: string
  ) {
    return this.userTestAttemptService.getLessonTestAttemptReview(
      Number(id),
      userId,
      languageCode
    )
  }
}
