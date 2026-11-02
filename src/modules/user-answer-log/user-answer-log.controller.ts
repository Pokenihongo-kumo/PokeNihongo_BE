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
  create(@Body() body: CreateUserAnswerLogBodyDTO, @ActiveUser('userId') userId: number) {
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
  upsert(@Body() body: CreateUserAnswerLogBodyDTO, @ActiveUser('userId') userId: number) {
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
  findAll(@Query() query: GetUserAnswerLogListQueryDTO) {
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
  findOne(@Param('id') id: string) {
    return this.userAnswerLogService.findOne(Number(id))
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
    @Param('id') id: string,
    @Body() body: UpdateUserAnswerLogBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userAnswerLogService.update(Number(id), body)
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
  remove(@Param('id') id: string) {
    return this.userAnswerLogService.remove(Number(id))
  }
}
