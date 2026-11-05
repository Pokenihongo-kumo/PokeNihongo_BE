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
import { AccessTokenGuard } from '@/common/guards/access-token.guard'
import { PaginationResponseSchema } from '@/shared/models/response.model'

@ApiTags('WordType')
@Controller('wordtype')
@UseGuards(AuthenticationGuard, AccessTokenGuard)
@ApiBearerAuth()
export class WordTypeController {
  constructor(private readonly wordTypeService: WordTypeService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách loại từ với phân trang và tìm kiếm' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách loại từ thành công',
    type: WordTypeListSwaggerResponseDTO
  })
  @ApiQuery({ type: GetWordTypeListQuerySwaggerDTO })
  @ZodSerializerDto(WordTypeListResDTO)
  findAll(@Query() query: GetWordTypeListQueryDTO, @I18nLang() lang: string) {
    return this.wordTypeService.findAll(query, lang)
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
  getStats(@I18nLang() lang: string) {
    return this.wordTypeService.getStats(lang)
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
  findByNameKey(@Param('nameKey') nameKey: string, @I18nLang() lang: string) {
    return this.wordTypeService.findByNameKey(nameKey, lang)
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
  findById(@Param() params: GetWordTypeByIdParamsDTO, @I18nLang() lang: string) {
    return this.wordTypeService.findById(params.id, lang)
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
  create(@Body() body: CreateWordTypeBodyDTO, @I18nLang() lang: string) {
    return this.wordTypeService.create(body, lang)
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
  update(
    @Param() params: GetWordTypeByIdParamsDTO,
    @Body() body: UpdateWordTypeBodyDTO,
    @I18nLang() lang: string
  ) {
    return this.wordTypeService.update(params.id, body, lang)
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
  delete(@Param() params: GetWordTypeByIdParamsDTO, @I18nLang() lang: string) {
    return this.wordTypeService.delete(params.id, lang)
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
  createDefaultWordTypes(@I18nLang() lang: string) {
    return this.wordTypeService.createDefaultWordTypes(lang)
  }
}
