import { I18nService } from '@/i18n/i18n.service'
import { AnswerMessage } from '@/i18n/message-keys'
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
import { AuthenticationGuard } from '@/common/guards/authentication.guard'
import { UseGuards } from '@nestjs/common'
import { AnswerService } from './answer.service'
import {
  CreateAnswerBodyDTO,
  CreateMultipleAnswersBodyDTO,
  UpdateAnswerBodyDTO,
  GetAnswerByIdParamsDTO,
  GetAnswerListQueryDTO,
  AnswerResponseDTO,
  AnswerListResDTO,
  CreateMultipleAnswersResponseDTO
} from './dto/answer.zod-dto'
import {
  AnswerResponseSwaggerDTO,
  AnswerListResponseSwaggerDTO,
  CreateAnswerSwaggerDTO,
  CreateMultipleAnswersSwaggerDTO,
  CreateMultipleAnswersResponseSwaggerDTO,
  UpdateAnswerSwaggerDTO,
  GetAnswerListQuerySwaggerDTO
} from './dto/answer.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'

// 400 nothing saved, 207 some failed, 200 with updates, 201 created only
function summaryOf({
  created,
  updated,
  failed
}: {
  created: number
  updated: number
  failed: number
}): { statusCode: number; key: string } {
  if (created + updated === 0) {
    return { statusCode: 400, key: AnswerMessage.MULTIPLE_NONE_SAVED }
  }
  if (failed > 0) {
    const key =
      created > 0 && updated > 0
        ? AnswerMessage.MULTIPLE_CREATED_UPDATED_FAILED
        : created > 0
          ? AnswerMessage.MULTIPLE_CREATED_FAILED
          : AnswerMessage.MULTIPLE_UPDATED_FAILED
    return { statusCode: 207, key }
  }
  if (updated > 0) return { statusCode: 200, key: AnswerMessage.MULTIPLE_CREATED_UPDATED }
  return { statusCode: 201, key: AnswerMessage.MULTIPLE_CREATED }
}

@ApiTags('Answers')
@Controller('answers')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class AnswerController {
  constructor(
    private readonly answerService: AnswerService,
    private readonly i18nService: I18nService
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Tạo câu trả lời mới',
    description:
      'Tạo câu trả lời mới cho câu hỏi. Hệ thống sẽ kiểm tra loại câu hỏi và áp dụng quy tắc tương ứng.' +
      '\n\nQuy tắc đặc biệt:' +
      '\n• MATCHING type: Chỉ cho phép tạo 1 answer duy nhất' +
      '\n• Các loại khác: Không giới hạn số lượng answer'
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo câu trả lời thành công',
    type: AnswerResponseSwaggerDTO
  })
  @ApiBody({ type: CreateAnswerSwaggerDTO })
  @ZodSerializerDto(AnswerResponseDTO)
  async createAnswer(@Body() body: CreateAnswerBodyDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(AnswerMessage.CREATE_SUCCESS, lang),
      data: await this.answerService.createAnswer(body)
    }
  }

  @Post('multiple')
  @ApiOperation({
    summary: 'Tạo hoặc cập nhật nhiều câu trả lời cùng lúc (UPSERT)',
    description:
      'Tạo mới hoặc cập nhật nhiều câu trả lời cho một câu hỏi cùng lúc. Hỗ trợ 2 chiến lược:' +
      '\n\n1️ Update bằng ID (nếu có field "id"):' +
      '\n• Tìm answer theo ID → Update (có thể thay đổi answerJp, isCorrect, translations)' +
      '\n• ID phải thuộc cùng questionBankId' +
      '\n• Cho phép thay đổi answerJp' +
      '\n\n2️ Upsert bằng answerJp (nếu KHÔNG có field "id"):' +
      '\n• Nếu answerJp đã tồn tại → Cập nhật (chỉ update isCorrect, translations)' +
      '\n• Nếu answerJp chưa tồn tại → Tạo mới' +
      '\n• answerJp được dùng làm key, không thể thay đổi khi update' +
      '\n\n Response:' +
      '\n• created: Danh sách answers được tạo mới' +
      '\n• updated: Danh sách answers được cập nhật' +
      '\n• failed: Danh sách answers thất bại kèm lý do' +
      '\n• summary: Tổng kết số lượng' +
      '\n\n Quy tắc:' +
      '\n• MATCHING type: Chỉ 1 answer, bắt buộc isCorrect = true' +
      '\n• Các loại khác: Tối đa 4 answers, chỉ 1 answer có isCorrect = true' +
      '\n• Khi update answer thành correct: Kiểm tra không có answer correct khác'
  })
  @ApiBody({ type: CreateMultipleAnswersSwaggerDTO })
  @ZodSerializerDto(CreateMultipleAnswersResponseDTO)
  async createMultipleAnswers(
    @Body() body: CreateMultipleAnswersBodyDTO,
    @Res() res: Response,
    @I18nLang() lang: string
  ) {
    const data = await this.answerService.createMultiple(body, lang)
    const { statusCode, key } = summaryOf(data.summary)
    const { created, updated, failed } = data.summary
    const message = this.i18nService.translate(key, lang, { created, updated, failed })
    // @Res(): sent as is, past TransformInterceptor
    return res.status(statusCode).json({ statusCode, data, message }) as any
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách câu trả lời với phân trang và tìm kiếm' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách câu trả lời thành công',
    type: AnswerListResponseSwaggerDTO
  })
  @ApiQuery({ type: GetAnswerListQuerySwaggerDTO })
  @ZodSerializerDto(AnswerListResDTO)
  async getAnswerList(@Query() query: GetAnswerListQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(AnswerMessage.GET_LIST_SUCCESS, lang),
      data: await this.answerService.getAnswerList(query)
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin câu trả lời theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin câu trả lời thành công',
    type: AnswerResponseSwaggerDTO
  })
  @ZodSerializerDto(AnswerResponseDTO)
  async getAnswerById(@Param() params: GetAnswerByIdParamsDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(AnswerMessage.GET_SUCCESS, lang),
      data: await this.answerService.getAnswerById(params.id, lang)
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật câu trả lời' })
  @ApiBody({ type: UpdateAnswerSwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật câu trả lời thành công',
    type: AnswerResponseSwaggerDTO
  })
  @ZodSerializerDto(AnswerResponseDTO)
  async updateAnswer(
    @Param() params: GetAnswerByIdParamsDTO,
    @Body() body: UpdateAnswerBodyDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(AnswerMessage.UPDATE_SUCCESS, lang),
      data: await this.answerService.updateAnswer(params.id, body)
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa câu trả lời' })
  @ApiResponse({ status: 204, description: 'Xóa câu trả lời thành công' })
  @ZodSerializerDto(MessageResDTO)
  async deleteAnswer(@Param() params: GetAnswerByIdParamsDTO, @I18nLang() lang: string) {
    await this.answerService.deleteAnswer(params.id)
    return { message: this.i18nService.translate(AnswerMessage.DELETE_SUCCESS, lang) }
  }
}
