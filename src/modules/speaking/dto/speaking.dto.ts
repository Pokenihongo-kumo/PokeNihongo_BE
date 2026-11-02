import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class UserSpeakingAttemptSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của lần thử phát âm' })
  id: number

  @ApiProperty({ example: 1, description: 'ID người dùng' })
  userId: number

  @ApiProperty({ example: 101, description: 'ID câu hỏi' })
  questionBankId: number

  @ApiProperty({
    example: 'https://example.com/user-audio.mp3',
    description: 'URL file âm thanh của user'
  })
  userAudioUrl: string

  @ApiPropertyOptional({
    example: 'こんにちは',
    description: 'Văn bản được chuyển đổi từ audio'
  })
  userTranscription?: string

  @ApiPropertyOptional({ example: 0.95, description: 'Độ tin cậy của Google API (0-1)' })
  confidence?: number

  @ApiPropertyOptional({ example: 85.5, description: 'Độ chính xác (0-100)' })
  accuracy?: number

  @ApiPropertyOptional({ example: 78.2, description: 'Điểm phát âm (0-100)' })
  pronunciation?: number

  @ApiPropertyOptional({ example: 82.1, description: 'Điểm độ trôi chảy (0-100)' })
  fluency?: number

  @ApiPropertyOptional({ example: 81.9, description: 'Điểm tổng (0-100)' })
  overallScore?: number

  @ApiPropertyOptional({ example: 1500, description: 'Thời gian xử lý (ms)' })
  processingTime?: number

  @ApiPropertyOptional({ description: 'Response từ Google API' })
  googleApiResponse?: any

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Thời gian tạo' })
  createdAt: Date

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Thời gian cập nhật' })
  updatedAt: Date
}

export class CreateUserSpeakingAttemptSwaggerDTO {
  @ApiProperty({ example: 101, description: 'ID câu hỏi' })
  questionBankId: number

  @ApiProperty({
    example: 'https://example.com/user-audio.mp3',
    description: 'URL file âm thanh của user'
  })
  userAudioUrl: string

  @ApiPropertyOptional({
    example: 'こんにちは',
    description: 'Văn bản được chuyển đổi từ audio'
  })
  userTranscription?: string

  @ApiPropertyOptional({ example: 0.95, description: 'Độ tin cậy của Google API (0-1)' })
  confidence?: number

  @ApiPropertyOptional({ example: 85.5, description: 'Độ chính xác (0-100)' })
  accuracy?: number

  @ApiPropertyOptional({ example: 78.2, description: 'Điểm phát âm (0-100)' })
  pronunciation?: number

  @ApiPropertyOptional({ example: 82.1, description: 'Điểm độ trôi chảy (0-100)' })
  fluency?: number

  @ApiPropertyOptional({ example: 81.9, description: 'Điểm tổng (0-100)' })
  overallScore?: number

  @ApiPropertyOptional({ example: 1500, description: 'Thời gian xử lý (ms)' })
  processingTime?: number

  @ApiPropertyOptional({ description: 'Response từ Google API' })
  googleApiResponse?: any
}

export class UpdateUserSpeakingAttemptSwaggerDTO {
  @ApiPropertyOptional({
    example: 'https://example.com/user-audio-updated.mp3',
    description: 'URL file âm thanh của user'
  })
  userAudioUrl?: string

  @ApiPropertyOptional({
    example: 'こんにちは',
    description: 'Văn bản được chuyển đổi từ audio'
  })
  userTranscription?: string

  @ApiPropertyOptional({ example: 0.95, description: 'Độ tin cậy của Google API (0-1)' })
  confidence?: number

  @ApiPropertyOptional({ example: 85.5, description: 'Độ chính xác (0-100)' })
  accuracy?: number

  @ApiPropertyOptional({ example: 78.2, description: 'Điểm phát âm (0-100)' })
  pronunciation?: number

  @ApiPropertyOptional({ example: 82.1, description: 'Điểm độ trôi chảy (0-100)' })
  fluency?: number

  @ApiPropertyOptional({ example: 81.9, description: 'Điểm tổng (0-100)' })
  overallScore?: number

  @ApiPropertyOptional({ example: 1500, description: 'Thời gian xử lý (ms)' })
  processingTime?: number

  @ApiPropertyOptional({ description: 'Response từ Google API' })
  googleApiResponse?: any
}

export class EvaluateSpeakingRequestSwaggerDTO {
  @ApiProperty({ example: 101, description: 'ID câu hỏi' })
  questionBankId: number

  @ApiPropertyOptional({
    example: 'https://example.com/user-audio.mp3',
    description: 'URL file âm thanh của user (optional nếu đã upload file audio)'
  })
  userAudioUrl?: string

  @ApiPropertyOptional({ example: 'ja-JP', description: 'Mã ngôn ngữ (mặc định: ja-JP)' })
  languageCode?: string
}

export class EvaluationResultSwaggerDTO {
  @ApiProperty({ example: 85.5, description: 'Độ chính xác (0-100)' })
  accuracy: number

  @ApiProperty({ example: 78.2, description: 'Điểm phát âm (0-100)' })
  pronunciation: number

  @ApiProperty({ example: 82.1, description: 'Điểm độ trôi chảy (0-100)' })
  fluency: number

  @ApiProperty({ example: 81.9, description: 'Điểm tổng (0-100)' })
  overallScore: number

  @ApiProperty({ example: 0.95, description: 'Độ tin cậy (0-1)' })
  confidence: number

  @ApiPropertyOptional({ example: 'こんにちは', description: 'Văn bản được chuyển đổi' })
  transcription?: string

  @ApiPropertyOptional({
    example: 'Phát âm tốt, cần cải thiện độ trôi chảy',
    description: 'Nhận xét'
  })
  feedback?: string
}

export class EvaluateSpeakingResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
  statusCode: number

  @ApiProperty({
    type: Object,
    description: 'Dữ liệu đánh giá phát âm',
    example: {
      userSpeakingAttempt: {},
      evaluation: {
        accuracy: 85.5,
        pronunciation: 78.2,
        fluency: 82.1,
        overallScore: 81.9,
        confidence: 0.95,
        transcription: 'こんにちは',
        feedback: 'Phát âm tốt, cần cải thiện độ trôi chảy'
      }
    }
  })
  data: {
    userSpeakingAttempt: UserSpeakingAttemptSwaggerDTO
    evaluation: EvaluationResultSwaggerDTO
  }

  @ApiProperty({ example: 'Đánh giá phát âm thành công', description: 'Thông báo' })
  message: string
}

export class GetUserSpeakingAttemptListQuerySwaggerDTO {
  @ApiPropertyOptional({ example: 1, description: 'Trang hiện tại' })
  currentPage?: string

  @ApiPropertyOptional({ example: 10, description: 'Số lượng mỗi trang' })
  pageSize?: string

  @ApiPropertyOptional({ example: 1, description: 'Lọc theo ID người dùng' })
  userId?: string

  @ApiPropertyOptional({ example: 101, description: 'Lọc theo ID câu hỏi' })
  questionBankId?: string

  @ApiPropertyOptional({ example: 70, description: 'Điểm tối thiểu' })
  minScore?: string

  @ApiPropertyOptional({ example: 90, description: 'Điểm tối đa' })
  maxScore?: string

  @ApiPropertyOptional({
    example: 'こんにちは',
    description: 'Tìm kiếm theo transcription'
  })
  search?: string
}

export class SpeakingStatisticsSwaggerDTO {
  @ApiProperty({ example: 150, description: 'Tổng số lần thử' })
  totalAttempts: number

  @ApiProperty({ example: 78.5, description: 'Điểm trung bình' })
  averageScore: number

  @ApiProperty({ example: 95.2, description: 'Điểm cao nhất' })
  bestScore: number

  @ApiProperty({
    example: { N5: 50, N4: 40, N3: 35, N2: 20, N1: 5 },
    description: 'Số lần thử theo cấp độ'
  })
  attemptsByLevel: Record<string, number>

  @ApiProperty({
    example: { VOCABULARY: 80, GRAMMAR: 40, SPEAKING: 30 },
    description: 'Số lần thử theo loại câu hỏi'
  })
  attemptsByType: Record<string, number>

  @ApiProperty({
    type: [UserSpeakingAttemptSwaggerDTO],
    description: 'Các lần thử gần đây'
  })
  recentAttempts: UserSpeakingAttemptSwaggerDTO[]
}

export class UserSpeakingAttemptResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
  statusCode: number

  @ApiProperty({
    type: UserSpeakingAttemptSwaggerDTO,
    description: 'Dữ liệu lần thử phát âm'
  })
  data: UserSpeakingAttemptSwaggerDTO

  @ApiProperty({
    example: 'Lấy thông tin lần thử phát âm thành công',
    description: 'Thông báo'
  })
  message: string
}

export class UserSpeakingAttemptListResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
  statusCode: number

  @ApiProperty({
    type: Object,
    description: 'Dữ liệu danh sách lần thử phát âm',
    example: {
      results: [],
      pagination: {
        current: 1,
        pageSize: 10,
        totalPage: 5,
        totalItem: 50
      }
    }
  })
  data: {
    results: UserSpeakingAttemptSwaggerDTO[]
    pagination: {
      current: number
      pageSize: number
      totalPage: number
      totalItem: number
    }
  }

  @ApiProperty({
    example: 'Lấy danh sách lần thử phát âm thành công',
    description: 'Thông báo'
  })
  message: string
}

export class SpeakingStatisticsResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
  statusCode: number

  @ApiProperty({
    type: SpeakingStatisticsSwaggerDTO,
    description: 'Dữ liệu thống kê phát âm'
  })
  data: SpeakingStatisticsSwaggerDTO

  @ApiProperty({ example: 'Lấy thống kê phát âm thành công', description: 'Thông báo' })
  message: string
}
