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
  async findAll(@Query() query: GetUserTestListQueryDTO) {
    return this.userTestService.findAll(query)
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
    @Query() query: any,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    // Map 'type' parameter to 'testType' for service
    const { type, ...restQuery } = query
    const queryParams: GetUserTestListQueryDTO = {
      ...restQuery,
      userId,
      ...(type && { testType: type })
    }

    return this.userTestService.findAll(queryParams, lang)
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin UserTest theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin UserTest thành công',
    type: UserTestResponseSwaggerDTO
  })
  async findOne(@Param('id') id: string) {
    return this.userTestService.findOne(Number(id))
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật UserTest theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật UserTest thành công',
    type: UserTestResponseSwaggerDTO
  })
  async update(@Param('id') id: string, @Body() body: UpdateUserTestBodyDTO) {
    return this.userTestService.update(Number(id), body)
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa UserTest theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Xóa UserTest thành công'
  })
  async delete(@Param('id') id: string) {
    return this.userTestService.delete(Number(id))
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
    return this.userTestService.initAllUsersTests()
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
