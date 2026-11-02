import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common'
import { SpeakingRepository } from './speaking.repo'
import {
  CreateUserSpeakingAttemptType,
  UpdateUserSpeakingAttemptType,
  GetUserSpeakingAttemptListQueryType,
  EvaluateSpeakingRequestType,
  EvaluateSpeakingResponseType
} from './entities/speaking.entities'
import {
  UserSpeakingAttemptNotFoundException,
  InvalidUserSpeakingAttemptDataException,
  QuestionBankNotFoundException,
  GoogleApiException,
  AudioProcessingException,
  EvaluationException,
  SPEAKING_MESSAGE
} from './dto/speaking.error'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { PrismaService } from '@/shared/services/prisma.service'
import { SpeechToTextService } from '@/3rdService/speech/speech-to-text.service'
import { TextToSpeechService } from '@/3rdService/speech/text-to-speech.service'
import { UploadService } from '@/3rdService/upload/upload.service'

@Injectable()
export class SpeakingService {
  private readonly logger = new Logger(SpeakingService.name)

  constructor(
    private readonly speakingRepo: SpeakingRepository,
    private readonly prisma: PrismaService,
    private readonly speechToTextService: SpeechToTextService,
    private readonly textToSpeechService: TextToSpeechService,
    private readonly uploadService: UploadService
  ) {}

  async createUserSpeakingAttempt(
    data: CreateUserSpeakingAttemptType,
    userId: number
  ): Promise<MessageResDTO> {
    try {
      const userSpeakingAttempt = await this.speakingRepo.create({
        ...data,
        userId
      })

      return {
        statusCode: 201,
        data: userSpeakingAttempt,
        message: SPEAKING_MESSAGE.CREATE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error creating user speaking attempt:', error)
      if (
        error instanceof HttpException ||
        error.message?.includes('không tồn tại') ||
        error.message?.includes('đã tồn tại')
      ) {
        throw error
      }
      throw InvalidUserSpeakingAttemptDataException
    }
  }

  async getUserSpeakingAttemptById(id: number): Promise<MessageResDTO> {
    const userSpeakingAttempt = await this.speakingRepo.findById(id)

    if (!userSpeakingAttempt) {
      throw UserSpeakingAttemptNotFoundException
    }

    return {
      statusCode: 200,
      data: userSpeakingAttempt,
      message: SPEAKING_MESSAGE.GET_SUCCESS
    }
  }

  async getUserSpeakingAttempts(
    query: GetUserSpeakingAttemptListQueryType
  ): Promise<MessageResDTO> {
    const { data, total } = await this.speakingRepo.findMany(query)
    const { currentPage, pageSize } = query
    const totalPage = Math.ceil(total / pageSize)

    return {
      statusCode: 200,
      data: {
        results: data,
        pagination: {
          current: currentPage,
          pageSize,
          totalPage,
          totalItem: total
        }
      },
      message: SPEAKING_MESSAGE.GET_LIST_SUCCESS
    }
  }

  async updateUserSpeakingAttempt(
    id: number,
    data: UpdateUserSpeakingAttemptType
  ): Promise<MessageResDTO> {
    try {
      const userSpeakingAttempt = await this.speakingRepo.update(id, data)

      return {
        statusCode: 200,
        data: userSpeakingAttempt,
        message: SPEAKING_MESSAGE.UPDATE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error updating user speaking attempt:', error)
      if (
        error instanceof HttpException ||
        error.message?.includes('không tồn tại') ||
        error.message?.includes('đã tồn tại')
      ) {
        throw error
      }
      throw InvalidUserSpeakingAttemptDataException
    }
  }

  async deleteUserSpeakingAttempt(id: number): Promise<MessageResDTO> {
    try {
      const userSpeakingAttempt = await this.speakingRepo.delete(id)

      return {
        statusCode: 200,
        data: userSpeakingAttempt,
        message: SPEAKING_MESSAGE.DELETE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error deleting user speaking attempt:', error)
      if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
        throw error
      }
      throw InvalidUserSpeakingAttemptDataException
    }
  }

  async getUserSpeakingAttemptsByUserId(userId: number): Promise<MessageResDTO> {
    const userSpeakingAttempts = await this.speakingRepo.findByUserId(userId)

    return {
      statusCode: 200,
      data: userSpeakingAttempts,
      message: SPEAKING_MESSAGE.GET_LIST_SUCCESS
    }
  }

  async getSpeakingStatistics(userId?: number): Promise<MessageResDTO> {
    const statistics = await this.speakingRepo.getStatistics(userId)

    return {
      statusCode: 200,
      data: statistics,
      message: SPEAKING_MESSAGE.GET_STATS_SUCCESS
    }
  }

  async evaluateSpeaking(
    data: EvaluateSpeakingRequestType,
    userId: number,
    audioFile?: Express.Multer.File
  ): Promise<MessageResDTO> {
    try {
      // Đảm bảo questionBankId là number (có thể là string từ multipart/form-data)
      const questionBankId =
        typeof data.questionBankId === 'string'
          ? parseInt(data.questionBankId, 10)
          : data.questionBankId

      if (isNaN(questionBankId) || questionBankId <= 0) {
        throw new HttpException('questionBankId không hợp lệ', HttpStatus.BAD_REQUEST)
      }

      // Kiểm tra QuestionBank tồn tại
      const questionBank = await this.prisma.questionBank.findUnique({
        where: { id: questionBankId }
      })

      if (!questionBank) {
        throw QuestionBankNotFoundException
      }

      // Xử lý file audio: upload file nếu có, hoặc dùng URL nếu không có file
      let userAudioUrl: string

      if (audioFile) {
        // Upload file audio lên storage
        this.logger.log(`Uploading audio file: ${audioFile.originalname}`)
        const uploadResult = await this.uploadService.uploadFile(
          audioFile,
          'speaking/audio'
        )
        userAudioUrl = uploadResult.url
        this.logger.log(`Audio uploaded successfully: ${userAudioUrl}`)
      } else if (data.userAudioUrl) {
        // Sử dụng URL đã cung cấp
        userAudioUrl = data.userAudioUrl
        this.logger.log(`Using provided audio URL: ${userAudioUrl}`)
      } else {
        // Không có file và không có URL
        throw new HttpException(
          SPEAKING_MESSAGE.AUDIO_URL_REQUIRED,
          HttpStatus.BAD_REQUEST
        )
      }

      // Use Google Speech-to-Text API for evaluation
      const startTime = Date.now()

      // Call Google Speech API for evaluation
      const evaluation = await this.evaluateSpeechWithGoogleAPI(
        userAudioUrl,
        data.languageCode
      )

      const processingTime = Date.now() - startTime

      // Tạo UserSpeakingAttempt
      const userSpeakingAttempt = await this.speakingRepo.create({
        questionBankId: questionBankId,
        userAudioUrl: userAudioUrl,
        userTranscription: evaluation.transcription,
        confidence: evaluation.confidence,
        accuracy: evaluation.accuracy,
        pronunciation: evaluation.pronunciation,
        fluency: evaluation.fluency,
        overallScore: evaluation.overallScore,
        processingTime,
        googleApiResponse: evaluation.rawResponse,
        userId
      })

      return {
        statusCode: 200,
        data: {
          userSpeakingAttempt,
          evaluation: {
            accuracy: evaluation.accuracy,
            pronunciation: evaluation.pronunciation,
            fluency: evaluation.fluency,
            overallScore: evaluation.overallScore,
            confidence: evaluation.confidence,
            transcription: evaluation.transcription,
            feedback: evaluation.feedback
          }
        },
        message: SPEAKING_MESSAGE.EVALUATE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error evaluating speaking:', error)
      if (error instanceof HttpException) {
        throw error
      }
      throw EvaluationException
    }
  }

  private async evaluateSpeechWithGoogleAPI(
    audioUrl: string,
    languageCode: string = 'ja-JP'
  ): Promise<any> {
    try {
      // Download audio file from URL
      const audioBuffer = await this.downloadAudioFile(audioUrl)

      // Convert audio to text using Google Speech-to-Text
      const speechResult = await this.speechToTextService.convertAudioToText(
        audioBuffer,
        {
          languageCode,
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: true,
          model: 'latest_long'
        }
      )

      // Calculate evaluation scores based on transcription and confidence
      const evaluation = this.calculateEvaluationScores(speechResult)

      return {
        transcription: speechResult.transcript,
        confidence: speechResult.confidence,
        accuracy: evaluation.accuracy,
        pronunciation: evaluation.pronunciation,
        fluency: evaluation.fluency,
        overallScore: evaluation.overallScore,
        feedback: evaluation.feedback,
        rawResponse: {
          results: [
            {
              alternatives: [
                {
                  transcript: speechResult.transcript,
                  confidence: speechResult.confidence
                }
              ]
            }
          ]
        }
      }
    } catch (error) {
      this.logger.error('Error in Google Speech evaluation:', error)
      throw GoogleApiException
    }
  }

  private async downloadAudioFile(audioUrl: string): Promise<Buffer> {
    try {
      // Use fetch to download the audio file
      const response = await fetch(audioUrl)
      if (!response.ok) {
        throw new Error(`Failed to download audio file: ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (error) {
      this.logger.error('Error downloading audio file:', error)
      throw AudioProcessingException
    }
  }

  private calculateEvaluationScores(speechResult: any): any {
    const { transcript, confidence } = speechResult

    // Base scores on confidence and transcript quality
    const baseScore = Math.min(confidence * 100, 100)

    // Calculate accuracy (how well the speech was recognized)
    const accuracy = Math.round(baseScore)

    // Calculate pronunciation (based on confidence and transcript length)
    const pronunciation = Math.round(baseScore * 0.9 + (transcript.length > 0 ? 10 : 0))

    // Calculate fluency (based on confidence and speech quality indicators)
    const fluency = Math.round(baseScore * 0.85 + (confidence > 0.8 ? 15 : 0))

    // Overall score is weighted average
    const overallScore = Math.round(accuracy * 0.4 + pronunciation * 0.3 + fluency * 0.3)

    // Generate feedback based on scores
    let feedback = ''
    if (overallScore >= 90) {
      feedback = 'Phát âm xuất sắc! Hãy tiếp tục luyện tập.'
    } else if (overallScore >= 80) {
      feedback = 'Phát âm tốt, cần cải thiện một chút về độ trôi chảy.'
    } else if (overallScore >= 70) {
      feedback = 'Phát âm khá tốt, hãy luyện tập thêm để cải thiện.'
    } else if (overallScore >= 60) {
      feedback = 'Cần luyện tập thêm về phát âm và độ trôi chảy.'
    } else {
      feedback = 'Hãy luyện tập nhiều hơn để cải thiện phát âm.'
    }

    return {
      accuracy,
      pronunciation,
      fluency,
      overallScore,
      feedback
    }
  }
}
