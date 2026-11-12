import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { AuthenticationGuard } from '@/common/guards/authentication.guard'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateLessonSwaggerDTO,
  GetLessonListQuerySwaggerDTO,
  LessonListResponseSwaggerDTO,
  LessonResponseSwaggerDTO
} from './dto/lesson.dto'
import {
  CreateLessonBodyDTO,
  GetLessonByIdParamsDTO,
  GetLessonListQueryDTO,
  LessonListResDTO,
  LessonResDTO,
  UpdateLessonBodyDTO
} from './dto/lesson.zod-dto'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { LessonService } from './lesson.service'

@ApiTags('Lessons')
@Controller('lessons')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách bài học với phân trang và tìm kiếm' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách bài học thành công',
    type: LessonListResponseSwaggerDTO
  })
  @ApiQuery({ type: GetLessonListQuerySwaggerDTO })
  @ApiQuery({
    name: 'lang',
    description: 'Mã ngôn ngữ (vi, en, ja). Nếu không truyền thì lấy tất cả ngôn ngữ',
    example: 'vi',
    required: false
  })
  @ZodSerializerDto(LessonListResDTO)
  getLessonList(@Query() query: GetLessonListQueryDTO, @I18nLang() lang: string) {
    return this.lessonService.getLessonList(query, lang)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin bài học theo ID' })
  @ApiQuery({
    name: 'lang',
    description: 'Mã ngôn ngữ (vi, en, ja). Nếu không truyền thì lấy tất cả ngôn ngữ',
    example: 'vi',
    required: false
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin bài học thành công',
    type: LessonResponseSwaggerDTO
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài học' })
  @ZodSerializerDto(LessonResDTO)
  getLessonById(
    @Param() params: GetLessonByIdParamsDTO,
    @Query('lang') titleLang: string | undefined,
    @I18nLang() lang: string
  ) {
    return this.lessonService.getLessonById(params.id, titleLang, lang)
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Lấy thông tin bài học theo slug' })
  @ApiQuery({
    name: 'lang',
    description: 'Mã ngôn ngữ (vi, en, ja). Nếu không truyền thì lấy tất cả ngôn ngữ',
    example: 'vi',
    required: false
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin bài học thành công',
    type: LessonResponseSwaggerDTO
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài học' })
  @ZodSerializerDto(LessonResDTO)
  getLessonBySlug(
    @Param('slug') slug: string,
    @Query('lang') titleLang: string | undefined,
    @I18nLang() lang: string
  ) {
    return this.lessonService.getLessonBySlug(slug, titleLang, lang)
  }

  // Lesson CRUD
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo bài học mới' })
  @ApiResponse({
    status: 201,
    description: 'Tạo bài học thành công',
    type: LessonResponseSwaggerDTO
  })
  @ZodSerializerDto(LessonResDTO)
  @ApiBody({ type: CreateLessonSwaggerDTO })
  createLesson(
    @Body() body: CreateLessonBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.lessonService.createLesson(body, userId, lang)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật bài học' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật bài học thành công',
    type: LessonResponseSwaggerDTO
  })
  @ZodSerializerDto(LessonResDTO)
  updateLesson(
    @Param() params: GetLessonByIdParamsDTO,
    @Body() body: UpdateLessonBodyDTO,
    @I18nLang() lang: string
  ) {
    return this.lessonService.updateLesson(params.id, body, lang)
  }

  @Patch(':id/toggle-publish')
  @ApiOperation({ summary: 'Thay đổi trạng thái xuất bản bài học' })
  @ApiResponse({
    status: 200,
    description: 'Thay đổi trạng thái xuất bản thành công',
    type: LessonResponseSwaggerDTO
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài học' })
  @ZodSerializerDto(LessonResDTO)
  togglePublishLesson(@Param() params: GetLessonByIdParamsDTO, @I18nLang() lang: string) {
    return this.lessonService.togglePublishLesson(params.id, lang)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa bài học' })
  @ApiResponse({ status: 204, description: 'Xóa bài học thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài học' })
  @ZodSerializerDto(MessageResDTO)
  deleteLesson(@Param() params: GetLessonByIdParamsDTO, @I18nLang() lang: string) {
    return this.lessonService.deleteLesson(params.id, lang)
  }
}
