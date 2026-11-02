import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { ActiveRolePermissions } from '@/common/decorators/active-role-permissions.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { RoleName } from '@/common/constants/role.constant'
import {
  CreateTestBodyDTO,
  GetTestByIdParamsDTO,
  GetTestListQueryDTO,
  UpdateTestBodyDTO,
  TestResDTO,
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
  CreateTestSwaggerDTO,
  UpdateTestSwaggerDTO,
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
    @ActiveUser('userId') userId: number
  ): Promise<MessageResDTO> {
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
  findAll(
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
  async getPlacementQuestions(
    @Param('id') id: string,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ): Promise<MessageResDTO> {
    return this.testService.getRandomQuestionsForPlacementTest(Number(id), userId, lang)
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
    @Param('id') id: string,
    @Query('levelN') levelN: string,
    @Query('count') count: string,
    @I18nLang() lang: string
  ): Promise<MessageResDTO> {
    return this.testService.getRandomQuestionsByLevel(
      Number(id),
      Number(levelN),
      Number(count),
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
    @Param('testId') testId: string,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ): Promise<MessageResDTO> {
    return this.testService.generateLessonReviewTest(Number(testId), userId, lang)
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
    @Param('id') id: string,
    @I18nLang() lang: string
  ): Promise<MessageResDTO> {
    return this.testService.findFullById(Number(id), lang)
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
    @Param('id') id: string,
    @I18nLang() lang: string
  ): Promise<MessageResDTO> {
    return this.testService.findFullByIdForUser(Number(id), lang)
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin bài test theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin bài test thành công',
    type: TestResponseSwaggerDTO
  })
  findOne(@Param('id') id: string, @I18nLang() lang: string) {
    return this.testService.findOne(Number(id), lang)
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
    @Param('id') id: string,
    @Body() body: UpdateTestWithMeaningsBodyDTO,
    @ActiveUser('userId') userId: number
  ): Promise<MessageResDTO> {
    return this.testService.updateTestWithMeanings(Number(id), body, userId)
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
  ): Promise<MessageResDTO> {
    return this.testService.deleteManyTests(body, userId)
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
    @Param('id') id: string,
    @ActiveUser('userId') userId: number
  ): Promise<MessageResDTO> {
    return this.testService.deleteTest(Number(id), userId)
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
    @Param('lessonId') lessonId: string,
    @Body() body: AddTestSetsToTestBodyDTO
  ): Promise<MessageResDTO> {
    return this.testService.addTestSetsToLessonReviewTest(Number(lessonId), body)
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
    @Param('id') id: string,
    @Body() body: AddTestSetsToTestBodyDTO
  ): Promise<MessageResDTO> {
    return this.testService.addTestSetsToTest(Number(id), body)
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
    @Param('id') id: string,
    @Body() body: RemoveTestSetsFromTestBodyDTO
  ): Promise<MessageResDTO> {
    return this.testService.removeTestSetsFromTest(Number(id), body)
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
    return this.testService.autoAddFreeTestSets()
  }
}
