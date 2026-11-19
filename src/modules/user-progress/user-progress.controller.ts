import { I18nService } from '@/i18n/i18n.service'
import { UserProgressMessage as M } from '@/i18n/message-keys'
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

// Admin init routes: fixed Vietnamese messages, as before
const INIT_MESSAGE = {
  'no-users': 'Không có user nào trong hệ thống',
  'no-lessons': 'Không có lesson nào trong hệ thống',
  done: 'Khởi tạo UserProgress thành công'
} as const

@ApiTags('User Progress')
@Controller('user-progress')
export class UserProgressController {
  constructor(
    private readonly userProgressService: UserProgressService,
    private readonly i18nService: I18nService
  ) {}

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
  async create(@Body() body: CreateUserProgressBodyDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(M.CREATE_SUCCESS, lang),
      data: await this.userProgressService.create(body)
    }
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
  async findAll(@Query() query: GetUserProgressListQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang),
      data: await this.userProgressService.findAll(query)
    }
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
  async getMy(
    @Query() query: GetUserProgressListQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.GET_MY_SUCCESS, lang),
      data: await this.userProgressService.getMy(userId, query)
    }
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
  async update(
    @Param() params: GetUserProgressByIdParamsDTO,
    @Body() body: UpdateUserProgressBodyDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.UPDATE_SUCCESS, lang),
      data: await this.userProgressService.update(params.id, body)
    }
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
  async updateByUserAndLesson(
    @ActiveUser('userId') userId: number,
    @Param() params: UserProgressLessonParamsDTO,
    @Body() body: UpdateUserProgressBodyDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.UPDATE_SUCCESS, lang),
      data: await this.userProgressService.updateByUserAndLesson(
        userId,
        params.lessonId,
        body
      )
    }
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
  async remove(@Param() params: GetUserProgressByIdParamsDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(M.DELETE_SUCCESS, lang),
      data: await this.userProgressService.remove(params.id)
    }
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
  async startLesson(
    @Body() body: StartLessonBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.START_LESSON_SUCCESS, lang),
      data: await this.userProgressService.startLesson(userId, body.lessonId)
    }
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
  async completeLesson(
    @Body() body: CompleteLessonBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.COMPLETE_LESSON_SUCCESS, lang),
      data: await this.userProgressService.completeLesson(userId, body.lessonId)
    }
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
    const { outcome, data } = await this.userProgressService.initUserProgressForAdmin(
      params.userId
    )
    return { message: INIT_MESSAGE[outcome], data }
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
    const { outcome, data } = await this.userProgressService.initAllUsersProgress()
    return {
      message:
        outcome === 'done'
          ? 'Khởi tạo UserProgress cho tất cả user thành công'
          : INIT_MESSAGE[outcome],
      data
    }
  }
}
