import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Put,
  ForbiddenException,
  HttpCode,
  HttpStatus
} from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
  ApiConsumes
} from '@nestjs/swagger'
import { FileInterceptor, AnyFilesInterceptor } from '@nestjs/platform-express'
import { GeminiService } from './gemini.service'
import {
  RecommendationsMultipartDto,
  ListSavedRecommendationsQueryDto,
  UpdateRecommendationStatusDto
} from './dto/gemini.dto'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { SharedUserSubscriptionService } from '@/shared/services/user-subscription.service'
import { FeatureKey } from '@/common/constants/subscription.constant'
import {
  PRONUNCIATION_AUDIO_MAX_BYTES,
  PRONUNCIATION_AUDIO_MIME_TYPES,
  PronunciationAssessmentBodyDTO,
  PronunciationAssessmentResDTO
} from './dto/pronunciation-assessment.dto'

@ApiTags('Gemini')
@Controller('gemini')
@ApiBearerAuth()
export class GeminiController {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly userSubscriptionService: SharedUserSubscriptionService
  ) {}

  @Post('recommendations')
  @UseInterceptors(AnyFilesInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Lấy gợi ý cá nhân hóa dựa trên dữ liệu học tập' })
  @ApiBody({ type: RecommendationsMultipartDto })
  @ApiResponse({
    status: 200,
    description: 'Lấy gợi ý cá nhân hóa thành công',
    type: Object
  })
  async getPersonalizedRecommendations(
    @ActiveUser('userId') userId: number,
    @Body() body: RecommendationsMultipartDto
  ): Promise<{ statusCode: number; data: any; message: string }> {
    const limitNumber = body?.limit ? Number(body.limit) : 10
    if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 50) {
      throw new BadRequestException('Limit phải là số từ 1 đến 50')
    }
    const result = await this.geminiService.getPersonalizedRecommendations(
      userId,
      limitNumber
    )
    const rawItems = result.recommendations || []
    const filtered = rawItems.filter((r: any) => Number(r.targetId || r.contentId) > 0)
    if (rawItems.length !== filtered.length) {
      try {
        console.warn(
          `[RECOMMEND][UI] filtered out ${rawItems.length - filtered.length} invalid items (contentId<=0)`
        )
      } catch {}
    }
    const ui = {
      title: 'Làm lại để cải thiện',
      items: filtered.map((r: any) => ({
        contentType: r.targetType || r.contentType,
        contentId: r.targetId || r.contentId,
        reason: r.reason,
        priority: r.priority
      }))
    }
    return { statusCode: 200, data: ui, message: 'Lấy gợi ý cá nhân hóa thành công' }
  }

  // SRS-only recommendations (Vocabulary/Grammar/Kanji) + tạo SRS
  @Post('recommendations/srs')
  @UseInterceptors(AnyFilesInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Gợi ý ôn tập SRS (Vocabulary/Grammar/Kanji)' })
  @ApiBody({ type: RecommendationsMultipartDto })
  async getSrsRecommendations(
    @ActiveUser('userId') userId: number,
    @Body() body: RecommendationsMultipartDto,
    @I18nLang() lang: string
  ) {
    // Kiểm tra xem user có feature PERSONALIZED_RECOMMENDATIONS không
    const hasPersonalizedFeature =
      await this.userSubscriptionService.getHasByfeatureKeyAndUserId(
        FeatureKey.PERSONALIZED_RECOMMENDATIONS,
        userId
      )

    if (!hasPersonalizedFeature) {
      throw new ForbiddenException('Bạn cần nâng cấp gói để sử dụng tính năng này')
    }

    const limitNumber = body?.limit ? Number(body.limit) : 10
    if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 50) {
      throw new BadRequestException('Limit phải là số từ 1 đến 50')
    }
    const result = await this.geminiService.getPersonalizedRecommendations(
      userId,
      limitNumber,
      {
        createSrs: true,
        allowedTypes: ['VOCABULARY', 'GRAMMAR', 'KANJI'],
        lang: lang || 'vi' // Mặc định tiếng Việt nếu không có lang
      }
    )
    const rawItems = result.recommendations || []
    const filtered = rawItems.filter((r: any) => Number(r.targetId || r.contentId) > 0)
    if (rawItems.length !== filtered.length) {
      try {
        console.warn(
          `[RECOMMEND][UI] filtered out ${rawItems.length - filtered.length} invalid SRS items`
        )
      } catch {}
    }
    const ui = {
      title: 'Ôn lại để ghi nhớ',
      items: filtered.map((r: any) => ({
        contentType: r.targetType || r.contentType,
        contentId: r.targetId || r.contentId,
        questionBankId: r.sourceQuestionBankId || r.questionBankId,
        reason: r.reason,
        priority: r.priority
      }))
    }
    return { statusCode: 200, data: ui, message: 'GET_SUCCESS' }
  }

  // Skill recommendations (Reading/Listening/Speaking) - tạo SRS cho TEST/EXERCISE
  @Post('recommendations/skills')
  @UseInterceptors(AnyFilesInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Gợi ý luyện kỹ năng (Reading/Listening/Speaking) - recommend TEST/EXERCISE đã làm sai'
  })
  @ApiBody({ type: RecommendationsMultipartDto })
  async getSkillRecommendations(
    @ActiveUser('userId') userId: number,
    @Body() body: RecommendationsMultipartDto
  ) {
    const limitNumber = body?.limit ? Number(body.limit) : 10
    if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 50) {
      throw new BadRequestException('Limit phải là số từ 1 đến 50')
    }
    const result = await this.geminiService.getPersonalizedRecommendations(
      userId,
      limitNumber,
      {
        createSrs: true, // Tạo SRS cho TEST/EXERCISE
        allowedTypes: ['TEST', 'EXERCISE'] // Chỉ recommend TEST/EXERCISE đã làm sai
      }
    )
    const rawItems = result.recommendations || []
    const filtered = rawItems.filter((r: any) => Number(r.targetId || r.contentId) > 0)
    if (rawItems.length !== filtered.length) {
      try {
        console.warn(
          `[RECOMMEND][UI] filtered out ${rawItems.length - filtered.length} invalid skill items`
        )
      } catch {}
    }
    const ui = {
      title: 'Luyện kỹ năng để cải thiện',
      items: filtered.map((r: any) => ({
        contentType: r.targetType || r.contentType,
        contentId: r.targetId || r.contentId,
        reason: r.reason,
        priority: r.priority
      }))
    }
    return { statusCode: 200, data: ui, message: 'GET_SUCCESS' }
  }

  @Post('pronunciation-assessment')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('audio', {
      limits: { fileSize: PRONUNCIATION_AUDIO_MAX_BYTES },
      fileFilter: (_req, file, callback) =>
        PRONUNCIATION_AUDIO_MIME_TYPES.includes(file.mimetype)
          ? callback(null, true)
          : callback(new BadRequestException('File audio không hợp lệ'), false)
    })
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Chấm phát âm một câu tiếng Nhật so với câu mẫu',
    description:
      'multipart: audio (file ghi âm) + referenceText. Trả về JSON đánh giá của Gemini: Overall, TranscribedText, MatchScore, Syllables.'
  })
  @ZodSerializerDto(PronunciationAssessmentResDTO)
  async assessPronunciation(
    @Body() body: PronunciationAssessmentBodyDTO,
    @UploadedFile() audio?: Express.Multer.File
  ) {
    if (!audio) {
      throw new BadRequestException('Thiếu file audio')
    }
    const data = await this.geminiService.assessPronunciation(audio, body.referenceText)
    return { data, message: 'Đánh giá phát âm thành công' }
  }

  // Saved recommendations
  @Get('recommendations/saved')
  @ApiOperation({ summary: 'Danh sách recommendations đã lưu trong DB' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listSaved(
    @ActiveUser('userId') userId: number,
    @Query() query: ListSavedRecommendationsQueryDto,
    @I18nLang() lang: string
  ) {
    const limit = query?.limit && Number(query.limit) > 0 ? Number(query.limit) : 50
    const data = await this.geminiService.listSavedRecommendations(
      userId,
      query.status,
      limit,
      lang || 'vi'
    )
    return { statusCode: 200, data, message: 'GET_SUCCESS' }
  }

  // Saved recommendations
  @Get('recommendations/my')
  @ApiOperation({ summary: 'Danh sách recommendations của user' })
  async listMyRecommendations(@ActiveUser('userId') userId: number) {
    const data = await this.geminiService.listMyRecommendations(userId, 50, 'en')
    return { statusCode: 200, data, message: 'GET_SUCCESS' }
  }

  @Put('recommendations/:id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái recommendation' })
  async updateRecStatus(
    @ActiveUser('userId') userId: number,
    @Param('id') id: string,
    @Body() body: UpdateRecommendationStatusDto
  ) {
    const data = await this.geminiService.updateRecommendationStatus(
      userId,
      Number(id),
      body.status
    )
    return { statusCode: 200, data, message: 'UPDATE_SUCCESS' }
  }
}
