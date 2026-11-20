import { ResponseMessage, msg } from '@/i18n/response-message'
import { LessonCategoryMessage } from '@/i18n/message-keys'
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
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { AuthenticationGuard } from '@/common/guards/authentication.guard'
import { UseGuards } from '@nestjs/common'
import { LessonCategoryService } from './lesson-category.service'
import {
  CreateLessonCategoryBodyDTO,
  UpdateLessonCategoryBodyDTO,
  GetLessonCategoryByIdParamsDTO,
  GetLessonCategoryListQueryDTO
} from './dto/lesson-category.zod-dto'
import {
  LessonCategoryResponseSwaggerDTO,
  LessonCategoryListResponseSwaggerDTO,
  CreateLessonCategorySwaggerDTO,
  UpdateLessonCategorySwaggerDTO
} from './dto/lesson-category.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import {
  LessonCategoryEntityResponseDTO,
  LessonCategoryResponseDTO,
  LessonCategoryListResponseDTO
} from './dto/lesson-category.response.dto'

@ApiTags('Lesson Categories')
@Controller('lesson-categories')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class LessonCategoryController {
  constructor(private readonly lessonCategoryService: LessonCategoryService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo danh mục bài học mới' })
  @ApiResponse({
    status: 201,
    description: 'Tạo danh mục bài học thành công',
    type: LessonCategoryResponseSwaggerDTO
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 409, description: 'Danh mục bài học đã tồn tại' })
  // Writes return the stored row (nameKey); was the translated view schema: 500
  @ZodSerializerDto(LessonCategoryEntityResponseDTO)
  @ApiBody({ type: CreateLessonCategorySwaggerDTO })
  @ResponseMessage(LessonCategoryMessage.CREATE_SUCCESS)
  async createLessonCategory(@Body() body: CreateLessonCategoryBodyDTO) {
    return this.lessonCategoryService.createLessonCategory(body)
  }

  @Post('create-defaults')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo các danh mục bài học mặc định' })
  @ApiResponse({ status: 201, description: 'Tạo danh mục bài học mặc định thành công' })
  async createDefaultLessonCategories() {
    const results = await this.lessonCategoryService.createDefaultLessonCategories()
    // the page fields of this route's old answer are kept
    return {
      data: results,
      page: 1,
      limit: results.length,
      total: results.length,
      totalPages: 1,
      message: msg(LessonCategoryMessage.CREATE_DEFAULT_SUCCESS)
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật danh mục bài học' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật danh mục bài học thành công',
    type: LessonCategoryResponseSwaggerDTO
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục bài học' })
  @ApiResponse({ status: 409, description: 'Danh mục bài học đã tồn tại' })
  @ZodSerializerDto(LessonCategoryEntityResponseDTO)
  @ApiBody({ type: UpdateLessonCategorySwaggerDTO })
  @ResponseMessage(LessonCategoryMessage.UPDATE_SUCCESS)
  async updateLessonCategory(
    @Param() params: GetLessonCategoryByIdParamsDTO,
    @Body() body: UpdateLessonCategoryBodyDTO
  ) {
    return this.lessonCategoryService.updateLessonCategory(params.id, body)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa danh mục bài học' })
  @ApiParam({ name: 'id', type: Number, description: 'ID của danh mục bài học' })
  @ApiResponse({ status: 204, description: 'Xóa danh mục bài học thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục bài học' })
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(LessonCategoryMessage.DELETE_SUCCESS)
  async deleteLessonCategory(@Param() params: GetLessonCategoryByIdParamsDTO) {
    await this.lessonCategoryService.deleteLessonCategory(params.id)
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách danh mục bài học' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách danh mục bài học thành công',
    type: LessonCategoryListResponseSwaggerDTO
  })
  @ZodSerializerDto(LessonCategoryListResponseDTO)
  @ResponseMessage(LessonCategoryMessage.GET_LIST_SUCCESS)
  async getLessonCategoryList(
    @Query() query: GetLessonCategoryListQueryDTO,
    @I18nLang() lang: string
  ) {
    return this.lessonCategoryService.getLessonCategoryList(query, lang)
  }

  @Get('by-id/:id')
  @ApiOperation({ summary: 'Lấy thông tin danh mục bài học theo ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID của danh mục bài học' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin danh mục bài học thành công',
    type: LessonCategoryResponseSwaggerDTO
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục bài học' })
  @ZodSerializerDto(LessonCategoryResponseDTO)
  @ResponseMessage(LessonCategoryMessage.GET_SUCCESS)
  async getLessonCategoryById(
    @Param() params: GetLessonCategoryByIdParamsDTO,
    @I18nLang() lang: string
  ) {
    return this.lessonCategoryService.getLessonCategoryById(params, lang)
  }

  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Lấy thông tin danh mục bài học theo slug' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin danh mục bài học thành công',
    type: LessonCategoryResponseSwaggerDTO
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục bài học' })
  @ZodSerializerDto(LessonCategoryResponseDTO)
  @ResponseMessage(LessonCategoryMessage.GET_SUCCESS)
  async getLessonCategoryBySlug(@Param('slug') slug: string, @I18nLang() lang: string) {
    return this.lessonCategoryService.getLessonCategoryBySlug(slug, lang)
  }
}
