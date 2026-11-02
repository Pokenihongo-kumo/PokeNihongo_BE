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
import { LessonListResponseDTO, LessonResponseDTO } from './dto/lesson.response.dto'
import {
  CreateLessonBodyDTO,
  GetLessonByIdParamsDTO,
  GetLessonListQueryDTO,
  UpdateLessonBodyDTO
} from './dto/lesson.zod-dto'
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
  @ZodSerializerDto(LessonListResponseDTO)
  async getLessonList(
    @Query() query: GetLessonListQueryDTO,
    @Query('lang') lang?: string
  ) {
    return await this.lessonService.getLessonList(query, lang)
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
  @ZodSerializerDto(LessonResponseDTO)
  async getLessonById(@Param('id') id: string, @Query('lang') lang?: string) {
    return await this.lessonService.getLessonById(Number(id), lang)
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
  @ZodSerializerDto(LessonResponseDTO)
  async getLessonBySlug(@Param('slug') slug: string, @Query('lang') lang?: string) {
    return await this.lessonService.getLessonBySlug(slug, lang)
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
  @ZodSerializerDto(LessonResponseDTO)
  @ApiBody({ type: CreateLessonSwaggerDTO })
  async createLesson(
    @Body() body: CreateLessonBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return await this.lessonService.createLesson(body, userId)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật bài học' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật bài học thành công',
    type: LessonResponseSwaggerDTO
  })
  @ZodSerializerDto(LessonResponseDTO)
  async updateLesson(@Param('id') id: string, @Body() body: UpdateLessonBodyDTO) {
    return await this.lessonService.updateLesson(Number(id), body)
  }

  @Patch(':id/toggle-publish')
  @ApiOperation({ summary: 'Thay đổi trạng thái xuất bản bài học' })
  @ApiResponse({
    status: 200,
    description: 'Thay đổi trạng thái xuất bản thành công',
    type: LessonResponseSwaggerDTO
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài học' })
  @ZodSerializerDto(LessonResponseDTO)
  async togglePublishLesson(@Param('id') id: string) {
    return await this.lessonService.togglePublishLesson(Number(id))
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa bài học' })
  @ApiResponse({ status: 204, description: 'Xóa bài học thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài học' })
  @ZodSerializerDto(MessageResDTO)
  async deleteLesson(@Param('id') id: string) {
    return await this.lessonService.deleteLesson(Number(id))
  }
}
