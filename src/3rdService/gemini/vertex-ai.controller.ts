import {
  Body,
  Controller,
  Post,
  UseInterceptors,
  BadRequestException
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiBearerAuth,
  ApiResponse,
  ApiConsumes
} from '@nestjs/swagger'
import { AnyFilesInterceptor } from '@nestjs/platform-express'
import { VertexAIService } from './vertex-ai.service'
import { RecommendationsMultipartDto } from './dto/gemini.dto'
import { ActiveUser } from '@/common/decorators/active-user.decorator'

@ApiTags('Gemini Vertex AI (Service Account)')
@Controller('gemini/vertex-ai')
@ApiBearerAuth()
export class VertexAIController {
  constructor(private readonly vertexAIService: VertexAIService) {}

  // SRS-only recommendations (Vocabulary/Grammar/Kanji) + tạo SRS
  @Post('recommendations/srs')
  @UseInterceptors(AnyFilesInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Gợi ý ôn tập SRS (Vocabulary/Grammar/Kanji) - Dùng Vertex AI với Service Account'
  })
  @ApiBody({ type: RecommendationsMultipartDto })
  @ApiResponse({ status: 200, description: 'Lấy gợi ý thành công', type: Object })
  async getSrsRecommendations(
    @ActiveUser('userId') userId: number,
    @Body() body: RecommendationsMultipartDto
  ) {
    const limitNumber = body?.limit ? Number(body.limit) : 10
    if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 50) {
      throw new BadRequestException('Limit phải là số từ 1 đến 50')
    }

    const result = await this.vertexAIService.getPersonalizedRecommendations(
      userId,
      limitNumber,
      {
        createSrs: true,
        allowedTypes: ['VOCABULARY', 'GRAMMAR', 'KANJI']
      }
    )

    const ui = {
      title: 'Ôn lại để ghi nhớ',
      items: (result.recommendations || []).map((r: any) => ({
        contentType: r.contentType,
        contentId: r.contentId,
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
      'Gợi ý luyện kỹ năng (Reading/Listening/Speaking) - Dùng Vertex AI với Service Account'
  })
  @ApiBody({ type: RecommendationsMultipartDto })
  @ApiResponse({ status: 200, description: 'Lấy gợi ý thành công', type: Object })
  async getSkillRecommendations(
    @ActiveUser('userId') userId: number,
    @Body() body: RecommendationsMultipartDto
  ) {
    const limitNumber = body?.limit ? Number(body.limit) : 10
    if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 50) {
      throw new BadRequestException('Limit phải là số từ 1 đến 50')
    }

    const result = await this.vertexAIService.getPersonalizedRecommendations(
      userId,
      limitNumber,
      {
        createSrs: true, // Tạo SRS cho TEST/EXERCISE
        allowedTypes: ['TEST', 'EXERCISE'] // Chỉ recommend TEST/EXERCISE đã làm sai
      }
    )

    const ui = {
      title: 'Luyện kỹ năng để cải thiện',
      items: (result.recommendations || []).map((r: any) => ({
        contentType: r.contentType,
        contentId: r.contentId,
        reason: r.reason,
        priority: r.priority
      }))
    }

    return { statusCode: 200, data: ui, message: 'GET_SUCCESS' }
  }

  // General recommendations
  @Post('recommendations')
  @UseInterceptors(AnyFilesInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Lấy gợi ý cá nhân hóa - Dùng Vertex AI với Service Account' })
  @ApiBody({ type: RecommendationsMultipartDto })
  @ApiResponse({ status: 200, description: 'Lấy gợi ý thành công', type: Object })
  async getPersonalizedRecommendations(
    @ActiveUser('userId') userId: number,
    @Body() body: RecommendationsMultipartDto
  ) {
    const limitNumber = body?.limit ? Number(body.limit) : 10
    if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 50) {
      throw new BadRequestException('Limit phải là số từ 1 đến 50')
    }

    const result = await this.vertexAIService.getPersonalizedRecommendations(
      userId,
      limitNumber
    )

    const ui = {
      title: 'Làm lại để cải thiện',
      items: (result.recommendations || []).map((r: any) => ({
        contentType: r.contentType,
        contentId: r.contentId,
        reason: r.reason,
        priority: r.priority
      }))
    }

    return { statusCode: 200, data: ui, message: 'Lấy gợi ý cá nhân hóa thành công' }
  }
}
