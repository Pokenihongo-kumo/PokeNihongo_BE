import { ActiveUser } from '@/common/decorators/active-user.decorator'
import {
  CreateUserTestAnswerLogBodyDTO,
  GetUserTestAnswerLogByIdParamsDTO,
  GetUserTestAnswerLogListQueryDTO,
  UpdateUserTestAnswerLogBodyDTO,
  UserTestAnswerLogListResDTO,
  UserTestAnswerLogResDTO
} from '@/modules/user-test-answer-log/dto/user-test-answer-log.zod-dto'
import {
  UserTestAnswerLogResponseSwaggerDTO,
  UserTestAnswerLogListResponseSwaggerDTO,
  GetUserTestAnswerLogListQuerySwaggerDTO,
  CreateUserTestAnswerLogSwaggerDTO,
  UpdateUserTestAnswerLogSwaggerDTO
} from '@/modules/user-test-answer-log/dto/user-test-answer-log.dto'
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
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { UserTestAnswerLogService } from './user-test-answer-log.service'

@ApiTags('User Test Answer Log')
@Controller('user-test-answer-log')
export class UserTestAnswerLogController {
  constructor(private readonly userTestAnswerLogService: UserTestAnswerLogService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo log câu trả lời test mới' })
  @ApiBody({ type: CreateUserTestAnswerLogSwaggerDTO })
  @ApiResponse({
    status: 201,
    description: 'Tạo log câu trả lời test thành công',
    type: UserTestAnswerLogResponseSwaggerDTO
  })
  @ZodSerializerDto(UserTestAnswerLogResDTO)
  create(@Body() body: CreateUserTestAnswerLogBodyDTO, @I18nLang() lang: string) {
    return this.userTestAnswerLogService.create(body, lang)
  }

  @Post('upsert')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Tạo hoặc cập nhật log câu trả lời test (nếu chưa có thì tạo, có rồi thì update)'
  })
  @ApiBody({ type: CreateUserTestAnswerLogSwaggerDTO })
  @ApiResponse({
    status: 201,
    description: 'Tạo/cập nhật log câu trả lời test thành công',
    type: UserTestAnswerLogResponseSwaggerDTO
  })
  @ZodSerializerDto(UserTestAnswerLogResDTO)
  upsert(
    @Body() body: CreateUserTestAnswerLogBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userTestAnswerLogService.upsert(body, userId, lang)
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách log câu trả lời test với phân trang và lọc' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách log câu trả lời test thành công',
    type: UserTestAnswerLogListResponseSwaggerDTO
  })
  @ApiQuery({ type: GetUserTestAnswerLogListQuerySwaggerDTO })
  @ZodSerializerDto(UserTestAnswerLogListResDTO)
  findAll(@Query() query: GetUserTestAnswerLogListQueryDTO, @I18nLang() lang: string) {
    return this.userTestAnswerLogService.findAll(query, lang)
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin log câu trả lời test theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin log câu trả lời test thành công',
    type: UserTestAnswerLogResponseSwaggerDTO
  })
  @ZodSerializerDto(UserTestAnswerLogResDTO)
  findOne(@Param() params: GetUserTestAnswerLogByIdParamsDTO, @I18nLang() lang: string) {
    return this.userTestAnswerLogService.findOne(params.id, lang)
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật log câu trả lời test theo ID' })
  @ApiBody({ type: UpdateUserTestAnswerLogSwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật log câu trả lời test thành công',
    type: UserTestAnswerLogResponseSwaggerDTO
  })
  @ZodSerializerDto(UserTestAnswerLogResDTO)
  update(
    @Param() params: GetUserTestAnswerLogByIdParamsDTO,
    @Body() body: UpdateUserTestAnswerLogBodyDTO,
    @I18nLang() lang: string
  ) {
    return this.userTestAnswerLogService.update(params.id, body, lang)
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa log câu trả lời test theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Xóa log câu trả lời test thành công',
    type: UserTestAnswerLogResponseSwaggerDTO
  })
  @ZodSerializerDto(UserTestAnswerLogResDTO)
  remove(@Param() params: GetUserTestAnswerLogByIdParamsDTO, @I18nLang() lang: string) {
    return this.userTestAnswerLogService.remove(params.id, lang)
  }
}
