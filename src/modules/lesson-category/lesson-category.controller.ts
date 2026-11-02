import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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
  UpdateLessonCategorySwaggerDTO,
  GetLessonCategoryListQuerySwaggerDTO
} from './dto/lesson-category.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import {
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
  @ZodSerializerDto(LessonCategoryResponseDTO)
  @ApiBody({ type: CreateLessonCategorySwaggerDTO })
  async createLessonCategory(@Body() body: CreateLessonCategoryBodyDTO) {
    return await this.lessonCategoryService.createLessonCategory(body)
  }

  @Post('create-defaults')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo các danh mục bài học mặc định' })
  @ApiResponse({ status: 201, description: 'Tạo danh mục bài học mặc định thành công' })
  async createDefaultLessonCategories() {
    return await this.lessonCategoryService.createDefaultLessonCategories()
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
  @ZodSerializerDto(LessonCategoryResponseDTO)
  @ApiBody({ type: UpdateLessonCategorySwaggerDTO })
  async updateLessonCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateLessonCategoryBodyDTO
  ) {
    return await this.lessonCategoryService.updateLessonCategory(id, body)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa danh mục bài học' })
  @ApiParam({ name: 'id', type: Number, description: 'ID của danh mục bài học' })
  @ApiResponse({ status: 204, description: 'Xóa danh mục bài học thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục bài học' })
  @ZodSerializerDto(MessageResDTO)
  async deleteLessonCategory(@Param('id', ParseIntPipe) id: number) {
    return await this.lessonCategoryService.deleteLessonCategory(id)
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách danh mục bài học' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách danh mục bài học thành công',
    type: LessonCategoryListResponseSwaggerDTO
  })
  @ZodSerializerDto(LessonCategoryListResponseDTO)
  async getLessonCategoryList(
    @Query() query: GetLessonCategoryListQueryDTO,
    @I18nLang() lang: string
  ) {
    return await this.lessonCategoryService.getLessonCategoryList(query, lang)
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
  async getLessonCategoryById(@Param('id', ParseIntPipe) id: number) {
    return await this.lessonCategoryService.getLessonCategoryById({ id })
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
  async getLessonCategoryBySlug(@Param('slug') slug: string) {
    return await this.lessonCategoryService.getLessonCategoryBySlug(slug)
  }
}
