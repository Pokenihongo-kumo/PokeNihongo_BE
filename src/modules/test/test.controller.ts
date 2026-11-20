import { ResponseMessage, msg } from '@/i18n/response-message'
import { TestMessage as M } from '@/i18n/message-keys'
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
  @ResponseMessage(M.CREATE_SUCCESS)
  async createTestWithMeanings(
    @Body() body: CreateTestWithMeaningsBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.testService.createTestWithMeanings(body, userId)
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
  @ResponseMessage(M.GET_LIST_SUCCESS)
  async findAll(
    @Query() query: GetTestListQueryDTO,
    @I18nLang() lang: string,
    @ActiveRolePermissions('name') roleName: string
  ) {
    // Nếu là admin thì lấy tất cả translations (không filter theo language)
    const isAdmin = roleName === RoleName.Admin
    return this.testService.findAll(query, isAdmin ? undefined : lang)
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
  @ResponseMessage(M.PLACEMENT_QUESTIONS_SUCCESS)
  async getPlacementQuestions(
    @Param() params: GetTestByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
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
  ) {
    const data = await this.testService.getRandomQuestionsByLevel(
      params.id,
      query.levelN,
      query.count,
      lang
    )
    return {
      message: msg(M.LEVEL_QUESTIONS_SUCCESS, {
        count: data.count,
        level: data.levelN
      }),
      data
    }
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
  @ResponseMessage(M.GET_SUCCESS)
  async generateLessonReviewTest(
    @Param() params: GetLessonReviewParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
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
  @ResponseMessage(M.GET_SUCCESS)
  async findFull(@Param() params: GetTestByIdParamsDTO, @I18nLang() lang: string) {
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
  @ResponseMessage(M.GET_SUCCESS)
  async findFullUser(@Param() params: GetTestByIdParamsDTO, @I18nLang() lang: string) {
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
  @ResponseMessage(M.GET_SUCCESS)
  async findOne(@Param() params: GetTestByIdParamsDTO, @I18nLang() lang: string) {
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
  @ResponseMessage(M.UPDATE_SUCCESS)
  async updateTestWithMeanings(
    @Param() params: GetTestByIdParamsDTO,
    @Body() body: UpdateTestWithMeaningsBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.testService.updateTestWithMeanings(params.id, body, userId)
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
    @ActiveUser('userId') userId: number
  ) {
    const data = await this.testService.deleteManyTests(body, userId)
    return {
      message: msg(M.DELETE_MANY_SUCCESS, {
        deleted: data.deletedCount,
        requested: data.requestedCount
      }),
      data
    }
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
  @ResponseMessage(M.DELETE_SUCCESS)
  async deleteTest(
    @Param() params: GetTestByIdParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.testService.deleteTest(params.id, userId)
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
  @ResponseMessage(M.ADD_TESTSETS_SUCCESS)
  async addTestSetsToLessonReviewTest(
    @Param() params: GetTestByLessonParamsDTO,
    @Body() body: AddTestSetsToTestBodyDTO
  ) {
    return this.testService.addTestSetsToLessonReviewTest(params.lessonId, body)
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
  @ResponseMessage(M.ADD_TESTSETS_SUCCESS)
  async addTestSetsToTest(
    @Param() params: GetTestByIdParamsDTO,
    @Body() body: AddTestSetsToTestBodyDTO
  ) {
    return this.testService.addTestSetsToTest(params.id, body)
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
  @ResponseMessage(M.REMOVE_TESTSETS_SUCCESS)
  async removeTestSetsFromTest(
    @Param() params: GetTestByIdParamsDTO,
    @Body() body: RemoveTestSetsFromTestBodyDTO
  ) {
    return this.testService.removeTestSetsFromTest(params.id, body)
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
  async autoAddFreeTestSets() {
    const { outcome, data } = await this.testService.autoAddFreeTestSets()
    const message =
      outcome === 'no-placement'
        ? msg(M.AUTO_ADD_NO_PLACEMENT)
        : outcome === 'no-free-testsets'
          ? msg(M.AUTO_ADD_NO_FREE_TESTSETS)
          : msg(M.AUTO_ADD_SUCCESS, {
              added: data.totalTestSetsAdded,
              tests: data.totalTests
            })
    return { message, data }
  }
}
