import { ResponseMessage } from '@/i18n/response-message'
import { ExercisesMessage as M } from '@/i18n/message-keys'
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery
} from '@nestjs/swagger'
import { AuthenticationGuard } from '@/common/guards/authentication.guard'
import { ExercisesService } from './exercises.service'
import {
  CreateExercisesSwaggerDTO,
  UpdateExercisesSwaggerDTO,
  GetExercisesListQuerySwaggerDTO,
  ExercisesResponseSwaggerDTO,
  ExercisesListResponseSwaggerDTO
} from './dto/exercises.dto'
import {
  CreateExercisesBodyDTO,
  UpdateExercisesBodyDTO,
  GetExercisesByIdParamsDTO,
  GetExercisesByLessonParamsDTO,
  GetExercisesListQueryDTO
} from './dto/exercises.zod-dto'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'

@ApiTags('Exercises')
@Controller('exercises')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Post()
  @ApiOperation({
    summary: 'Tạo bài tập mới',
    description:
      'Tạo một bài tập mới với loại bài tập, nội dung và liên kết với bài học. Hệ thống sẽ kiểm tra tính tương thích level giữa Lesson và TestSet.'
  })
  @ApiBody({
    type: CreateExercisesSwaggerDTO,
    description:
      'Dữ liệu bài tập mới cần tạo. Hệ thống sẽ tự động kiểm tra level tương thích:' +
      '\n\nQuy tắc Level:' +
      '\n• Lesson.levelJlpt phải khớp với TestSet.levelN' +
      '\n• Chỉ có thể tạo Exercise khi level của Lesson và TestSet khớp nhau' +
      '\n\nLoại bài tập: VOCABULARY, GRAMMAR, KANJI'
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo bài tập thành công',
    type: ExercisesResponseSwaggerDTO
  })
  @ResponseMessage(M.CREATE_SUCCESS)
  async create(@Body() body: CreateExercisesBodyDTO) {
    return this.exercisesService.create(body)
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách bài tập với phân trang và tìm kiếm',
    description:
      'Lấy danh sách tất cả bài tập với khả năng phân trang, lọc theo loại bài tập, bài học và tìm kiếm'
  })
  @ApiQuery({ type: GetExercisesListQuerySwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách bài tập thành công',
    type: ExercisesListResponseSwaggerDTO
  })
  @ResponseMessage(M.GET_LIST_SUCCESS)
  async getExercisesList(@Query() query: GetExercisesListQueryDTO) {
    return this.exercisesService.getExercisesList(query)
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy thông tin bài tập theo ID',
    description: 'Lấy thông tin chi tiết của một bài tập cụ thể theo ID'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin bài tập thành công',
    type: ExercisesResponseSwaggerDTO
  })
  @ResponseMessage(M.GET_SUCCESS)
  async getExercisesById(@Param() params: GetExercisesByIdParamsDTO) {
    return this.exercisesService.getExercisesById(params.id)
  }

  @Get(':id/plain')
  @ApiOperation({
    summary: 'Lấy bài tập theo ID (gọn)',
    description: 'Trả về bài tập không kèm lesson và testSet (chỉ trường của exercises)'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin bài tập (gọn) thành công',
    type: ExercisesResponseSwaggerDTO
  })
  @ResponseMessage(M.GET_SUCCESS)
  async getExercisesByIdPlain(@Param() params: GetExercisesByIdParamsDTO) {
    return this.exercisesService.getExercisesByIdHaveQuestionBanks(params.id)
  }

  @Get('lesson/:lessonId')
  @ApiOperation({
    summary: 'Lấy danh sách bài tập theo bài học',
    description: 'Lấy tất cả bài tập thuộc về một bài học cụ thể'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách bài tập theo bài học thành công',
    type: [ExercisesResponseSwaggerDTO]
  })
  @ResponseMessage(M.GET_LIST_SUCCESS)
  async getExercisesByLessonId(
    @Param() params: GetExercisesByLessonParamsDTO,
    @I18nLang() lang: string
  ) {
    return this.exercisesService.getExercisesByLessonId(params.lessonId, lang)
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Cập nhật bài tập',
    description: 'Cập nhật thông tin của một bài tập cụ thể theo ID'
  })
  @ApiBody({
    type: UpdateExercisesSwaggerDTO,
    description: 'Dữ liệu bài tập cần cập nhật'
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật bài tập thành công',
    type: ExercisesResponseSwaggerDTO
  })
  @ResponseMessage(M.UPDATE_SUCCESS)
  async update(
    @Param() params: GetExercisesByIdParamsDTO,
    @Body() body: UpdateExercisesBodyDTO
  ) {
    return this.exercisesService.update(params.id, body)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xóa bài tập',
    description: 'Xóa một bài tập cụ thể theo ID'
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa bài tập thành công',
    type: ExercisesResponseSwaggerDTO
  })
  @ResponseMessage(M.DELETE_SUCCESS)
  async delete(@Param() params: GetExercisesByIdParamsDTO) {
    await this.exercisesService.delete(params.id)
  }
}
