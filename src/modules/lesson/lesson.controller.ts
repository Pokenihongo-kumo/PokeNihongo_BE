import { I18nService } from '@/i18n/i18n.service'
import { LessonMessage as M } from '@/i18n/message-keys'
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
  constructor(
    private readonly lessonService: LessonService,
    private readonly i18nService: I18nService
  ) {}

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
  async getLessonList(@Query() query: GetLessonListQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang),
      data: await this.lessonService.getLessonList(query, lang)
    }
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
  async getLessonById(
    @Param() params: GetLessonByIdParamsDTO,
    @Query('lang') titleLang: string | undefined,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.GET_SUCCESS, lang),
      data: await this.lessonService.getLessonById(params.id, titleLang)
    }
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
  async getLessonBySlug(
    @Param('slug') slug: string,
    @Query('lang') titleLang: string | undefined,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.GET_SUCCESS, lang),
      data: await this.lessonService.getLessonBySlug(slug, titleLang)
    }
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
  async createLesson(
    @Body() body: CreateLessonBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.CREATE_SUCCESS, lang),
      data: await this.lessonService.createLesson(body, userId)
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật bài học' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật bài học thành công',
    type: LessonResponseSwaggerDTO
  })
  @ZodSerializerDto(LessonResDTO)
  async updateLesson(
    @Param() params: GetLessonByIdParamsDTO,
    @Body() body: UpdateLessonBodyDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.UPDATE_SUCCESS, lang),
      data: await this.lessonService.updateLesson(params.id, body)
    }
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
  async togglePublishLesson(
    @Param() params: GetLessonByIdParamsDTO,
    @I18nLang() lang: string
  ) {
    const data = await this.lessonService.togglePublishLesson(params.id)
    return {
      message: this.i18nService.translate(
        data.isPublished ? M.PUBLISH_SUCCESS : M.UNPUBLISH_SUCCESS,
        lang
      ),
      data
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa bài học' })
  @ApiResponse({ status: 204, description: 'Xóa bài học thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài học' })
  @ZodSerializerDto(MessageResDTO)
  async deleteLesson(@Param() params: GetLessonByIdParamsDTO, @I18nLang() lang: string) {
    await this.lessonService.deleteLesson(params.id)
    return { message: this.i18nService.translate(M.DELETE_SUCCESS, lang) }
  }
}
