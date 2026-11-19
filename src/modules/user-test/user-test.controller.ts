import { I18nService } from '@/i18n/i18n.service'
import { UserTestMessage as M } from '@/i18n/message-keys'
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery
} from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { UserTestService } from './user-test.service'
import {
  CreateUserTestBodyDTO,
  UpdateUserTestBodyDTO,
  GetUserTestByIdParamsDTO,
  GetUserTestListQueryDTO,
  GetUserTestMyListQueryDTO,
  UserTestResDTO,
  UserTestListResDTO,
  UserTestMyListResDTO
} from './dto/user-test.zod-dto'
import {
  CreateUserTestSwaggerDTO,
  UpdateUserTestSwaggerDTO,
  UserTestResponseSwaggerDTO,
  UserTestListResponseSwaggerDTO,
  UserTestMyListResponseSwaggerDTO,
  GetUserTestListQuerySwaggerDTO,
  GetUserTestMyListQuerySwaggerDTO
} from './dto/user-test.dto'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'

@ApiTags('UserTest')
@Controller('user-test')
export class UserTestController {
  constructor(
    private readonly userTestService: UserTestService,
    private readonly i18nService: I18nService
  ) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo UserTest mới' })
  @ApiResponse({
    status: 201,
    description: 'Tạo UserTest thành công',
    type: UserTestResponseSwaggerDTO
  })
  async create(@Body() body: CreateUserTestBodyDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(M.CREATE_SUCCESS, lang),
      data: await this.userTestService.create(body)
    }
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách UserTest với phân trang' })
  @ApiQuery({ type: GetUserTestListQuerySwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách UserTest thành công',
    type: UserTestListResponseSwaggerDTO
  })
  @ZodSerializerDto(UserTestListResDTO)
  async findAll(@Query() query: GetUserTestListQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang),
      data: await this.userTestService.findAll(query, lang)
    }
  }

  @Get('my')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách UserTest của tôi' })
  @ApiQuery({ type: GetUserTestMyListQuerySwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách UserTest của tôi thành công',
    type: UserTestMyListResponseSwaggerDTO
  })
  @ZodSerializerDto(UserTestMyListResDTO)
  async getMy(
    @Query() query: GetUserTestMyListQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    const { type, ...rest } = query
    return {
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang),
      data: await this.userTestService.findAll(
        { ...rest, userId, testType: type },
        lang,
        true
      )
    }
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin UserTest theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin UserTest thành công',
    type: UserTestResponseSwaggerDTO
  })
  async findOne(@Param() { id }: GetUserTestByIdParamsDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(M.GET_SUCCESS, lang),
      data: await this.userTestService.findOne(id)
    }
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật UserTest theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật UserTest thành công',
    type: UserTestResponseSwaggerDTO
  })
  async update(
    @Param() { id }: GetUserTestByIdParamsDTO,
    @Body() body: UpdateUserTestBodyDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.UPDATE_SUCCESS, lang),
      data: await this.userTestService.update(id, body)
    }
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa UserTest theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Xóa UserTest thành công'
  })
  async delete(@Param() { id }: GetUserTestByIdParamsDTO, @I18nLang() lang: string) {
    await this.userTestService.delete(id)
    return { message: this.i18nService.translate(M.DELETE_SUCCESS, lang) }
  }

  @Post('init-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Khởi tạo UserTest cho TẤT CẢ user trong hệ thống' })
  @ApiResponse({
    status: 200,
    description: 'Khởi tạo UserTest thành công'
  })
  async initAllUsersTests(@I18nLang() lang: string) {
    const result = await this.userTestService.initAllUsersTests()
    const message =
      result.outcome === 'done'
        ? this.i18nService.translate(M.INIT_ALL_SUCCESS, lang, {
            tests: result.data.totalTests,
            users: result.data.totalUsers
          })
        : this.i18nService.translate(
            result.outcome === 'no-users' ? M.INIT_ALL_NO_USERS : M.INIT_ALL_NO_TESTS,
            lang
          )
    return { message, data: result.data }
  }

  @Post('auto-update-limit')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tự động cập nhật limit của UserTest theo Test (trừ PLACEMENT_TEST_DONE)'
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật limit thành công'
  })
  async runAutoTest() {
    return this.userTestService.runAutoTest()
  }
}
