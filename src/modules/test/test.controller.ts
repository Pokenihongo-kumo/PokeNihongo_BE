import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { ActiveRolePermissions } from '@/common/decorators/active-role-permissions.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { RoleName } from '@/common/constants/role.constant'
import {
  GetTestByIdParamsDTO,
  GetTestByLessonParamsDTO,
  GetLessonReviewParamsDTO,
  GetRandomQuestionsQueryDTO,
  GetTestListQueryDTO,
  TestListResDTO,
  CreateTestWithMeaningsBodyDTO,
  UpdateTestWithMeaningsBodyDTO,
  DeleteManyTestsBodyDTO,
  AddTestSetsToTestBodyDTO,
  RemoveTestSetsFromTestBodyDTO
} from './dto/test.zod-dto'
import {
  TestResponseSwaggerDTO,
  TestListResponseSwaggerDTO,
  GetTestListQuerySwaggerDTO,
  CreateTestWithMeaningsSwaggerDTO,
  UpdateTestWithMeaningsSwaggerDTO,
  DeleteManyTestsSwaggerDTO,
  AddTestSetsToTestSwaggerDTO,
  RemoveTestSetsFromTestSwaggerDTO
} from './dto/test.dto'
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
import { TestService } from './test.service'

@ApiTags('Test')
@Controller('test')
export class TestController {
  constructor(private readonly testService: TestService) {}

  @Post('with-meanings')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tạo bài test mới với meanings',
    description:
      'Tạo bài test với meanings cho name và description thay vì translations array'
  })
  @ApiBody({ type: CreateTestWithMeaningsSwaggerDTO })
  @ApiResponse({
    status: 201,
    description: 'Tạo bài test với meanings thành công',
    type: TestResponseSwaggerDTO
  })
  async createTestWithMeanings(
    @Body() body: CreateTestWithMeaningsBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ): Promise<MessageResDTO> {
    return this.testService.createTestWithMeanings(body, userId, lang)
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách bài test với phân trang và tìm kiếm' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách bài test thành công',
    type: TestListResponseSwaggerDTO
  })
  @ApiQuery({ type: GetTestListQuerySwaggerDTO })
  @ZodSerializerDto(TestListResDTO)
  findAll(
    @Query() query: GetTestListQueryDTO,
    @I18nLang() lang: string,
    @ActiveRolePermissions('name') roleName: string
  ) {
    // Nếu là admin thì lấy tất cả translations (không filter theo language)
    const isAdmin = roleName === RoleName.Admin
    return this.testService.findAll(query, isAdmin ? undefined : lang, lang)
  }

  @Get(':id/placement-questions')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Lấy câu hỏi random cho placement test (3 N5, 4 N4, 3 N3) và tạo UserTestAttempt'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy câu hỏi placement test thành công',
    type: MessageResDTO
  })
  async getPlacementQuestions(
    @Param() params: GetTestByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ): Promise<MessageResDTO> {
    return this.testService.getRandomQuestionsForPlacementTest(params.id, userId, lang)
  }

  @Get(':id/random-questions')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy câu hỏi random theo level và số lượng' })
  @ApiQuery({ name: 'levelN', type: Number, description: 'Level (1-5)', example: 5 })
  @ApiQuery({
    name: 'count',
    type: Number,
    description: 'Số lượng câu hỏi cần lấy',
    example: 10
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy câu hỏi random thành công',
    type: MessageResDTO
  })
  async getRandomQuestionsByLevel(
    @Param() params: GetTestByIdParamsDTO,
    @Query() query: GetRandomQuestionsQueryDTO,
    @I18nLang() lang: string
  ): Promise<MessageResDTO> {
    return this.testService.getRandomQuestionsByLevel(
      params.id,
      query.levelN,
      query.count,
      lang
    )
  }

  @Get('lesson-review/:testId/questions')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy câu hỏi bài test ôn tập lesson',
    description:
      'Lấy 10 câu hỏi random từ 3 testSet (VOCABULARY, GRAMMAR, KANJI) của test. Mỗi testSet có 5 câu, tổng 15 câu, random chọn 10 câu.'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy câu hỏi bài test ôn tập thành công',
    type: TestResponseSwaggerDTO
  })
  async generateLessonReviewTest(
    @Param() params: GetLessonReviewParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ): Promise<MessageResDTO> {
    return this.testService.generateLessonReviewTest(params.testId, userId, lang)
  }

  @Get(':id/full')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy toàn bộ thông tin bài test kèm câu hỏi và câu trả lời' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin bài test thành công',
    type: TestResponseSwaggerDTO
  })
  async findFull(
    @Param() params: GetTestByIdParamsDTO,
    @I18nLang() lang: string
  ): Promise<MessageResDTO> {
    return this.testService.findFullById(params.id, lang)
  }

  @Get(':id/full-user')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy toàn bộ thông tin bài test kèm câu hỏi và câu trả lời' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin bài test thành công',
    type: TestResponseSwaggerDTO
  })
  async findFullUser(
    @Param() params: GetTestByIdParamsDTO,
    @I18nLang() lang: string
  ): Promise<MessageResDTO> {
    return this.testService.findFullByIdForUser(params.id, lang)
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin bài test theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin bài test thành công',
    type: TestResponseSwaggerDTO
  })
  findOne(@Param() params: GetTestByIdParamsDTO, @I18nLang() lang: string) {
    return this.testService.findOne(params.id, lang)
  }

  @Put(':id/with-meanings')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật bài test với meanings theo ID' })
  @ApiBody({ type: UpdateTestWithMeaningsSwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật bài test với meanings thành công',
    type: TestResponseSwaggerDTO
  })
  async updateTestWithMeanings(
    @Param() params: GetTestByIdParamsDTO,
    @Body() body: UpdateTestWithMeaningsBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ): Promise<MessageResDTO> {
    return this.testService.updateTestWithMeanings(params.id, body, userId, lang)
  }

  @Delete('bulk')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa nhiều bài test cùng lúc' })
  @ApiBody({ type: DeleteManyTestsSwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Xóa nhiều bài test thành công',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Xóa thành công 3/3 bài test' },
        data: {
          type: 'object',
          properties: {
            deletedCount: { type: 'number', example: 3 },
            deletedIds: { type: 'array', items: { type: 'number' }, example: [1, 2, 3] },
            requestedCount: { type: 'number', example: 3 },
            notFoundCount: { type: 'number', example: 0 }
          }
        }
      }
    }
  })
  async deleteManyTests(
    @Body() body: DeleteManyTestsBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ): Promise<MessageResDTO> {
    return this.testService.deleteManyTests(body, userId, lang)
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa bài test theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Xóa bài test thành công',
    type: TestResponseSwaggerDTO
  })
  async deleteTest(
    @Param() params: GetTestByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ): Promise<MessageResDTO> {
    return this.testService.deleteTest(params.id, userId, lang)
  }

  @Post('lesson/:lessonId/testSets')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Thêm nhiều TestSet vào Test' })
  @ApiBody({ type: AddTestSetsToTestSwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Thêm TestSet vào Test thành công',
    type: MessageResDTO
  })
  async addTestSetsToLessonReviewTest(
    @Param() params: GetTestByLessonParamsDTO,
    @Body() body: AddTestSetsToTestBodyDTO,
    @I18nLang() lang: string
  ): Promise<MessageResDTO> {
    return this.testService.addTestSetsToLessonReviewTest(params.lessonId, body, lang)
  }

  @Post(':id/testSets')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Thêm nhiều TestSet vào Test' })
  @ApiBody({ type: AddTestSetsToTestSwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Thêm TestSet vào Test thành công',
    type: MessageResDTO
  })
  async addTestSetsToTest(
    @Param() params: GetTestByIdParamsDTO,
    @Body() body: AddTestSetsToTestBodyDTO,
    @I18nLang() lang: string
  ): Promise<MessageResDTO> {
    return this.testService.addTestSetsToTest(params.id, body, lang)
  }

  @Delete(':id/testSets')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa nhiều TestSet khỏi Test' })
  @ApiBody({ type: RemoveTestSetsFromTestSwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Xóa TestSet khỏi Test thành công',
    type: MessageResDTO
  })
  async removeTestSetsFromTest(
    @Param() params: GetTestByIdParamsDTO,
    @Body() body: RemoveTestSetsFromTestBodyDTO,
    @I18nLang() lang: string
  ): Promise<MessageResDTO> {
    return this.testService.removeTestSetsFromTest(params.id, body, lang)
  }

  @Post('auto-add-free-testsets')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Tự động thêm tất cả TestSet free (price = 0, ACTIVE) vào Test PLACEMENT_TEST_DONE'
  })
  @ApiResponse({
    status: 200,
    description: 'Thêm TestSet vào Test thành công',
    type: MessageResDTO
  })
  async autoAddFreeTestSets(@I18nLang() lang: string) {
    return this.testService.autoAddFreeTestSets(lang)
  }
}
