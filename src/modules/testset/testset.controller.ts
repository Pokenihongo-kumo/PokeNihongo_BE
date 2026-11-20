import { ResponseMessage, msg } from '@/i18n/response-message'
import { TestSetMessage as M } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import {
  GetTestSetByIdParamsDTO,
  GetTestSetListQueryDTO,
  UpdateTestSetBodyDTO,
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
  UpdateTestSetSwaggerDTO,
  CreateTestSetWithMeaningsSwaggerDTO,
  UpdateTestSetWithMeaningsSwaggerDTO,
  UpsertTestSetWithQuestionBanksSwaggerDTO
} from './dto/testset.dto'
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
  ) {
    const data = await this.testSetService.upsertTestSetWithQuestionBanks(body, userId)
    // POST: 201 for both (the status is not switched on update)
    return {
      message: msg(body.id ? M.UPDATE_SUCCESS : M.CREATE_SUCCESS),
      data
    }
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
  @ResponseMessage(M.CREATE_SUCCESS)
  async createTestSetWithMeanings(
    @Body() body: CreateTestSetWithMeaningsBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
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
  @ResponseMessage(M.GET_LIST_SUCCESS)
  async findAll(@Query() query: GetTestSetListQueryDTO) {
    return this.testSetService.findAll(query)
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
  @ResponseMessage(M.GET_LIST_SUCCESS)
  async findAllBasic(@Query() query: GetTestSetListQueryDTO) {
    return this.testSetService.findAll(query)
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin bộ đề theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin bộ đề thành công',
    type: TestSetWithQuestionsResponseSwaggerDTO
  })
  @ResponseMessage(M.GET_SUCCESS)
  async findOne(@Param() params: GetTestSetByIdParamsDTO, @I18nLang() lang: string) {
    return this.testSetService.findOne(params.id, lang)
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
  @ResponseMessage(M.GET_SUCCESS)
  async findOneWithQuestionBanksFull(@Param() params: GetTestSetByIdParamsDTO) {
    return this.testSetService.findOneWithQuestionBanksFull(params.id)
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
  @ResponseMessage(M.UPDATE_SUCCESS)
  async updateTestSet(
    @Param() params: GetTestSetByIdParamsDTO,
    @Body() body: UpdateTestSetBodyDTO
  ) {
    return this.testSetService.updateTestSet(params.id, body)
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
  @ResponseMessage(M.UPDATE_SUCCESS)
  async updateTestSetWithMeanings(
    @Param() params: GetTestSetByIdParamsDTO,
    @Body() body: UpdateTestSetWithMeaningsBodyDTO
  ) {
    return this.testSetService.updateTestSetWithMeanings(params.id, body)
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
  @ResponseMessage(M.DELETE_SUCCESS)
  async deleteTestSet(@Param() params: GetTestSetByIdParamsDTO) {
    return this.testSetService.deleteTestSet(params.id)
  }
}
