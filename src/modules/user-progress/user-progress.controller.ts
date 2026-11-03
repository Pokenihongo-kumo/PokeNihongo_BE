import { ActiveUser } from '@/common/decorators/active-user.decorator'
import {
  CreateUserProgressBodyDTO,
  GetUserProgressByIdParamsDTO,
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
  create(@Body() body: CreateUserProgressBodyDTO, @ActiveUser('userId') userId: number) {
    return this.userProgressService.create(body)
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
  findAll(@Query() query: GetUserProgressListQueryDTO) {
    return this.userProgressService.findAll(query)
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
    @ActiveUser('userId') userId: number
  ) {
    return this.userProgressService.getMy(userId, query)
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
    @Param('id') id: string,
    @Body() body: UpdateUserProgressBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userProgressService.update(Number(id), body)
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
    @ActiveUser('userId') userId: string,
    @Param('lessonId') lessonId: string,
    @Body() body: UpdateUserProgressBodyDTO
  ) {
    return this.userProgressService.updateByUserAndLesson(
      parseInt(userId, 10),
      parseInt(lessonId, 10),
      body
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
  remove(@Param('id') id: string) {
    return this.userProgressService.remove(Number(id))
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
  startLesson(@Body() body: StartLessonBodyDTO, @ActiveUser('userId') userId: number) {
    return this.userProgressService.startLesson(userId, body.lessonId)
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
    @ActiveUser('userId') userId: number
  ) {
    return this.userProgressService.completeLesson(userId, body.lessonId, body.score)
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
  async initUserProgressForAdmin(@Param('userId') userId: number) {
    return this.userProgressService.initUserProgressForAdmin(userId)
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
