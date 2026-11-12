import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import {
  CreateTestSetQuestionBankBodyDTO,
  UpdateTestSetQuestionBankBodyDTO,
  CreateMultipleTestSetQuestionBankBodyDTO,
  GetTestSetQuestionBankByIdParamsDTO,
  GetTestSetQuestionBankByTestSetIdParamsDTO,
  UpdateQuestionOrderDTO,
  DeleteManyTestSetQuestionBankBodyDTO
} from './dto/testset-questionbank.zod-dto'
import {
  CreateTestSetQuestionBankSwaggerDTO,
  UpdateTestSetQuestionBankSwaggerDTO,
  UpdateQuestionOrderSwaggerDTO,
  TestSetQuestionBankResponseSwaggerDTO,
  TestSetQuestionBankListResponseSwaggerDTO,
  CreateMultipleTestSetQuestionBankSwaggerDTO,
  CreateMultipleTestSetQuestionBankResponseSwaggerDTO,
  DeleteManyTestSetQuestionBankSwaggerDTO
} from './dto/testset-questionbank.dto'
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
  Res
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { Response } from 'express'
import { TestSetQuestionBankService } from './testset-questionbank.service'

@ApiTags('TestSetQuestionBank')
@Controller('testset-questionbank')
export class TestSetQuestionBankController {
  constructor(private readonly testSetQuestionBankService: TestSetQuestionBankService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tạo liên kết TestSet và QuestionBank',
    description: 'Tạo liên kết giữa một TestSet và một QuestionBank"'
  })
  @ApiBody({
    type: CreateTestSetQuestionBankSwaggerDTO,
    description:
      'Tạo liên kết giữa TestSet và QuestionBank. Hệ thống sẽ tự động kiểm tra tính tương thích giữa testsetType và questionType.' +
      '\n\nQuy tắc tương thích:' +
      '\n• Nếu testsetType = GENERAL → Cho phép mọi questionType' +
      '\n• Nếu testsetType ≠ GENERAL → testsetType phải khớp với questionType' +
      '\n\nQuy tắc Level:' +
      '\n• Nếu TestSet không có levelN (null hoặc 0) → Cho phép mọi levelN' +
      '\n• Nếu testsetType = GENERAL → QuestionBank levelN ≤ TestSet levelN' +
      '\n• Nếu testsetType ≠ GENERAL → QuestionBank levelN = TestSet levelN' +
      '\n\nCác loại có sẵn: VOCABULARY | GRAMMAR | KANJI | LISTENING | READING | SPEAKING | GENERAL'
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo liên kết thành công',
    type: TestSetQuestionBankResponseSwaggerDTO
  })
  create(@Body() body: CreateTestSetQuestionBankBodyDTO, @I18nLang() lang: string) {
    return this.testSetQuestionBankService.create(body, lang)
  }

  @Post('multiple')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tạo liên kết TestSet và nhiều QuestionBank',
    description: 'Tạo liên kết giữa một TestSet và nhiều QuestionBank cùng lúc'
  })
  @ApiBody({
    type: CreateMultipleTestSetQuestionBankSwaggerDTO,
    description:
      'Tạo liên kết giữa TestSet và nhiều QuestionBank cùng lúc. Hệ thống sẽ tự động kiểm tra tính tương thích giữa testsetType và questionType cho từng QuestionBank.' +
      '\n\nQuy tắc tương thích:' +
      '\n• Nếu testsetType = GENERAL → Cho phép mọi questionType' +
      '\n• Nếu testsetType ≠ GENERAL → testsetType phải khớp với questionType' +
      '\n\nQuy tắc Level:' +
      '\n• Nếu TestSet có levelN = 0 → Cho phép mọi levelN' +
      '\n• Nếu testsetType = GENERAL và levelN ≠ 0 → QuestionBank levelN ≤ TestSet levelN' +
      '\n• Nếu testsetType ≠ GENERAL và levelN ≠ 0 → QuestionBank levelN = TestSet levelN' +
      '\n\nAuto-calculation:' +
      '\n• questionOrder sẽ tự động tăng lên dựa trên số câu hỏi hiện có trong TestSet' +
      '\n• Các QuestionBank sẽ được thêm theo thứ tự trong mảng' +
      '\n\nResponse sẽ bao gồm:' +
      '\n• Danh sách các liên kết tạo thành công' +
      '\n• Danh sách các QuestionBank không thể tạo (với lý do)' +
      '\n• Thống kê tổng quan' +
      '\n\nCác loại có sẵn: VOCABULARY | GRAMMAR | KANJI | LISTENING | READING | SPEAKING | GENERAL'
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo liên kết thành công',
    type: CreateMultipleTestSetQuestionBankResponseSwaggerDTO
  })
  async createMultiple(
    @Body() body: CreateMultipleTestSetQuestionBankBodyDTO,
    @I18nLang() lang: string,
    @Res() res: Response
  ) {
    // 201 all linked, 207 some, 400 none: the status is part of the result
    const result = await this.testSetQuestionBankService.createMultiple(body, lang)
    res.status(result.statusCode).json(result)
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy thông tin TestSetQuestionBank theo ID',
    description: 'Lấy thông tin chi tiết của một liên kết TestSet và QuestionBank'
  })
  @ApiParam({
    name: 'id',
    description: 'ID của TestSetQuestionBank',
    example: 1
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin thành công',
    type: TestSetQuestionBankResponseSwaggerDTO
  })
  findById(
    @Param() params: GetTestSetQuestionBankByIdParamsDTO,
    @I18nLang() lang: string
  ) {
    return this.testSetQuestionBankService.findById(params.id, lang)
  }

  @Get('testset/:testSetId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy danh sách TestSetQuestionBank theo TestSet ID',
    description: 'Lấy tất cả liên kết TestSet và QuestionBank của một TestSet cụ thể'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
    type: TestSetQuestionBankListResponseSwaggerDTO
  })
  findByTestSetId(
    @Param() params: GetTestSetQuestionBankByTestSetIdParamsDTO,
    @I18nLang() lang: string
  ) {
    return this.testSetQuestionBankService.findByTestSetId(params.testSetId, lang)
  }

  @Get('testset/:testSetId/full')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy danh sách TestSetQuestionBank',
    description: 'Trả về các liên kết cùng dữ liệu QuestionBank'
  })
  findFullByTestSetId(
    @Param() params: GetTestSetQuestionBankByTestSetIdParamsDTO,
    @I18nLang() lang: string
  ) {
    return this.testSetQuestionBankService.getFullByTestSetId(params.testSetId, lang)
  }

  @Get('testset/:testSetId/full-with-answer')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Lấy danh sách TestSetQuestionBank kèm QuestionBank và Answers với translations theo ngôn ngữ',
    description:
      'Trả về các liên kết cùng dữ liệu QuestionBank và Answers với translations theo ngôn ngữ'
  })
  findFullWithAnswerByTestSetId(
    @Param() params: GetTestSetQuestionBankByTestSetIdParamsDTO,
    @I18nLang() lang: string
  ) {
    return this.testSetQuestionBankService.getFullWithAnswerByTestSetId(
      params.testSetId,
      lang
    )
  }

  @Delete('delete-many')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa nhiều TestSetQuestionBank theo mảng id' })
  @ApiBody({ type: DeleteManyTestSetQuestionBankSwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Xóa nhiều liên kết thành công',
    schema: {
      example: {
        statusCode: 200,
        data: { deletedCount: 3 },
        message: 'Xóa TestSetQuestionBank thành công'
      }
    }
  })
  deleteMany(
    @Body() body: DeleteManyTestSetQuestionBankBodyDTO,
    @I18nLang() lang: string
  ) {
    return this.testSetQuestionBankService.deleteMany(body, lang)
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cập nhật TestSetQuestionBank',
    description: 'Cập nhật thông tin liên kết giữa TestSet và QuestionBank'
  })
  @ApiBody({
    type: UpdateTestSetQuestionBankSwaggerDTO,
    description: 'Dữ liệu cập nhật TestSetQuestionBank'
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
    type: TestSetQuestionBankResponseSwaggerDTO
  })
  update(
    @Param() params: GetTestSetQuestionBankByIdParamsDTO,
    @Body() body: UpdateTestSetQuestionBankBodyDTO,
    @I18nLang() lang: string
  ) {
    return this.testSetQuestionBankService.update(params.id, body, lang)
  }

  @Put(':id/question-order')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cập nhật thứ tự câu hỏi',
    description: 'Cập nhật thứ tự hiển thị của câu hỏi trong TestSet'
  })
  @ApiParam({
    name: 'id',
    description: 'ID của TestSetQuestionBank',
    example: 1
  })
  @ApiBody({
    type: UpdateQuestionOrderSwaggerDTO,
    description: 'Thứ tự mới của câu hỏi'
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thứ tự thành công',
    type: TestSetQuestionBankResponseSwaggerDTO
  })
  updateQuestionOrder(
    @Param() params: GetTestSetQuestionBankByIdParamsDTO,
    @Body() body: UpdateQuestionOrderDTO,
    @I18nLang() lang: string
  ) {
    return this.testSetQuestionBankService.updateQuestionOrder(
      params.id,
      body.questionOrder,
      lang
    )
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Xóa TestSetQuestionBank',
    description: 'Xóa liên kết giữa TestSet và QuestionBank'
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
    type: TestSetQuestionBankResponseSwaggerDTO
  })
  @HttpCode(HttpStatus.OK)
  delete(@Param() params: GetTestSetQuestionBankByIdParamsDTO, @I18nLang() lang: string) {
    return this.testSetQuestionBankService.delete(params.id, lang)
  }

  @Delete('testset/:testSetId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Xóa tất cả TestSetQuestionBank theo TestSet ID',
    description: 'Xóa tất cả liên kết TestSet và QuestionBank của một TestSet cụ thể'
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
    type: TestSetQuestionBankResponseSwaggerDTO
  })
  @HttpCode(HttpStatus.OK)
  deleteByTestSetId(
    @Param() params: GetTestSetQuestionBankByTestSetIdParamsDTO,
    @I18nLang() lang: string
  ) {
    return this.testSetQuestionBankService.deleteByTestSetId(params.testSetId, lang)
  }
}
