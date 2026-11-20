import { ResponseMessage } from '@/i18n/response-message'
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
  @ResponseMessage(M.CREATE_SUCCESS)
  async create(@Body() body: CreateUserAnswerLogBodyDTO) {
    return this.userAnswerLogService.create(body)
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
  @ResponseMessage(M.CREATE_SUCCESS)
  async upsert(
    @Body() body: CreateUserAnswerLogBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userAnswerLogService.upsert(body, userId)
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
  @ResponseMessage(M.GET_LIST_SUCCESS)
  async findAll(@Query() query: GetUserAnswerLogListQueryDTO) {
    return this.userAnswerLogService.findAll(query)
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
  @ResponseMessage(M.GET_SUCCESS)
  async findOne(@Param() params: GetUserAnswerLogByIdParamsDTO) {
    return this.userAnswerLogService.findOne(params.id)
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
  @ResponseMessage(M.UPDATE_SUCCESS)
  async update(
    @Param() params: GetUserAnswerLogByIdParamsDTO,
    @Body() body: UpdateUserAnswerLogBodyDTO
  ) {
    return this.userAnswerLogService.update(params.id, body)
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
  @ResponseMessage(M.DELETE_SUCCESS)
  async remove(@Param() params: GetUserAnswerLogByIdParamsDTO) {
    return this.userAnswerLogService.remove(params.id)
  }
}
