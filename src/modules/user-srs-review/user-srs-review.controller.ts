import { ResponseMessage } from '@/i18n/response-message'
import { SrsReviewMessage as M } from '@/i18n/message-keys'
import {
  Controller,
  Get,
  Query,
  Param,
  Post,
  Body,
  Patch,
  HttpCode,
  HttpStatus
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
import { SrsReviewService } from './user-srs-review.service'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import {
  UpsertSrsReviewDto,
  ReviewActionDto,
  ListSrsQueryDto,
  ListSrsTodayQueryDto,
  SrsReviewIdParamsDto
} from './dto/user-srs-review.zod-dto'
import { ApiBody, ApiResponse } from '@nestjs/swagger'
import {
  ListSrsQuerySwaggerDTO,
  ListSrsTodayQuerySwaggerDTO,
  ReviewActionSwaggerDTO,
  SrsReviewSwaggerDTO,
  UpsertSrsReviewSwaggerDTO
} from './dto/user-srs-review.dto'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'

@ApiTags('User SRS Review')
@ApiBearerAuth()
@Controller('user-srs-review')
export class SrsReviewController {
  constructor(private readonly srsService: SrsReviewService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách SRS của user' })
  @ApiQuery({ type: ListSrsQuerySwaggerDTO })
  @ApiResponse({ status: 200, type: SrsReviewSwaggerDTO, isArray: true })
  // The service answers the whole envelope (this used to wrap it in a second
  // one with message 'GET_SUCCESS')
  @ResponseMessage(M.GET_LIST_SUCCESS)
  async list(@ActiveUser('userId') userId: number, @Query() query: ListSrsQueryDto) {
    return this.srsService.list(userId, query)
  }

  @Get('my')
  @ApiOperation({ summary: 'Danh sách SRS cần ôn trong ngày của user' })
  @ApiQuery({ type: ListSrsTodayQuerySwaggerDTO })
  @ApiResponse({ status: 200, type: SrsReviewSwaggerDTO, isArray: true })
  @ResponseMessage(M.GET_LIST_SUCCESS)
  async listMyToday(
    @ActiveUser('userId') userId: number,
    @Query() query: ListSrsTodayQueryDto,
    @I18nLang() lang: string
  ) {
    return this.srsService.listToday(userId, query, lang)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy SRS theo contentType + contentId' })
  @ResponseMessage(M.GET_SUCCESS)
  async getOne(
    @ActiveUser('userId') userId: number,
    @Param() params: SrsReviewIdParamsDto,
    @I18nLang() lang: string
  ) {
    return this.srsService.getDetailBySrsId(userId, params.id, lang)
  }

  @Post('upsert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tạo hoặc cập nhật SRS cho 1 nội dung' })
  @ApiBody({ type: UpsertSrsReviewSwaggerDTO })
  @ApiResponse({ status: 200, type: SrsReviewSwaggerDTO })
  @ResponseMessage(M.UPSERT_SUCCESS)
  async upsert(@ActiveUser('userId') userId: number, @Body() body: UpsertSrsReviewDto) {
    return this.srsService.upsert(userId, body)
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu đã đọc SRS review (theo id)' })
  @ApiParam({ name: 'id', description: 'ID của SRS review', example: 1 })
  @ApiResponse({ status: 200, type: SrsReviewSwaggerDTO })
  @ResponseMessage(M.UPDATE_SUCCESS)
  async markRead(
    @ActiveUser('userId') userId: number,
    @Param() params: SrsReviewIdParamsDto
  ) {
    return this.srsService.markRead(userId, params.id)
  }
}
