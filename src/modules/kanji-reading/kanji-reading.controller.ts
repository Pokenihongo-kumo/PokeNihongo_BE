import { ResponseMessage } from '@/i18n/response-message'
import { KanjiReadingMessage } from '@/i18n/message-keys'
import {
  CreateKanjiReadingBodyDTO,
  GetKanjiReadingByIdParamsDTO,
  GetKanjiReadingListQueryDTO,
  GetKanjiReadingsByKanjiIdParamsDTO,
  GetKanjiReadingsByTypeParamsDTO,
  KanjiReadingListResDTO,
  KanjiReadingResDTO,
  UpdateKanjiReadingBodyDTO
} from './dto/kanji-reading.zod-dto'
import {
  GetKanjiReadingListQuerySwaggerDTO,
  CreateKanjiReadingSwaggerDTO,
  UpdateKanjiReadingSwaggerDTO,
  KanjiReadingSwaggerResponseDTO,
  KanjiReadingListSwaggerResponseDTO
} from './dto/kanji-reading.dto'
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
import { KanjiReadingService } from './kanji-reading.service'

@ApiTags('Kanji Reading')
@Controller('kanji-reading')
@ApiBearerAuth()
export class KanjiReadingController {
  constructor(private readonly kanjiReadingService: KanjiReadingService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách cách đọc Kanji',
    description: 'Lấy danh sách tất cả cách đọc Kanji với phân trang và tìm kiếm'
  })
  @ApiQuery({ type: GetKanjiReadingListQuerySwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách cách đọc thành công',
    type: KanjiReadingListSwaggerResponseDTO
  })
  @ZodSerializerDto(KanjiReadingListResDTO)
  @ResponseMessage(KanjiReadingMessage.GET_LIST_SUCCESS)
  async findMany(@Query() query: GetKanjiReadingListQueryDTO) {
    return this.kanjiReadingService.findMany(query)
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Lấy thống kê cách đọc Kanji',
    description: 'Lấy thống kê tổng quan về cách đọc Kanji'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thống kê thành công'
  })
  @ResponseMessage(KanjiReadingMessage.GET_STATS_SUCCESS)
  async getStats() {
    return this.kanjiReadingService.getStats()
  }

  @Get('kanji/:kanjiId')
  @ApiOperation({
    summary: 'Lấy cách đọc theo Kanji ID',
    description: 'Lấy tất cả cách đọc của một Kanji cụ thể'
  })
  @ApiParam({
    name: 'kanjiId',
    description: 'ID của Kanji',
    example: 1
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy cách đọc thành công',
    type: [KanjiReadingSwaggerResponseDTO]
  })
  @ResponseMessage(KanjiReadingMessage.GET_LIST_SUCCESS)
  async findByKanjiId(@Param() params: GetKanjiReadingsByKanjiIdParamsDTO) {
    return this.kanjiReadingService.findByKanjiId(params.kanjiId)
  }

  @Get('type/:readingType')
  @ApiOperation({
    summary: 'Lấy cách đọc theo loại',
    description:
      'Lấy tất cả cách đọc theo loại cụ thể (onyomi, kunyomi, nanori, irregular)'
  })
  @ApiParam({
    name: 'readingType',
    description: 'Loại cách đọc',
    example: 'onyomi',
    enum: ['onyomi', 'kunyomi', 'nanori', 'irregular']
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy cách đọc thành công',
    type: [KanjiReadingSwaggerResponseDTO]
  })
  @ResponseMessage(KanjiReadingMessage.GET_LIST_SUCCESS)
  async findByReadingType(@Param() params: GetKanjiReadingsByTypeParamsDTO) {
    return this.kanjiReadingService.findByReadingType(params.readingType)
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy cách đọc theo ID',
    description: 'Lấy thông tin chi tiết của một cách đọc'
  })
  @ApiParam({
    name: 'id',
    description: 'ID của cách đọc',
    example: 1
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy cách đọc thành công',
    type: KanjiReadingSwaggerResponseDTO
  })
  @ZodSerializerDto(KanjiReadingResDTO)
  @ResponseMessage(KanjiReadingMessage.GET_SUCCESS)
  async findById(@Param() params: GetKanjiReadingByIdParamsDTO) {
    return this.kanjiReadingService.findById(params.id)
  }

  @Post()
  @ApiOperation({
    summary: 'Tạo cách đọc mới',
    description: 'Tạo một cách đọc mới cho Kanji'
  })
  @ApiBody({
    type: CreateKanjiReadingSwaggerDTO,
    description: 'Dữ liệu cách đọc mới'
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo cách đọc thành công',
    type: KanjiReadingSwaggerResponseDTO
  })
  @ZodSerializerDto(KanjiReadingResDTO)
  @ResponseMessage(KanjiReadingMessage.CREATE_SUCCESS)
  async create(@Body() body: CreateKanjiReadingBodyDTO) {
    return this.kanjiReadingService.createReading(body)
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Cập nhật cách đọc',
    description: 'Cập nhật thông tin của một cách đọc'
  })
  @ApiParam({
    name: 'id',
    description: 'ID của cách đọc',
    example: 1
  })
  @ApiBody({
    type: UpdateKanjiReadingSwaggerDTO,
    description: 'Dữ liệu cập nhật cách đọc'
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật cách đọc thành công',
    type: KanjiReadingSwaggerResponseDTO
  })
  @ZodSerializerDto(KanjiReadingResDTO)
  @ResponseMessage(KanjiReadingMessage.UPDATE_SUCCESS)
  async update(
    @Param() params: GetKanjiReadingByIdParamsDTO,
    @Body() body: UpdateKanjiReadingBodyDTO
  ) {
    return this.kanjiReadingService.updateReading(params.id, body)
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa cách đọc',
    description: 'Xóa một cách đọc khỏi hệ thống'
  })
  @ApiParam({
    name: 'id',
    description: 'ID của cách đọc',
    example: 1
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa cách đọc thành công'
  })
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(KanjiReadingMessage.DELETE_SUCCESS)
  async delete(@Param() params: GetKanjiReadingByIdParamsDTO) {
    await this.kanjiReadingService.delete(params.id)
  }

  @Delete('kanji/:kanjiId')
  @ApiOperation({
    summary: 'Xóa tất cả cách đọc của Kanji',
    description: 'Xóa tất cả cách đọc của một Kanji cụ thể'
  })
  @ApiParam({
    name: 'kanjiId',
    description: 'ID của Kanji',
    example: 1
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa cách đọc thành công'
  })
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(KanjiReadingMessage.DELETE_SUCCESS)
  async deleteByKanjiId(@Param() params: GetKanjiReadingsByKanjiIdParamsDTO) {
    await this.kanjiReadingService.deleteByKanjiId(params.kanjiId)
  }

  @Get('stats/reading-types')
  @ApiOperation({
    summary: 'Lấy thống kê loại cách đọc',
    description: 'Lấy thống kê số lượng cách đọc theo từng loại'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thống kê loại cách đọc thành công'
  })
  @ResponseMessage(KanjiReadingMessage.GET_STATS_SUCCESS)
  async getReadingTypeStats() {
    return this.kanjiReadingService.getReadingTypeStats()
  }
}
