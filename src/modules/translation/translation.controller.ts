import { ResponseMessage } from '@/i18n/response-message'
import { TranslationMessage } from '@/i18n/message-keys'
import {
  CreateTranslationBodyDTO,
  CreateTranslationsBodyDTO,
  DeleteTranslationsByKeyParamsDTO,
  GetTranslationByIdParamsDTO,
  GetTranslationListQueryDTO,
  GetTranslationsByKeyQueryDTO,
  GetTranslationsByLanguageQueryDTO,
  UpdateTranslationBodyDTO
} from './dto/translation.zod-dto'
import {
  CreateTranslationSwaggerDTO,
  UpdateTranslationSwaggerDTO,
  TranslationSwaggerResponseDTO,
  TranslationListSwaggerResponseDTO,
  TranslationByKeySwaggerResponseDTO,
  GetTranslationListQuerySwaggerDTO
} from './dto/translation.dto'
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
import { TranslationService } from './translation.service'

@ApiTags('Translation')
@Controller('translation')
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy danh sách bản dịch',
    description: 'Lấy danh sách bản dịch với phân trang và tìm kiếm'
  })
  @ApiQuery({ type: GetTranslationListQuerySwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách bản dịch thành công',
    type: TranslationListSwaggerResponseDTO
  })
  @ResponseMessage(TranslationMessage.GET_LIST_SUCCESS)
  async findMany(@Query() query: GetTranslationListQueryDTO) {
    return this.translationService.findMany(query)
  }

  @Get('by-key')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy tất cả bản dịch theo key',
    description: 'Lấy tất cả bản dịch cho một key cụ thể'
  })
  @ApiQuery({
    name: 'key',
    description: 'Key để lấy tất cả bản dịch',
    example: 'lesson.1.title'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy bản dịch theo key thành công',
    type: TranslationByKeySwaggerResponseDTO
  })
  @ResponseMessage(TranslationMessage.GET_SUCCESS)
  async findByKey(@Query() query: GetTranslationsByKeyQueryDTO) {
    return this.translationService.getByKey(query)
  }

  @Get('by-language')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy tất cả bản dịch theo ngôn ngữ',
    description: 'Lấy tất cả bản dịch cho một ngôn ngữ cụ thể'
  })
  @ApiQuery({
    name: 'languageCode',
    description: 'Mã ngôn ngữ để lấy tất cả bản dịch',
    example: 'vi'
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
    description: 'Số lượng bản dịch mỗi trang',
    example: 10
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy bản dịch theo ngôn ngữ thành công',
    type: TranslationListSwaggerResponseDTO
  })
  @ResponseMessage(TranslationMessage.GET_LIST_SUCCESS)
  async findByLanguage(@Query() query: GetTranslationsByLanguageQueryDTO) {
    return this.translationService.findByLanguage(query)
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy bản dịch theo ID',
    description: 'Lấy thông tin chi tiết của một bản dịch'
  })
  @ApiParam({
    name: 'id',
    description: 'ID của bản dịch',
    example: 1
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy bản dịch thành công',
    type: TranslationSwaggerResponseDTO
  })
  @ApiResponse({
    status: 404,
    description: 'Bản dịch không tồn tại'
  })
  @ResponseMessage(TranslationMessage.GET_SUCCESS)
  async findById(@Param() params: GetTranslationByIdParamsDTO) {
    return this.translationService.getById(params.id)
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tạo bản dịch mới',
    description: 'Tạo một bản dịch mới trong hệ thống'
  })
  @ApiBody({
    type: CreateTranslationSwaggerDTO,
    description: 'Dữ liệu bản dịch mới'
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo bản dịch thành công',
    type: TranslationSwaggerResponseDTO
  })
  @ResponseMessage(TranslationMessage.CREATE_SUCCESS)
  async create(@Body() body: CreateTranslationBodyDTO) {
    return this.translationService.createTranslation(body)
  }

  @Post('bulk')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tạo nhiều bản dịch cùng lúc',
    description: 'Tạo nhiều bản dịch cùng lúc trong hệ thống'
  })
  @ApiBody({
    type: [CreateTranslationSwaggerDTO],
    description: 'Danh sách dữ liệu bản dịch mới'
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo nhiều bản dịch thành công',
    schema: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          description: 'Số lượng bản dịch đã tạo'
        }
      }
    }
  })
  @ResponseMessage(TranslationMessage.CREATE_SUCCESS)
  async createMany(@Body() body: CreateTranslationsBodyDTO) {
    return this.translationService.createTranslations(body)
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cập nhật bản dịch',
    description: 'Cập nhật thông tin của một bản dịch'
  })
  @ApiParam({
    name: 'id',
    description: 'ID của bản dịch',
    example: 1
  })
  @ApiBody({
    type: UpdateTranslationSwaggerDTO,
    description: 'Dữ liệu cập nhật bản dịch'
  })
  @ResponseMessage(TranslationMessage.UPDATE_SUCCESS)
  async update(
    @Param() params: GetTranslationByIdParamsDTO,
    @Body() body: UpdateTranslationBodyDTO
  ) {
    return this.translationService.updateTranslation(params.id, body)
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Xóa bản dịch',
    description: 'Xóa một bản dịch khỏi hệ thống'
  })
  @ApiParam({
    name: 'id',
    description: 'ID của bản dịch',
    example: 1
  })
  delete(@Param() params: GetTranslationByIdParamsDTO) {
    return this.translationService.delete(params.id)
  }

  @Delete('by-key/:key')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Xóa tất cả bản dịch theo key',
    description: 'Xóa tất cả bản dịch cho một key cụ thể'
  })
  @ApiParam({
    name: 'key',
    description: 'Key để xóa tất cả bản dịch',
    example: 'lesson.1.title'
  })
  @ApiResponse({
    status: 204,
    description: 'Xóa tất cả bản dịch theo key thành công'
  })
  async deleteByKey(@Param() params: DeleteTranslationsByKeyParamsDTO) {
    await this.translationService.deleteByKey(params.key)
  }
}
