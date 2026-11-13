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
  ListSrsTodayQueryDto
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
  async list(@ActiveUser('userId') userId: number, @Query() query: ListSrsQueryDto) {
    const data = await this.srsService.list(userId, query)
    return { statusCode: 200, data, message: 'GET_SUCCESS' }
  }

  @Get('my')
  @ApiOperation({ summary: 'Danh sách SRS cần ôn trong ngày của user' })
  @ApiQuery({ type: ListSrsTodayQuerySwaggerDTO })
  @ApiResponse({ status: 200, type: SrsReviewSwaggerDTO, isArray: true })
  async listMyToday(
    @ActiveUser('userId') userId: number,
    @Query() query: ListSrsTodayQueryDto,
    @I18nLang() languageCode: string
  ) {
    const data = await this.srsService.listToday(userId, query, languageCode)
    return { statusCode: 200, data, message: 'GET_SUCCESS' }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy SRS theo contentType + contentId' })
  async getOne(
    @ActiveUser('userId') userId: number,
    @Param('id') id: string,
    @I18nLang() languageCode: string
  ) {
    return this.srsService.getDetailBySrsId(userId, Number(id), languageCode)
  }

  @Post('upsert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tạo hoặc cập nhật SRS cho 1 nội dung' })
  @ApiBody({ type: UpsertSrsReviewSwaggerDTO })
  @ApiResponse({ status: 200, type: SrsReviewSwaggerDTO })
  async upsert(@ActiveUser('userId') userId: number, @Body() body: UpsertSrsReviewDto) {
    const data = await this.srsService.upsert(userId, body)
    return { statusCode: 200, data, message: 'UPSERT_SUCCESS' }
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu đã đọc SRS review (theo id)' })
  @ApiParam({ name: 'id', description: 'ID của SRS review', example: 1 })
  @ApiResponse({ status: 200, type: SrsReviewSwaggerDTO })
  async markRead(@ActiveUser('userId') userId: number, @Param('id') id: string) {
    const data = await this.srsService.markRead(userId, Number(id))
    return { statusCode: 200, data, message: 'UPDATE_SUCCESS' }
  }
}
