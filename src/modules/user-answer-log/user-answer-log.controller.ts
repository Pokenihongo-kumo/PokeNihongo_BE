import { ActiveUser } from '@/common/decorators/active-user.decorator'
import {
  CreateUserAnswerLogBodyDTO,
  GetUserAnswerLogByIdParamsDTO,
  GetUserAnswerLogListQueryDTO,
  UpdateUserAnswerLogBodyDTO,
  UserAnswerLogListResDTO,
  UserAnswerLogResDTO
} from '@/modules/user-answer-log/dto/user-answer-log.zod-dto'
import {
  UserAnswerLogResponseSwaggerDTO,
  UserAnswerLogListResponseSwaggerDTO,
  GetUserAnswerLogListQuerySwaggerDTO,
  CreateUserAnswerLogSwaggerDTO,
  UpdateUserAnswerLogSwaggerDTO
} from '@/modules/user-answer-log/dto/user-answer-log.dto'
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
import { UserAnswerLogService } from './user-answer-log.service'

@ApiTags('User Answer Log')
@Controller('user-answer-log')
export class UserAnswerLogController {
  constructor(private readonly userAnswerLogService: UserAnswerLogService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo log câu trả lời mới' })
  @ApiBody({ type: CreateUserAnswerLogSwaggerDTO })
  @ApiResponse({
    status: 201,
    description: 'Tạo log câu trả lời thành công',
    type: UserAnswerLogResponseSwaggerDTO
  })
  @ZodSerializerDto(UserAnswerLogResDTO)
  create(@Body() body: CreateUserAnswerLogBodyDTO, @I18nLang() lang: string) {
    return this.userAnswerLogService.create(body, lang)
  }

  @Post('upsert')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tạo hoặc cập nhật log câu trả lời (nếu chưa có thì tạo, có rồi thì update)'
  })
  @ApiBody({ type: CreateUserAnswerLogSwaggerDTO })
  @ApiResponse({
    status: 201,
    description: 'Tạo/cập nhật log câu trả lời thành công',
    type: UserAnswerLogResponseSwaggerDTO
  })
  @ZodSerializerDto(UserAnswerLogResDTO)
  upsert(
    @Body() body: CreateUserAnswerLogBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userAnswerLogService.upsert(body, userId, lang)
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách log câu trả lời với phân trang và lọc' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách log câu trả lời thành công',
    type: UserAnswerLogListResponseSwaggerDTO
  })
  @ApiQuery({ type: GetUserAnswerLogListQuerySwaggerDTO })
  @ZodSerializerDto(UserAnswerLogListResDTO)
  findAll(@Query() query: GetUserAnswerLogListQueryDTO, @I18nLang() lang: string) {
    return this.userAnswerLogService.findAll(query, lang)
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin log câu trả lời theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin log câu trả lời thành công',
    type: UserAnswerLogResponseSwaggerDTO
  })
  @ZodSerializerDto(UserAnswerLogResDTO)
  findOne(@Param() params: GetUserAnswerLogByIdParamsDTO, @I18nLang() lang: string) {
    return this.userAnswerLogService.findOne(params.id, lang)
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật log câu trả lời theo ID' })
  @ApiBody({ type: UpdateUserAnswerLogSwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật log câu trả lời thành công',
    type: UserAnswerLogResponseSwaggerDTO
  })
  @ZodSerializerDto(UserAnswerLogResDTO)
  update(
    @Param() params: GetUserAnswerLogByIdParamsDTO,
    @Body() body: UpdateUserAnswerLogBodyDTO,
    @I18nLang() lang: string
  ) {
    return this.userAnswerLogService.update(params.id, body, lang)
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa log câu trả lời theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Xóa log câu trả lời thành công',
    type: UserAnswerLogResponseSwaggerDTO
  })
  @ZodSerializerDto(UserAnswerLogResDTO)
  remove(@Param() params: GetUserAnswerLogByIdParamsDTO, @I18nLang() lang: string) {
    return this.userAnswerLogService.remove(params.id, lang)
  }
}
