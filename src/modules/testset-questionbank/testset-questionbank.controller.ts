import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import {
  CreateTestSetQuestionBankBodyDTO,
  UpdateTestSetQuestionBankBodyDTO,
  GetTestSetQuestionBankByIdParamsDTO,
  GetTestSetQuestionBankByTestSetIdParamsDTO,
  UpdateQuestionOrderDTO,
  TestSetQuestionBankResDTO,
  TestSetQuestionBankListResDTO
} from './dto/testset-questionbank.zod-dto'
import {
  CreateTestSetQuestionBankBodyType,
  UpdateTestSetQuestionBankBodyType,
  GetTestSetQuestionBankByIdParamsType,
  GetTestSetQuestionBankByTestSetIdParamsType,
  UpdateQuestionOrderType,
  CreateMultipleTestSetQuestionBankBodyType,
  DeleteManyTestSetQuestionBankBodyType
} from './entities/testset-questionbank.entities'
import {
  TestSetQuestionBankSwaggerDTO,
  CreateTestSetQuestionBankSwaggerDTO,
  UpdateTestSetQuestionBankSwaggerDTO,
  UpdateQuestionOrderSwaggerDTO,
  TestSetQuestionBankResponseSwaggerDTO,
  TestSetQuestionBankListResponseSwaggerDTO,
  CreateMultipleTestSetQuestionBankSwaggerDTO,
  CreateMultipleTestSetQuestionBankResponseSwaggerDTO,
  DeleteManyTestSetQuestionBankSwaggerDTO
} from './dto/testset-questionbank.dto'
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
// no need to import DTO class for type annotation

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
      '\n• Nếu testsetType = GENERAL → QuestionBank levelN ≤ TestSet levelN' +
      '\n• Nếu testsetType ≠ GENERAL → QuestionBank levelN = TestSet levelN' +
      '\n\nCác loại có sẵn: VOCABULARY | GRAMMAR | KANJI | LISTENING | READING | SPEAKING | GENERAL'
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo liên kết thành công',
    type: TestSetQuestionBankResponseSwaggerDTO
  })
  async create(
    @Body() body: CreateTestSetQuestionBankBodyType,
    @ActiveUser('userId') userId: number
  ): Promise<MessageResDTO> {
    return this.testSetQuestionBankService.create(body)
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
    @Body() body: CreateMultipleTestSetQuestionBankBodyType,
    @ActiveUser('userId') userId: number,
    @Res() res: Response
  ): Promise<MessageResDTO> {
    const result = await this.testSetQuestionBankService.createMultiple(body)
    return res.status(result.statusCode).json(result) as any
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
  async findById(@Param('id') id: string): Promise<TestSetQuestionBankSwaggerDTO> {
    return this.testSetQuestionBankService.findById(Number(id))
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
  async findByTestSetId(@Param('testSetId') testSetId: string): Promise<MessageResDTO> {
    return this.testSetQuestionBankService.findByTestSetId(Number(testSetId))
  }

  //KUMO lấy testset và questionbank kèm theo answer theo header và tralation như đã làm bên userExercies
  @Get('testset/:testSetId/full')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy danh sách TestSetQuestionBank',
    description: 'Trả về các liên kết cùng dữ liệu QuestionBank'
  })
  async findFullByTestSetId(
    @Param('testSetId') testSetId: string
  ): Promise<MessageResDTO> {
    return this.testSetQuestionBankService.findFullByTestSetId(Number(testSetId))
  }

  @Get('testset/:testSetId/full-with-answer')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Lấy danh sách TestSetQuestionBank kèm QuestionBank và Answers với translations theo ngôn ngữ',
    description:
      'Trả về các liên kết cùng dữ liệu QuestionBank và Answers với translations theo ngôn ngữ'
  })
  async findFullWithAnswerByTestSetId(
    @Param('testSetId') testSetId: string,
    @I18nLang() languageCode: string
  ): Promise<MessageResDTO> {
    return this.testSetQuestionBankService.findFullWithAnswerByTestSetId(
      Number(testSetId),
      languageCode
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
  deleteMany(@Body() body: DeleteManyTestSetQuestionBankBodyType) {
    return this.testSetQuestionBankService.deleteMany(body)
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
  async update(
    @Param('id') id: string,
    @Body() body: UpdateTestSetQuestionBankBodyType
  ): Promise<MessageResDTO> {
    return this.testSetQuestionBankService.update(Number(id), body)
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
  async updateQuestionOrder(
    @Param() params: GetTestSetQuestionBankByIdParamsType,
    @Body() body: UpdateQuestionOrderType
  ): Promise<MessageResDTO> {
    return this.testSetQuestionBankService.updateQuestionOrder(
      params.id,
      body.questionOrder
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
  async delete(@Param('id') id: string): Promise<MessageResDTO> {
    return this.testSetQuestionBankService.delete(Number(id))
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
  async deleteByTestSetId(@Param('testSetId') testSetId: string): Promise<MessageResDTO> {
    return this.testSetQuestionBankService.deleteByTestSetId(Number(testSetId))
  }
}
