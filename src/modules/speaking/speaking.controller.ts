import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import {
  CreateUserSpeakingAttemptDTO,
  GetUserSpeakingAttemptByIdParamsDTO,
  GetUserSpeakingAttemptListQueryDTO,
  UpdateUserSpeakingAttemptDTO,
  UserSpeakingAttemptResDTO,
  UserSpeakingAttemptListResDTO,
  EvaluateSpeakingRequestDTO,
  EvaluateSpeakingResponseDTO,
  SpeakingStatisticsResDTO
} from './dto/speaking.zod-dto'
import {
  UserSpeakingAttemptResponseSwaggerDTO,
  UserSpeakingAttemptListResponseSwaggerDTO,
  GetUserSpeakingAttemptListQuerySwaggerDTO,
  CreateUserSpeakingAttemptSwaggerDTO,
  UpdateUserSpeakingAttemptSwaggerDTO,
  EvaluateSpeakingRequestSwaggerDTO,
  EvaluateSpeakingResponseSwaggerDTO,
  SpeakingStatisticsResponseSwaggerDTO
} from './dto/speaking.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
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
  Query,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { SpeakingService } from './speaking.service'
import { BadRequestException } from '@nestjs/common'

// Multer config cho audio file upload
const audioFileFilter = (
  req: any,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void
) => {
  const allowedMimeTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/m4a',
    'audio/x-m4a',
    'audio/ogg',
    'audio/aac',
    'audio/flac',
    'audio/webm',
    'audio/mp4'
  ]

  if (!file.mimetype || !allowedMimeTypes.includes(file.mimetype)) {
    return callback(
      new BadRequestException(
        'Chỉ chấp nhận file audio (mp3, wav, m4a, ogg, aac, flac, webm)'
      ),
      false
    )
  }
  callback(null, true)
}

const audioUploadOptions = {
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: audioFileFilter
}

@ApiTags('Speaking')
@Controller('speaking')
export class SpeakingController {
  constructor(private readonly speakingService: SpeakingService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo lần thử phát âm mới' })
  @ApiResponse({
    status: 201,
    description: 'Tạo lần thử phát âm thành công',
    type: UserSpeakingAttemptResponseSwaggerDTO
  })
  @ZodSerializerDto(UserSpeakingAttemptResDTO)
  async createUserSpeakingAttempt(
    @Body() body: CreateUserSpeakingAttemptDTO,
    @ActiveUser('userId') userId: number
  ): Promise<MessageResDTO> {
    return this.speakingService.createUserSpeakingAttempt(body, userId)
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách lần thử phát âm với phân trang và tìm kiếm' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách lần thử phát âm thành công',
    type: UserSpeakingAttemptListResponseSwaggerDTO
  })
  @ApiResponse({ type: GetUserSpeakingAttemptListQuerySwaggerDTO })
  @ZodSerializerDto(UserSpeakingAttemptListResDTO)
  async getUserSpeakingAttempts(
    @Query() query: GetUserSpeakingAttemptListQueryDTO,
    @I18nLang() lang: string
  ): Promise<MessageResDTO> {
    return this.speakingService.getUserSpeakingAttempts(query)
  }

  @Get('my-attempts')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách lần thử phát âm của user hiện tại' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách lần thử phát âm của user thành công',
    type: UserSpeakingAttemptListResponseSwaggerDTO
  })
  @ZodSerializerDto(UserSpeakingAttemptListResDTO)
  async getMySpeakingAttempts(
    @ActiveUser('userId') userId: number
  ): Promise<MessageResDTO> {
    return this.speakingService.getUserSpeakingAttemptsByUserId(userId)
  }

  @Get('statistics')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thống kê phát âm' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thống kê phát âm thành công',
    type: SpeakingStatisticsResponseSwaggerDTO
  })
  @ZodSerializerDto(SpeakingStatisticsResDTO)
  async getSpeakingStatistics(
    @ActiveUser('userId') userId: number
  ): Promise<MessageResDTO> {
    return this.speakingService.getSpeakingStatistics(userId)
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin lần thử phát âm theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin lần thử phát âm thành công',
    type: UserSpeakingAttemptResponseSwaggerDTO
  })
  @ZodSerializerDto(UserSpeakingAttemptResDTO)
  async getUserSpeakingAttemptById(
    @Param('id') id: string,
    @I18nLang() lang: string
  ): Promise<MessageResDTO> {
    return this.speakingService.getUserSpeakingAttemptById(Number(id))
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật lần thử phát âm theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật lần thử phát âm thành công',
    type: UserSpeakingAttemptResponseSwaggerDTO
  })
  @ZodSerializerDto(UserSpeakingAttemptResDTO)
  async updateUserSpeakingAttempt(
    @Param('id') id: string,
    @Body() body: UpdateUserSpeakingAttemptDTO
  ): Promise<MessageResDTO> {
    return this.speakingService.updateUserSpeakingAttempt(Number(id), body)
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa lần thử phát âm theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Xóa lần thử phát âm thành công',
    type: UserSpeakingAttemptResponseSwaggerDTO
  })
  @ZodSerializerDto(UserSpeakingAttemptResDTO)
  async deleteUserSpeakingAttempt(@Param('id') id: string): Promise<MessageResDTO> {
    return this.speakingService.deleteUserSpeakingAttempt(Number(id))
  }

  @Post('evaluate')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('audio', audioUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Đánh giá phát âm bằng Google Speech-to-Text API',
    description:
      'Gửi file âm thanh để đánh giá phát âm và lưu kết quả. Có thể upload file audio hoặc gửi URL audio'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        audio: {
          type: 'string',
          format: 'binary',
          description:
            'File audio (mp3, wav, m4a). Nếu không có file, có thể dùng userAudioUrl'
        },
        questionBankId: {
          type: 'number',
          description: 'ID câu hỏi',
          example: 101
        },
        userAudioUrl: {
          type: 'string',
          description: 'URL file audio (optional nếu đã upload file)',
          example: 'https://example.com/user-audio.mp3'
        },
        languageCode: {
          type: 'string',
          description: 'Mã ngôn ngữ (mặc định: ja-JP)',
          example: 'ja-JP'
        }
      },
      required: ['questionBankId']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Đánh giá phát âm thành công',
    type: EvaluateSpeakingResponseSwaggerDTO
  })
  @ZodSerializerDto(EvaluateSpeakingResponseDTO)
  async evaluateSpeaking(
    @UploadedFile() audioFile: Express.Multer.File,
    @Body() body: EvaluateSpeakingRequestDTO,
    @ActiveUser('userId') userId: number
  ): Promise<MessageResDTO> {
    return this.speakingService.evaluateSpeaking(body, userId, audioFile)
  }
}
