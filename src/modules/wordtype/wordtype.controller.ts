import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { I18nService } from '@/i18n/i18n.service'
import { WordTypeMessage } from '@/i18n/message-keys'
import { WordTypeService } from './wordtype.service'
import {
  CreateWordTypeBodyDTO,
  UpdateWordTypeBodyDTO,
  WordTypeResDTO,
  GetWordTypeListQueryDTO,
  GetWordTypeByIdParamsDTO,
  CreateWordTypeSwaggerDTO,
  UpdateWordTypeSwaggerDTO,
  WordTypeSwaggerResponseDTO,
  WordTypeListSwaggerResponseDTO,
  GetWordTypeListQuerySwaggerDTO,
  WordTypeListResDTO
} from './dto/wordtype.dto'
import { AuthenticationGuard } from '@/common/guards/authentication.guard'
import { PaginationResponseSchema } from '@/shared/models/response.model'

@ApiTags('WordType')
@Controller('wordtype')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class WordTypeController {
  // The service returns the word types; the message is the HTTP layer's
  // (statusCode is set by TransformInterceptor from the HTTP status)
  constructor(
    private readonly wordTypeService: WordTypeService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách loại từ với phân trang và tìm kiếm' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách loại từ thành công',
    type: WordTypeListSwaggerResponseDTO
  })
  @ApiQuery({ type: GetWordTypeListQuerySwaggerDTO })
  @ZodSerializerDto(WordTypeListResDTO)
  async findAll(@Query() query: GetWordTypeListQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(WordTypeMessage.GET_LIST_SUCCESS, lang),
      data: await this.wordTypeService.findAll(query, lang)
    }
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Lấy thống kê loại từ',
    description: 'Lấy thống kê tổng quan về loại từ'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thống kê thành công'
  })
  @ApiResponse({
    status: 401,
    description: 'Không có quyền truy cập'
  })
  async getStats(@I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(WordTypeMessage.GET_STATS_SUCCESS, lang),
      data: await this.wordTypeService.getStats()
    }
  }

  @Get('name-key/:nameKey')
  @ApiOperation({
    summary: 'Lấy loại từ theo nameKey',
    description: 'Lấy loại từ theo nameKey cụ thể'
  })
  @ApiParam({
    name: 'nameKey',
    description: 'Name key của loại từ',
    example: 'wordtype.noun.name'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy loại từ theo nameKey thành công',
    type: WordTypeSwaggerResponseDTO
  })
  @ApiResponse({
    status: 401,
    description: 'Không có quyền truy cập'
  })
  @ZodSerializerDto(WordTypeResDTO)
  async findByNameKey(@Param('nameKey') nameKey: string, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(WordTypeMessage.GET_SUCCESS, lang),
      data: await this.wordTypeService.findByNameKey(nameKey)
    }
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy loại từ theo ID',
    description: 'Lấy thông tin chi tiết của một loại từ'
  })
  @ApiParam({
    name: 'id',
    description: 'ID của loại từ',
    example: 1
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy loại từ thành công',
    type: WordTypeSwaggerResponseDTO
  })
  @ApiResponse({
    status: 404,
    description: 'Loại từ không tồn tại'
  })
  @ApiResponse({
    status: 401,
    description: 'Không có quyền truy cập'
  })
  @ZodSerializerDto(WordTypeResDTO)
  async findById(@Param() params: GetWordTypeByIdParamsDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(WordTypeMessage.GET_SUCCESS, lang),
      data: await this.wordTypeService.findById(params.id)
    }
  }

  @Post()
  @ApiOperation({
    summary: 'Tạo loại từ mới',
    description: 'Tạo một loại từ mới trong hệ thống'
  })
  @ApiBody({
    type: CreateWordTypeSwaggerDTO,
    description: 'Dữ liệu loại từ mới'
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo loại từ thành công',
    type: WordTypeSwaggerResponseDTO
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu loại từ không hợp lệ'
  })
  @ApiResponse({
    status: 409,
    description: 'Loại từ với nameKey này đã tồn tại'
  })
  @ApiResponse({
    status: 401,
    description: 'Không có quyền truy cập'
  })
  @ZodSerializerDto(WordTypeResDTO)
  async create(@Body() body: CreateWordTypeBodyDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(WordTypeMessage.CREATE_SUCCESS, lang),
      data: await this.wordTypeService.create(body)
    }
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Cập nhật loại từ',
    description: 'Cập nhật thông tin của một loại từ'
  })
  @ApiParam({
    name: 'id',
    description: 'ID của loại từ',
    example: 1
  })
  @ApiBody({
    type: UpdateWordTypeSwaggerDTO,
    description: 'Dữ liệu cập nhật loại từ'
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật loại từ thành công',
    type: WordTypeSwaggerResponseDTO
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu loại từ không hợp lệ'
  })
  @ApiResponse({
    status: 404,
    description: 'Loại từ không tồn tại'
  })
  @ApiResponse({
    status: 409,
    description: 'Loại từ với nameKey này đã tồn tại'
  })
  @ApiResponse({
    status: 401,
    description: 'Không có quyền truy cập'
  })
  @ZodSerializerDto(WordTypeResDTO)
  async update(
    @Param() params: GetWordTypeByIdParamsDTO,
    @Body() body: UpdateWordTypeBodyDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(WordTypeMessage.UPDATE_SUCCESS, lang),
      data: await this.wordTypeService.update(params.id, body)
    }
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa loại từ',
    description: 'Xóa một loại từ khỏi hệ thống'
  })
  @ApiParam({
    name: 'id',
    description: 'ID của loại từ',
    example: 1
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa loại từ thành công'
  })
  @ApiResponse({
    status: 404,
    description: 'Loại từ không tồn tại'
  })
  @ApiResponse({
    status: 401,
    description: 'Không có quyền truy cập'
  })
  async delete(@Param() params: GetWordTypeByIdParamsDTO, @I18nLang() lang: string) {
    await this.wordTypeService.delete(params.id)
    return { message: this.i18nService.translate(WordTypeMessage.DELETE_SUCCESS, lang) }
  }

  @Post('seed-defaults')
  @ApiOperation({
    summary: 'Tạo loại từ mặc định',
    description: 'Tạo các loại từ mặc định nếu chưa có'
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo loại từ mặc định thành công'
  })
  @ApiResponse({
    status: 401,
    description: 'Không có quyền truy cập'
  })
  async createDefaultWordTypes(@I18nLang() lang: string) {
    await this.wordTypeService.createDefaultWordTypes()
    return {
      message: this.i18nService.translate(WordTypeMessage.CREATE_DEFAULT_SUCCESS, lang)
    }
  }
}
