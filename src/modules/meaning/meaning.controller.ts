import { I18nService } from '@/i18n/i18n.service'
import { MeaningMessage } from '@/i18n/message-keys'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import {
  CreateMeaningBodyDTO,
  GetMeaningByIdParamsDTO,
  GetMeaningListQueryDTO,
  GetMeaningsByVocabularyParamsDTO,
  MeaningListResDTO,
  MeaningResDTO,
  UpdateMeaningBodyDTO
} from './dto/meaning.zod-dto'
import {
  CreateMeaningSwaggerDTO,
  UpdateMeaningSwaggerDTO,
  MeaningSwaggerResponseDTO,
  MeaningListSwaggerResponseDTO
} from './dto/meaning.dto'
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
import { MeaningService } from './meaning.service'

@ApiTags('Meaning')
@Controller('meaning')
export class MeaningController {
  constructor(
    private readonly meaningService: MeaningService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy danh sách nghĩa',
    description: 'Lấy danh sách nghĩa với phân trang và tìm kiếm'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Trang hiện tại',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Số lượng nghĩa mỗi trang',
    example: 10
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Tìm kiếm theo key hoặc câu ví dụ'
  })
  @ApiQuery({
    name: 'vocabularyId',
    required: false,
    description: 'Lọc theo ID từ vựng'
  })
  @ApiQuery({
    name: 'wordTypeId',
    required: false,
    description: 'Lọc theo ID loại từ'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách nghĩa thành công',
    type: MeaningListSwaggerResponseDTO
  })
  @ZodSerializerDto(MeaningListResDTO)
  async findMany(@Query() query: GetMeaningListQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(MeaningMessage.GET_LIST_SUCCESS, lang),
      data: await this.meaningService.findMany(query)
    }
  }

  @Get(':vocabularyId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy tất cả nghĩa theo từ vựng',
    description: 'Lấy toàn bộ nghĩa của một từ vựng theo vocabularyId'
  })
  @ApiParam({
    name: 'vocabularyId',
    description: 'ID của từ vựng',
    example: 1
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy tất cả nghĩa theo từ vựng thành công',
    type: [MeaningSwaggerResponseDTO]
  })
  async findByVocabularyId(
    @Param() params: GetMeaningsByVocabularyParamsDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(MeaningMessage.GET_SUCCESS, lang),
      data: await this.meaningService.getByVocabularyId(params.vocabularyId)
    }
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tạo nghĩa mới',
    description: 'Tạo một nghĩa mới cho từ vựng'
  })
  @ApiBody({
    type: CreateMeaningSwaggerDTO,
    description: 'Dữ liệu nghĩa mới'
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo nghĩa thành công',
    type: MeaningSwaggerResponseDTO
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu nghĩa không hợp lệ'
  })
  @ZodSerializerDto(MeaningResDTO)
  async create(@Body() body: CreateMeaningBodyDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(MeaningMessage.CREATE_SUCCESS, lang),
      data: await this.meaningService.createMeaning(body)
    }
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cập nhật nghĩa',
    description: 'Cập nhật thông tin của một nghĩa'
  })
  @ApiParam({
    name: 'id',
    description: 'ID của nghĩa',
    example: 1
  })
  @ApiBody({
    type: UpdateMeaningSwaggerDTO,
    description: 'Dữ liệu cập nhật nghĩa'
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật nghĩa thành công',
    type: MeaningSwaggerResponseDTO
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu nghĩa không hợp lệ'
  })
  @ApiResponse({
    status: 404,
    description: 'Nghĩa không tồn tại'
  })
  @ZodSerializerDto(MeaningResDTO)
  async update(
    @Param() params: GetMeaningByIdParamsDTO,
    @Body() body: UpdateMeaningBodyDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(MeaningMessage.UPDATE_SUCCESS, lang),
      data: await this.meaningService.update(params.id, body)
    }
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Xóa nghĩa',
    description: 'Xóa một nghĩa khỏi hệ thống'
  })
  @ApiParam({
    name: 'id',
    description: 'ID của nghĩa',
    example: 1
  })
  @ApiResponse({
    status: 204,
    description: 'Xóa nghĩa thành công'
  })
  @ApiResponse({
    status: 404,
    description: 'Nghĩa không tồn tại'
  })
  delete(@Param() params: GetMeaningByIdParamsDTO) {
    return this.meaningService.delete(params.id)
  }

  @Delete('by-vocabulary/:vocabularyId')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Xóa tất cả nghĩa theo từ vựng',
    description: 'Xóa tất cả nghĩa của một từ vựng'
  })
  @ApiParam({
    name: 'vocabularyId',
    description: 'ID của từ vựng',
    example: 1
  })
  @ApiResponse({
    status: 204,
    description: 'Xóa tất cả nghĩa theo từ vựng thành công'
  })
  async deleteByVocabularyId(@Param() params: GetMeaningsByVocabularyParamsDTO) {
    await this.meaningService.deleteByVocabularyId(params.vocabularyId)
  }
}
