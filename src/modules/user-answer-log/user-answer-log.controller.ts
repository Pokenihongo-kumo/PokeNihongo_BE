import { I18nService } from '@/i18n/i18n.service'
import { UserAnswerLogMessage as M } from '@/i18n/message-keys'
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
  constructor(
    private readonly userAnswerLogService: UserAnswerLogService,
    private readonly i18nService: I18nService
  ) {}

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
  async create(@Body() body: CreateUserAnswerLogBodyDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(M.CREATE_SUCCESS, lang),
      data: await this.userAnswerLogService.create(body)
    }
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
  async upsert(
    @Body() body: CreateUserAnswerLogBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.CREATE_SUCCESS, lang),
      data: await this.userAnswerLogService.upsert(body, userId)
    }
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
  async findAll(@Query() query: GetUserAnswerLogListQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang),
      data: await this.userAnswerLogService.findAll(query)
    }
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
  async findOne(
    @Param() params: GetUserAnswerLogByIdParamsDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.GET_SUCCESS, lang),
      data: await this.userAnswerLogService.findOne(params.id)
    }
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
  async update(
    @Param() params: GetUserAnswerLogByIdParamsDTO,
    @Body() body: UpdateUserAnswerLogBodyDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.UPDATE_SUCCESS, lang),
      data: await this.userAnswerLogService.update(params.id, body)
    }
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
  async remove(@Param() params: GetUserAnswerLogByIdParamsDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(M.DELETE_SUCCESS, lang),
      data: await this.userAnswerLogService.remove(params.id)
    }
  }
}
