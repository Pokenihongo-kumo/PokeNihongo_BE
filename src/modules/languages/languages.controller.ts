import { I18nService } from '@/i18n/i18n.service'
import { LanguagesMessage } from '@/i18n/message-keys'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import {
  CreateLanguagesBodyDTO,
  UpdateLanguagesBodyDTO,
  GetLanguagesByIdParamsDTO,
  GetLanguagesListQueryDTO,
  GetLanguagesByCodeParamsDTO,
  LanguagesResDTO,
  LanguagesListResDTO,
  CreateLanguagesSwaggerDTO,
  UpdateLanguagesSwaggerDTO,
  LanguagesSwaggerResponseDTO,
  LanguagesListSwaggerResponseDTO
} from './dto/languages.dto'
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
import { LanguagesService } from './languages.service'

@ApiTags('Languages')
@Controller('languages')
export class LanguagesController {
  constructor(
    private readonly languagesService: LanguagesService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy danh sách ngôn ngữ',
    description: 'Lấy danh sách các ngôn ngữ được hỗ trợ với phân trang và tìm kiếm'
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
    description: 'Số lượng ngôn ngữ mỗi trang',
    example: 10
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Tìm kiếm theo tên ngôn ngữ'
  })
  @ApiQuery({
    name: 'code',
    required: false,
    description: 'Lọc theo mã ngôn ngữ'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách ngôn ngữ thành công',
    type: LanguagesListSwaggerResponseDTO
  })
  @ZodSerializerDto(LanguagesListResDTO)
  async findMany(@Query() query: GetLanguagesListQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(LanguagesMessage.GET_LIST_SUCCESS, lang),
      data: await this.languagesService.findMany(query)
    }
  }

  @Get('check/:code')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Kiểm tra ngôn ngữ có được hỗ trợ',
    description: 'Kiểm tra xem một ngôn ngữ có được hỗ trợ trong hệ thống không'
  })
  @ApiParam({
    name: 'code',
    description: 'Mã ngôn ngữ cần kiểm tra',
    example: 'vi'
  })
  @ApiResponse({
    status: 200,
    description: 'Kiểm tra ngôn ngữ thành công',
    schema: {
      type: 'object',
      properties: {
        supported: {
          type: 'boolean',
          description: 'Ngôn ngữ có được hỗ trợ không'
        }
      }
    }
  })
  async checkLanguageSupport(@Param() params: GetLanguagesByCodeParamsDTO) {
    const supported = await this.languagesService.isLanguageSupported(params.code)
    return { supported }
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy ngôn ngữ theo ID',
    description: 'Lấy thông tin chi tiết của một ngôn ngữ'
  })
  @ApiParam({
    name: 'id',
    description: 'ID của ngôn ngữ',
    example: 1
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy ngôn ngữ thành công',
    type: LanguagesSwaggerResponseDTO
  })
  @ApiResponse({
    status: 404,
    description: 'Ngôn ngữ không tồn tại'
  })
  @ZodSerializerDto(LanguagesResDTO)
  async findById(@Param() params: GetLanguagesByIdParamsDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(LanguagesMessage.GET_SUCCESS, lang),
      data: await this.languagesService.findById(params.id)
    }
  }

  @Get('by-code/:code')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy ngôn ngữ theo mã',
    description: 'Lấy thông tin chi tiết của một ngôn ngữ theo mã'
  })
  @ApiParam({
    name: 'code',
    description: 'Mã ngôn ngữ',
    example: 'vi'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy ngôn ngữ thành công',
    type: LanguagesSwaggerResponseDTO
  })
  @ApiResponse({
    status: 404,
    description: 'Ngôn ngữ không tồn tại'
  })
  @ZodSerializerDto(LanguagesResDTO)
  async findByCode(
    @Param() params: GetLanguagesByCodeParamsDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(LanguagesMessage.GET_SUCCESS, lang),
      data: await this.languagesService.findByCode(params)
    }
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tạo ngôn ngữ mới',
    description: 'Thêm một ngôn ngữ mới vào hệ thống'
  })
  @ApiBody({
    type: CreateLanguagesSwaggerDTO,
    description: 'Dữ liệu ngôn ngữ mới'
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo ngôn ngữ thành công',
    type: LanguagesSwaggerResponseDTO
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu ngôn ngữ không hợp lệ'
  })
  @ApiResponse({
    status: 409,
    description: 'Ngôn ngữ với mã này đã tồn tại'
  })
  @ZodSerializerDto(LanguagesResDTO)
  async create(@Body() body: CreateLanguagesBodyDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(LanguagesMessage.CREATE_SUCCESS, lang),
      data: await this.languagesService.create(body)
    }
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cập nhật ngôn ngữ',
    description: 'Cập nhật thông tin của một ngôn ngữ'
  })
  @ApiParam({
    name: 'id',
    description: 'ID của ngôn ngữ',
    example: 1
  })
  @ApiBody({
    type: UpdateLanguagesSwaggerDTO,
    description: 'Dữ liệu cập nhật ngôn ngữ'
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật ngôn ngữ thành công',
    type: LanguagesSwaggerResponseDTO
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu ngôn ngữ không hợp lệ'
  })
  @ApiResponse({
    status: 404,
    description: 'Ngôn ngữ không tồn tại'
  })
  @ApiResponse({
    status: 409,
    description: 'Mã ngôn ngữ đã tồn tại'
  })
  @ZodSerializerDto(LanguagesResDTO)
  async update(
    @Param() params: GetLanguagesByIdParamsDTO,
    @Body() body: UpdateLanguagesBodyDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(LanguagesMessage.UPDATE_SUCCESS, lang),
      data: await this.languagesService.update(params.id, body)
    }
  }

  @Put('by-code/:code')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cập nhật ngôn ngữ theo mã',
    description: 'Cập nhật thông tin của một ngôn ngữ theo mã'
  })
  @ApiParam({
    name: 'code',
    description: 'Mã ngôn ngữ',
    example: 'vi'
  })
  @ApiBody({
    type: UpdateLanguagesSwaggerDTO,
    description: 'Dữ liệu cập nhật ngôn ngữ'
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật ngôn ngữ thành công',
    type: LanguagesSwaggerResponseDTO
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu ngôn ngữ không hợp lệ'
  })
  @ApiResponse({
    status: 404,
    description: 'Ngôn ngữ không tồn tại'
  })
  @ApiResponse({
    status: 409,
    description: 'Mã ngôn ngữ đã tồn tại'
  })
  @ZodSerializerDto(LanguagesResDTO)
  async updateByCode(
    @Param() params: GetLanguagesByCodeParamsDTO,
    @Body() body: UpdateLanguagesBodyDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(LanguagesMessage.UPDATE_SUCCESS, lang),
      data: await this.languagesService.updateByCode(params.code, body)
    }
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xóa ngôn ngữ',
    description: 'Xóa một ngôn ngữ khỏi hệ thống'
  })
  @ApiParam({
    name: 'id',
    description: 'ID của ngôn ngữ',
    example: 1
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa ngôn ngữ thành công'
  })
  @ApiResponse({
    status: 404,
    description: 'Ngôn ngữ không tồn tại'
  })
  async delete(@Param() params: GetLanguagesByIdParamsDTO, @I18nLang() lang: string) {
    await this.languagesService.delete(params.id)
    return {
      message: this.i18nService.translate(LanguagesMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }

  @Delete('by-code/:code')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xóa ngôn ngữ theo mã',
    description: 'Xóa một ngôn ngữ khỏi hệ thống theo mã'
  })
  @ApiParam({
    name: 'code',
    description: 'Mã ngôn ngữ',
    example: 'vi'
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa ngôn ngữ thành công'
  })
  @ApiResponse({
    status: 404,
    description: 'Ngôn ngữ không tồn tại'
  })
  async deleteByCode(
    @Param() params: GetLanguagesByCodeParamsDTO,
    @I18nLang() lang: string
  ) {
    await this.languagesService.deleteByCode(params.code)
    return {
      message: this.i18nService.translate(LanguagesMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }

  @Post('create-default')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tạo các ngôn ngữ mặc định',
    description: 'Tạo các ngôn ngữ cơ bản: Tiếng Việt, English, 日本語'
  })
  @ApiResponse({
    status: 200,
    description: 'Tạo ngôn ngữ mặc định thành công'
  })
  createDefaultLanguages() {
    return this.languagesService.createDefaultLanguages()
  }
}
