import { I18nService } from '@/i18n/i18n.service'
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
  constructor(
    private readonly testSetService: TestSetService,
    private readonly i18nService: I18nService
  ) {}

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
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    const data = await this.testSetService.upsertTestSetWithQuestionBanks(body, userId)
    // POST: 201 for both (the status is not switched on update)
    return {
      message: this.i18nService.translate(
        body.id ? M.UPDATE_SUCCESS : M.CREATE_SUCCESS,
        lang
      ),
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
  async createTestSetWithMeanings(
    @Body() body: CreateTestSetWithMeaningsBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.CREATE_SUCCESS, lang),
      data: await this.testSetService.createTestSetWithMeanings(body, userId)
    }
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
  async findAll(@Query() query: GetTestSetListQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang),
      data: await this.testSetService.findAll(query)
    }
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
  async findAllBasic(@Query() query: GetTestSetListQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang),
      data: await this.testSetService.findAll(query)
    }
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin bộ đề theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin bộ đề thành công',
    type: TestSetWithQuestionsResponseSwaggerDTO
  })
  async findOne(@Param() params: GetTestSetByIdParamsDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(M.GET_SUCCESS, lang),
      data: await this.testSetService.findOne(params.id, lang)
    }
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
  async findOneWithQuestionBanksFull(
    @Param() params: GetTestSetByIdParamsDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.GET_SUCCESS, lang),
      data: await this.testSetService.findOneWithQuestionBanksFull(params.id)
    }
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
    @Param() params: GetTestSetByIdParamsDTO,
    @Body() body: UpdateTestSetBodyDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.UPDATE_SUCCESS, lang),
      data: await this.testSetService.updateTestSet(params.id, body)
    }
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
    @Param() params: GetTestSetByIdParamsDTO,
    @Body() body: UpdateTestSetWithMeaningsBodyDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.UPDATE_SUCCESS, lang),
      data: await this.testSetService.updateTestSetWithMeanings(params.id, body)
    }
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
    @Param() params: GetTestSetByIdParamsDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.DELETE_SUCCESS, lang),
      data: await this.testSetService.deleteTestSet(params.id)
    }
  }
}
