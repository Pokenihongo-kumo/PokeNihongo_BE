import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import {
  CreateTestSetBodyDTO,
  GetTestSetByIdParamsDTO,
  GetTestSetListQueryDTO,
  UpdateTestSetBodyDTO,
  TestSetResDTO,
  TestSetListResDTO,
  CreateTestSetWithMeaningsBodyDTO,
  UpdateTestSetWithMeaningsBodyDTO,
  UpsertTestSetWithQuestionBanksBodyDTO
} from './dto/testset.zod-dto'
import {
  TestSetResponseSwaggerDTO,
  TestSetListResponseSwaggerDTO,
  TestSetWithQuestionsResponseSwaggerDTO,
  TestSetWithQuestionsFullResponseSwaggerDTO,
  GetTestSetListQuerySwaggerDTO,
  CreateTestSetSwaggerDTO,
  UpdateTestSetSwaggerDTO,
  CreateTestSetWithMeaningsSwaggerDTO,
  UpdateTestSetWithMeaningsSwaggerDTO,
  UpsertTestSetWithQuestionBanksSwaggerDTO
} from './dto/testset.dto'
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
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { TestSetService } from './testset.service'

@ApiTags('TestSet')
@Controller('testset')
export class TestSetController {
  constructor(private readonly testSetService: TestSetService) {}

  @Post('upsert-with-question-banks')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upsert bộ đề với questionBank (Tạo mới hoặc Cập nhật)',
    description:
      'Nếu không có id trong body → tạo mới testset. Nếu có id → cập nhật testset. Có thể: tạo questionBank mới, update thông tin testset/questionBank, và update vị trí order (drag & drop) trong 1 API'
  })
  @ApiBody({ type: UpsertTestSetWithQuestionBanksSwaggerDTO })
  async upsertTestSetWithQuestionBanks(
    @Body() body: UpsertTestSetWithQuestionBanksBodyDTO,
    @ActiveUser('userId') userId: number
  ): Promise<MessageResDTO> {
    return this.testSetService.upsertTestSetWithQuestionBanks(body, userId)
  }

  @Post('with-meanings')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tạo bộ đề mới với meanings',
    description:
      'Tạo bộ đề với meanings cho name và description thay vì translations array'
  })
  @ApiBody({ type: CreateTestSetWithMeaningsSwaggerDTO })
  @ApiResponse({
    status: 201,
    description: 'Tạo bộ đề với meanings thành công',
    type: TestSetResponseSwaggerDTO
  })
  async createTestSetWithMeanings(
    @Body() body: CreateTestSetWithMeaningsBodyDTO,
    @ActiveUser('userId') userId: number
  ): Promise<MessageResDTO> {
    return this.testSetService.createTestSetWithMeanings(body, userId)
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách bộ đề với phân trang và tìm kiếm' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách bộ đề thành công',
    type: TestSetListResponseSwaggerDTO
  })
  @ApiQuery({ type: GetTestSetListQuerySwaggerDTO })
  @ZodSerializerDto(TestSetListResDTO)
  findAll(@Query() query: GetTestSetListQueryDTO, @I18nLang() lang: string) {
    return this.testSetService.findAll(query, lang)
  }

  @Get('basic')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách bộ đề với phân trang và tìm kiếm' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách bộ đề thành công',
    type: TestSetListResponseSwaggerDTO
  })
  @ApiQuery({ type: GetTestSetListQuerySwaggerDTO })
  @ZodSerializerDto(TestSetListResDTO)
  findAllBasic(@Query() query: GetTestSetListQueryDTO, @I18nLang() lang: string) {
    return this.testSetService.findAllBasic(query, lang)
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin bộ đề theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin bộ đề thành công',
    type: TestSetWithQuestionsResponseSwaggerDTO
  })
  findOne(@Param('id') id: string, @I18nLang() lang: string) {
    return this.testSetService.findOne(Number(id), lang)
  }

  @Get(':id/with-question-banks-full')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy thông tin bộ đề với questionBanks và full translations',
    description:
      'Lấy testset với tất cả questionBanks kèm full translations (không filter theo ngôn ngữ)'
  })
  @ApiParam({
    name: 'id',
    description: 'ID của TestSet',
    example: 1
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin bộ đề với questionBanks và full translations thành công',
    type: TestSetWithQuestionsFullResponseSwaggerDTO
  })
  findOneWithQuestionBanksFull(@Param('id') id: string) {
    return this.testSetService.findOneWithQuestionBanksFull(Number(id))
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật bộ đề theo ID' })
  @ApiBody({ type: UpdateTestSetSwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật bộ đề thành công',
    type: TestSetResponseSwaggerDTO
  })
  async updateTestSet(
    @Param('id') id: string,
    @Body() body: UpdateTestSetBodyDTO,
    @ActiveUser('userId') userId: number
  ): Promise<MessageResDTO> {
    return this.testSetService.updateTestSet(Number(id), body, userId)
  }

  @Put(':id/with-meanings')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật bộ đề với meanings theo ID' })
  @ApiBody({ type: UpdateTestSetWithMeaningsSwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật bộ đề với meanings thành công',
    type: TestSetResponseSwaggerDTO
  })
  async updateTestSetWithMeanings(
    @Param('id') id: string,
    @Body() body: UpdateTestSetWithMeaningsBodyDTO,
    @ActiveUser('userId') userId: number
  ): Promise<MessageResDTO> {
    return this.testSetService.updateTestSetWithMeanings(Number(id), body, userId)
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa bộ đề theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Xóa bộ đề thành công',
    type: TestSetResponseSwaggerDTO
  })
  async deleteTestSet(
    @Param('id') id: string,
    @ActiveUser('userId') userId: number
  ): Promise<MessageResDTO> {
    return this.testSetService.deleteTestSet(Number(id), userId)
  }
}
