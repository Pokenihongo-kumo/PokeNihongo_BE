import { ActiveUser } from '@/common/decorators/active-user.decorator'
import {
  CreateUserProgressBodyDTO,
  GetUserProgressByIdParamsDTO,
  UserProgressLessonParamsDTO,
  UserProgressUserParamsDTO,
  GetUserProgressListQueryDTO,
  UpdateUserProgressBodyDTO,
  UserProgressListResDTO,
  UserProgressResDTO,
  StartLessonBodyDTO,
  CompleteLessonBodyDTO
} from '@/modules/user-progress/dto/user-progress.zod-dto'
import {
  UserProgressResponseSwaggerDTO,
  UserProgressListResponseSwaggerDTO,
  GetUserProgressListQuerySwaggerDTO,
  CreateUserProgressSwaggerDTO,
  UpdateUserProgressSwaggerDTO,
  InitUserProgressForAdminResponseSwaggerDTO,
  InitAllUsersProgressResponseSwaggerDTO
} from '@/modules/user-progress/dto/user-progress.dto'
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
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { UserProgressService } from './user-progress.service'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'

@ApiTags('User Progress')
@Controller('user-progress')
export class UserProgressController {
  constructor(private readonly userProgressService: UserProgressService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo tiến độ học tập mới - Admin' })
  @ApiBody({ type: CreateUserProgressSwaggerDTO })
  @ApiResponse({
    status: 201,
    description: 'Tạo tiến độ học tập thành công',
    type: UserProgressResponseSwaggerDTO
  })
  @ZodSerializerDto(UserProgressResDTO)
  create(@Body() body: CreateUserProgressBodyDTO, @I18nLang() lang: string) {
    return this.userProgressService.create(body, lang)
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy danh sách tiến độ học tập với phân trang và lọc - Admin'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách tiến độ học tập thành công',
    type: UserProgressListResponseSwaggerDTO
  })
  @ApiQuery({ type: GetUserProgressListQuerySwaggerDTO })
  @ZodSerializerDto(UserProgressListResDTO)
  findAll(@Query() query: GetUserProgressListQueryDTO, @I18nLang() lang: string) {
    return this.userProgressService.findAll(query, lang)
  }

  @Get('my')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy tiến độ học tập của tôi' })
  @ApiResponse({
    status: 200,
    description: 'Lấy tiến độ học tập thành công',
    type: UserProgressListResponseSwaggerDTO
  })
  @ApiQuery({ type: GetUserProgressListQuerySwaggerDTO })
  @ZodSerializerDto(UserProgressListResDTO)
  getMy(
    @Query() query: GetUserProgressListQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userProgressService.getMy(userId, query, lang)
  }

  // @Get(':id')
  // @ApiBearerAuth()
  // @ApiOperation({ summary: 'Lấy thông tin tiến độ học tập theo ID' })
  // @ApiResponse({
  //     status: 200,
  //     description: 'Lấy thông tin tiến độ học tập thành công',
  //     type: UserProgressResponseSwaggerDTO
  // })
  // @ZodSerializerDto(UserProgressResDTO)
  // findOne(@Param() params: GetUserProgressByIdParamsDTO) {
  //     return this.userProgressService.findOne(params)
  // }

  // @Get('user/:userId/lesson/:lessonId')
  // @ApiBearerAuth()
  // @ApiOperation({ summary: 'Lấy thông tin tiến độ học tập theo user và lesson' })
  // @ApiResponse({
  //     status: 200,
  //     description: 'Lấy thông tin tiến độ học tập thành công',
  //     type: UserProgressResponseSwaggerDTO
  // })
  // @ZodSerializerDto(UserProgressResDTO)
  // findByUserAndLesson(
  //     @Param('userId') userId: string,
  //     @Param('lessonId') lessonId: string
  // ) {
  //     return this.userProgressService.findByUserAndLesson(parseInt(userId, 10), parseInt(lessonId, 10))
  // }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật tiến độ học tập theo ID' })
  @ApiBody({ type: UpdateUserProgressSwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật tiến độ học tập thành công',
    type: UserProgressResponseSwaggerDTO
  })
  @ZodSerializerDto(UserProgressResDTO)
  update(
    @Param() params: GetUserProgressByIdParamsDTO,
    @Body() body: UpdateUserProgressBodyDTO,
    @I18nLang() lang: string
  ) {
    return this.userProgressService.update(params.id, body, lang)
  }

  @Put('user/lesson/:lessonId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật tiến độ học tập theo user và lesson' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật tiến độ học tập thành công',
    type: UserProgressResponseSwaggerDTO
  })
  @ZodSerializerDto(UserProgressResDTO)
  updateByUserAndLesson(
    @ActiveUser('userId') userId: number,
    @Param() params: UserProgressLessonParamsDTO,
    @Body() body: UpdateUserProgressBodyDTO,
    @I18nLang() lang: string
  ) {
    return this.userProgressService.updateByUserAndLesson(
      userId,
      params.lessonId,
      body,
      lang
    )
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa tiến độ học tập theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Xóa tiến độ học tập thành công',
    type: UserProgressResponseSwaggerDTO
  })
  @ZodSerializerDto(UserProgressResDTO)
  remove(@Param() params: GetUserProgressByIdParamsDTO, @I18nLang() lang: string) {
    return this.userProgressService.remove(params.id, lang)
  }

  @Post('start-lesson')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bắt đầu bài học' })
  @ApiResponse({
    status: 201,
    description: 'Bắt đầu bài học thành công',
    type: UserProgressResponseSwaggerDTO
  })
  @ZodSerializerDto(UserProgressResDTO)
  startLesson(
    @Body() body: StartLessonBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userProgressService.startLesson(userId, body.lessonId, lang)
  }

  @Post('complete-lesson')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Hoàn thành bài học' })
  @ApiResponse({
    status: 200,
    description: 'Hoàn thành bài học thành công',
    type: UserProgressResponseSwaggerDTO
  })
  @ZodSerializerDto(UserProgressResDTO)
  completeLesson(
    @Body() body: CompleteLessonBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userProgressService.completeLesson(
      userId,
      body.lessonId,
      body.score,
      lang
    )
  }

  @Post('admin/init-user-progress/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Khởi tạo UserProgress cho tất cả lesson cho user' })
  @ApiResponse({
    status: 200,
    description: 'Khởi tạo UserProgress thành công',
    type: InitUserProgressForAdminResponseSwaggerDTO
  })
  async initUserProgressForAdmin(@Param() params: UserProgressUserParamsDTO) {
    return this.userProgressService.initUserProgressForAdmin(params.userId)
  }

  @Post('admin/init-all-users-progress')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Admin: Khởi tạo UserProgress cho tất cả lesson cho TẤT CẢ user'
  })
  @ApiResponse({
    status: 200,
    description: 'Khởi tạo UserProgress cho tất cả user thành công',
    type: InitAllUsersProgressResponseSwaggerDTO
  })
  async initAllUsersProgress() {
    return this.userProgressService.initAllUsersProgress()
  }
}
