import { ActiveUser } from '@/common/decorators/active-user.decorator'
import {
  UpdateQuestionBankWithMeaningsBodyDTO,
  CreateQuestionBankWithAnswersBodyDTO,
  GetQuestionBankByIdParamsDTO,
  GetQuestionBankListQueryDTO,
  GetQuestionBanksByIdsQueryDTO,
  QuestionBankResDTO,
  BulkDeleteQuestionBankBodyDTO
} from '@/modules/question-bank/dto/question-bank.zod-dto'
import {
  QuestionBankResponseSwaggerDTO,
  QuestionBankListResponseSwaggerDTO,
  GetQuestionBankListQuerySwaggerDTO,
  GetQuestionBanksByIdsQuerySwaggerDTO,
  UpdateQuestionBankWithMeaningsSwaggerDTO,
  CreateQuestionBankWithAnswersSwaggerDTO,
  CreateQuestionBankWithAnswersResponseSwaggerDTO,
  BulkDeleteQuestionBankSwaggerDTO
} from '@/modules/question-bank/dto/question-bank.dto'
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
  Query,
  Res
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { Response } from 'express'
import { ZodSerializerDto } from 'nestjs-zod'
import { QuestionBankService } from './question-bank.service'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'

@ApiTags('Question Bank')
@Controller('question-bank')
export class QuestionBankController {
  constructor(private readonly questionBankService: QuestionBankService) {}

  @Post('with-answers')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tạo câu hỏi mới với 4 câu trả lời cùng lúc',
    description: `Tạo câu hỏi mới với tối đa 4 câu trả lời cùng lúc. Hệ thống sẽ tự động tạo question bank và các câu trả lời tương ứng.
        
**Quy tắc đặc biệt:**
- **MATCHING type**: Chỉ cho phép tạo 1 answer duy nhất và bắt buộc isCorrect = true
- **Các loại khác**: Tối đa 4 answers, chỉ có 1 answer được phép có isCorrect = true
- **audioUrl**: Optional - chỉ khi questionType là LISTENING và không truyền thì hệ thống sẽ tự động gen text-to-speech từ questionJp
- **SPEAKING**: Bắt buộc phải có pronunciation (cách phát âm romaji)
- **Validation**: Tất cả answers phải là tiếng Nhật hợp lệ

**Loại câu hỏi hỗ trợ:** VOCABULARY, GRAMMAR, KANJI, LISTENING, READING, SPEAKING, MATCHING

**Response:** Trả về thông tin câu hỏi đã tạo, danh sách answers thành công, số lượng tạo thành công/thất bại và chi tiết lỗi nếu có.`
  })
  @ApiBody({ type: CreateQuestionBankWithAnswersSwaggerDTO })
  @ApiResponse({
    status: 201,
    description: 'Tạo câu hỏi và câu trả lời thành công',
    type: CreateQuestionBankWithAnswersResponseSwaggerDTO
  })
  async createWithAnswers(
    @Body() body: CreateQuestionBankWithAnswersBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string,
    @Res() res: Response
  ) {
    // 201 all answers saved, 207 some, 400 none: the status is part of the result
    const result = await this.questionBankService.createWithAnswers(body, userId, lang)
    res.status(result.statusCode).json(result)
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách câu hỏi với phân trang và lọc' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách câu hỏi thành công',
    type: QuestionBankListResponseSwaggerDTO
  })
  @ApiQuery({ type: GetQuestionBankListQuerySwaggerDTO })
  findAll(@Query() query: GetQuestionBankListQueryDTO, @I18nLang() lang: string) {
    return this.questionBankService.findAll(query, lang)
  }

  @Get('by-ids')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin nhiều câu hỏi theo mảng IDs với translation' })
  @ApiQuery({ type: GetQuestionBanksByIdsQuerySwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin câu hỏi thành công',
    type: QuestionBankListResponseSwaggerDTO
  })
  findByIds(@Query() query: GetQuestionBanksByIdsQueryDTO, @I18nLang() lang: string) {
    return this.questionBankService.findByIds(query.questionIds, lang)
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin câu hỏi theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin câu hỏi thành công',
    type: QuestionBankResponseSwaggerDTO
  })
  @ZodSerializerDto(QuestionBankResDTO)
  findOne(@Param() params: GetQuestionBankByIdParamsDTO, @I18nLang() lang: string) {
    return this.questionBankService.findOne(params.id, lang)
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cập nhật câu hỏi với meanings theo ID',
    description:
      'Cập nhật câu hỏi kèm theo nghĩa và translations. Tất cả fields đều optional.'
  })
  @ApiBody({ type: UpdateQuestionBankWithMeaningsSwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật câu hỏi với meanings thành công',
    type: QuestionBankResponseSwaggerDTO
  })
  updateWithMeanings(
    @Param() params: GetQuestionBankByIdParamsDTO,
    @Body() body: UpdateQuestionBankWithMeaningsBodyDTO,
    @I18nLang() lang: string
  ) {
    return this.questionBankService.updateWithMeanings(params.id, body, lang)
  }

  @Delete('bulk')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xóa nhiều câu hỏi cùng lúc',
    description:
      'Xóa nhiều câu hỏi cùng lúc và tự động xóa translations liên quan. Tối đa 100 câu hỏi mỗi lần.'
  })
  @ApiBody({
    type: BulkDeleteQuestionBankSwaggerDTO,
    description: 'Danh sách ID câu hỏi cần xóa'
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa nhiều câu hỏi thành công',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Xóa thành công 5/5 câu hỏi' },
        data: {
          type: 'object',
          properties: {
            deletedCount: { type: 'number', example: 5 },
            deletedIds: {
              type: 'array',
              items: { type: 'number' },
              example: [1, 2, 3, 4, 5]
            },
            requestedCount: { type: 'number', example: 5 },
            notFoundCount: { type: 'number', example: 0 }
          }
        }
      }
    }
  })
  removeMany(@Body() body: BulkDeleteQuestionBankBodyDTO, @I18nLang() lang: string) {
    return this.questionBankService.removeMany(body.ids, lang)
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa câu hỏi theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Xóa câu hỏi thành công',
    type: QuestionBankResponseSwaggerDTO
  })
  @ZodSerializerDto(QuestionBankResDTO)
  remove(@Param() params: GetQuestionBankByIdParamsDTO, @I18nLang() lang: string) {
    return this.questionBankService.remove(params.id, lang)
  }
}
