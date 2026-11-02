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
import { AuthenticationGuard } from '@/common/guards/authentication.guard'
import { UseGuards } from '@nestjs/common'
import { LessonContentService } from './lesson-content.service'
import {
  CreateLessonContentBodyDTO,
  UpdateLessonContentBodyDTO,
  GetLessonContentByIdParamsDTO,
  GetLessonContentListQueryDTO,
  LessonContentFullResDTO
} from './dto/lesson-content.zod-dto'
import {
  LessonContentResponseSwaggerDTO,
  LessonContentListResponseSwaggerDTO,
  CreateLessonContentSwaggerDTO,
  UpdateLessonContentSwaggerDTO,
  GetLessonContentListQuerySwaggerDTO,
  UpdateLessonContentOrderSwaggerDTO,
  LessonContentFullResponseSwaggerDTO
} from './dto/lesson-content.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import {
  LessonContentResponseDTO,
  LessonContentListResponseDTO
} from './dto/lesson-content.response.dto'
import {
  CreateMutiLessonContentBodyType,
  UpdateLessonContentOrder
} from './entities/lesson-content.entities'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { ActiveUser } from '@/common/decorators/active-user.decorator'

@ApiTags('Lesson Contents')
@Controller('lesson-contents')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class LessonContentController {
  constructor(private readonly lessonContentService: LessonContentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Tạo nội dung bài học mới',
    description: `Tạo nội dung bài học mới.
**Quy tắc đặc biệt:**
- **contentType**: Chỉ chấp nhận các giá trị 'VOCABULARY', 'GRAMMAR', 'KANJI'`
  })
  @ApiBody({ type: CreateLessonContentSwaggerDTO })
  @ApiResponse({
    status: 201,
    description: 'Tạo nội dung bài học thành công',
    type: LessonContentResponseSwaggerDTO
  })
  async createLessonContent(@Body() body: CreateMutiLessonContentBodyType) {
    return await this.lessonContentService.createLessonContent(body)
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách nội dung bài học' })
  @ApiQuery({ type: GetLessonContentListQuerySwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách nội dung bài học thành công',
    type: LessonContentListResponseSwaggerDTO
  })
  @ZodSerializerDto(LessonContentListResponseDTO)
  async getLessonContentList(@Query() query: GetLessonContentListQueryDTO) {
    return await this.lessonContentService.getLessonContentList(query)
  }

  @Get(':lessonId')
  @ApiOperation({
    summary: 'Lấy toàn bộ nội dung bài học được nhóm theo loại',
    description:
      'API này trả về tất cả nội dung của một lesson được nhóm theo VOCABULARY, GRAMMAR, KANJI và kèm theo translations'
  })
  @ApiParam({ name: 'lessonId', description: 'ID của lesson', example: 1 })
  @ApiQuery({
    name: 'lang',
    description: 'Mã ngôn ngữ (vi, en, ja)',
    example: 'vi',
    required: false
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy toàn bộ nội dung bài học thành công',
    type: LessonContentFullResponseSwaggerDTO
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lesson' })
  @ZodSerializerDto(LessonContentFullResDTO)
  async getLessonContentFull(
    @Param('lessonId') lessonId: string,
    @Query('lang') lang?: string,
    @ActiveUser('userId') userId?: number
  ) {
    return await this.lessonContentService.getLessonContentFull(
      Number(lessonId),
      lang,
      userId
    )
  }

  // @Get(':id')
  // @ApiOperation({ summary: 'Lấy thông tin nội dung bài học theo ID' })
  // @ApiResponse({ status: 200, description: 'Lấy thông tin nội dung bài học thành công', type: LessonContentResponseSwaggerDTO })
  // @ApiResponse({ status: 404, description: 'Không tìm thấy nội dung bài học' })
  // @ZodSerializerDto(LessonContentResponseDTO)
  // async getLessonContentById(@Param('id') id: string) {
  //     return await this.lessonContentService.getLessonContentById(Number(id))
  // }

  @Put('order')
  @ApiOperation({ summary: 'Cập nhật vị trí nội dung bài học' })
  @ApiBody({ type: UpdateLessonContentOrderSwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật vị trí nội dung bài học thành công',
    type: LessonContentResponseSwaggerDTO
  })
  async updateLessonContentOrder(@Body() body: UpdateLessonContentOrder) {
    return await this.lessonContentService.updateLessonContentOrder(body)
  }

  @Delete('bulk')
  @ApiOperation({
    summary: 'Xóa nhiều nội dung bài học cùng lúc',
    description: 'Xóa nhiều lesson-content bằng cách truyền array các ID'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array các ID của lesson-content cần xóa',
          example: [1, 2, 3]
        }
      },
      required: ['ids']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa nhiều nội dung bài học thành công',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Xóa nhiều nội dung bài học thành công' },
        data: {
          type: 'object',
          properties: {
            deletedCount: { type: 'number', example: 3 },
            deletedIds: { type: 'array', items: { type: 'number' }, example: [1, 2, 3] }
          }
        }
      }
    }
  })
  async deleteMultipleLessonContents(@Body() body: { ids: number[] }) {
    return await this.lessonContentService.deleteMultipleLessonContents(body.ids)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa nội dung ra khỏi bài học' })
  async deleteLessonContent(@Param('id') id: string) {
    return await this.lessonContentService.deleteLessonContent(Number(id))
  }
}
