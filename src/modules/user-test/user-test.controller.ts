import { msg, ResponseMessage } from '@/i18n/response-message'
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
  constructor(private readonly userTestService: UserTestService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo UserTest mới' })
  @ApiResponse({
    status: 201,
    description: 'Tạo UserTest thành công',
    type: UserTestResponseSwaggerDTO
  })
  @ResponseMessage(M.CREATE_SUCCESS)
  async create(@Body() body: CreateUserTestBodyDTO) {
    return this.userTestService.create(body)
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
  @ResponseMessage(M.GET_LIST_SUCCESS)
  async findAll(@Query() query: GetUserTestListQueryDTO, @I18nLang() lang: string) {
    return this.userTestService.findAll(query, lang)
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
  @ResponseMessage(M.GET_LIST_SUCCESS)
  async getMy(
    @Query() query: GetUserTestMyListQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    const { type, ...rest } = query
    return this.userTestService.findAll({ ...rest, userId, testType: type }, lang, true)
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin UserTest theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin UserTest thành công',
    type: UserTestResponseSwaggerDTO
  })
  @ResponseMessage(M.GET_SUCCESS)
  async findOne(@Param() { id }: GetUserTestByIdParamsDTO) {
    return this.userTestService.findOne(id)
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật UserTest theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật UserTest thành công',
    type: UserTestResponseSwaggerDTO
  })
  @ResponseMessage(M.UPDATE_SUCCESS)
  async update(
    @Param() { id }: GetUserTestByIdParamsDTO,
    @Body() body: UpdateUserTestBodyDTO
  ) {
    return this.userTestService.update(id, body)
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa UserTest theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Xóa UserTest thành công'
  })
  @ResponseMessage(M.DELETE_SUCCESS)
  async delete(@Param() { id }: GetUserTestByIdParamsDTO) {
    await this.userTestService.delete(id)
  }

  @Post('init-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Khởi tạo UserTest cho TẤT CẢ user trong hệ thống' })
  @ApiResponse({
    status: 200,
    description: 'Khởi tạo UserTest thành công'
  })
  async initAllUsersTests() {
    const result = await this.userTestService.initAllUsersTests()
    const message =
      result.outcome === 'done'
        ? msg(M.INIT_ALL_SUCCESS, {
            tests: result.data.totalTests,
            users: result.data.totalUsers
          })
        : msg(result.outcome === 'no-users' ? M.INIT_ALL_NO_USERS : M.INIT_ALL_NO_TESTS)
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
