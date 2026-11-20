import { Injectable, Logger } from '@nestjs/common'
import { UploadService } from '@/modules/upload/upload.service'
import { exec } from 'child_process'
import { promisify } from 'util'
import { tmpdir } from 'os'
import { join } from 'path'
import { writeFile, unlink, readFile } from 'fs/promises'
import { randomUUID } from 'crypto'

const execAsync = promisify(exec)

/**
 * Kaiwa audio without the socket: decoding the client payload, ffmpeg and
 * WAV conversion, the Japanese text check and the upload (phase 6 X7).
 */
@Injectable()
export class KaiwaAudioService {
  private readonly logger = new Logger(KaiwaAudioService.name)

  constructor(private readonly uploadService: UploadService) {}

  /**
   * Validate xem text có chứa tiếng Nhật không
   * Kiểm tra xem có ít nhất một ký tự tiếng Nhật (Hiragana, Katakana, Kanji)
   * và không có quá nhiều ký tự Latin (a-z, A-Z) - cho phép một số ký tự Latin cho punctuation
   *
   * @param text - Text cần validate
   * @returns true nếu có vẻ là tiếng Nhật, false nếu không
   */
  isValidJapaneseText(text: string): boolean {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return false
    }

    // Loại bỏ whitespace và punctuation thông thường để kiểm tra
    const trimmedText = text.trim()

    // Kiểm tra có chứa ký tự tiếng Nhật (Hiragana, Katakana, Kanji)
    // Unicode ranges:
    // - Hiragana: \u3040-\u309F
    // - Katakana: \u30A0-\u30FF
    // - Kanji: \u4E00-\u9FAF (CJK Unified Ideographs)
    // - Extended Kanji: \u3400-\u4DBF, \u20000-\u2A6DF, etc.
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]/
    const hasJapanese = japaneseRegex.test(trimmedText)

    if (!hasJapanese) {
      return false
    }

    // Kiểm tra xem có quá nhiều ký tự Latin không (không phải tiếng Nhật)
    // Cho phép một số ký tự Latin cho punctuation và số, nhưng nếu có quá nhiều thì không phải tiếng Nhật
    const latinChars = (trimmedText.match(/[a-zA-Z]/g) || []).length
    const totalChars = trimmedText.replace(/\s/g, '').length

    // Nếu có hơn 30% là ký tự Latin, có thể không phải tiếng Nhật
    if (totalChars > 0 && latinChars / totalChars > 0.3) {
      return false
    }

    return true
  }

  /**
   * Parse audio payload và detect format
   * Hỗ trợ nhiều format: Buffer, Uint8Array, object với audio field, base64 string
   * Auto-detect format từ metadata hoặc buffer header
   * @param payload - Audio payload từ client (có thể là Buffer, Uint8Array, object, hoặc base64 string)
   * @param requestId - Request ID cho logging
   * @returns Object chứa audioBuffer, audioFormat, mimeType
   * @throws Error nếu payload không hợp lệ
   */
  parseAudioPayload(
    payload: any,
    requestId: string
  ): {
    audioBuffer: Buffer
    audioFormat: 'LINEAR16' | 'MP4' | 'M4A' | 'OGG' | 'WEBM'
    mimeType: string
  } {
    this.logger.log(`[Kaiwa] [${requestId}] [PARSE_AUDIO] Starting parseAudioPayload`)
    let audioBuffer: Buffer
    let audioFormat: 'LINEAR16' | 'MP4' | 'M4A' | 'OGG' | 'WEBM' = 'LINEAR16' // Default cho web browser
    let mimeType: string = 'audio/wav' // Default

    // Parse payload thành Buffer
    if (Buffer.isBuffer(payload)) {
      this.logger.log(
        `[Kaiwa] [${requestId}] [PARSE_AUDIO] Payload is Buffer, size: ${payload.length} bytes`
      )
      audioBuffer = payload
    } else if (payload instanceof Uint8Array) {
      this.logger.log(
        `[Kaiwa] [${requestId}] [PARSE_AUDIO] Payload is Uint8Array, size: ${payload.length} bytes`
      )
      audioBuffer = Buffer.from(payload)
      this.logger.log(
        `[Kaiwa] [${requestId}] [PARSE_AUDIO] Converted Uint8Array to Buffer, size: ${audioBuffer.length} bytes`
      )
    } else if (payload && typeof payload === 'object') {
      this.logger.log(
        `[Kaiwa] [${requestId}] [PARSE_AUDIO] Payload is object, checking audio field...`
      )
      // Nếu là object có field audio và có thể có metadata
      if (payload.audio) {
        if (payload.audio instanceof Uint8Array) {
          this.logger.log(
            `[Kaiwa] [${requestId}] [PARSE_AUDIO] payload.audio is Uint8Array, size: ${payload.audio.length} bytes`
          )
          audioBuffer = Buffer.from(payload.audio)
          this.logger.log(
            `[Kaiwa] [${requestId}] [PARSE_AUDIO] Converted payload.audio (Uint8Array) to Buffer, size: ${audioBuffer.length} bytes`
          )
        } else if (Buffer.isBuffer(payload.audio)) {
          this.logger.log(
            `[Kaiwa] [${requestId}] [PARSE_AUDIO] payload.audio is Buffer, size: ${payload.audio.length} bytes`
          )
          audioBuffer = payload.audio
        } else {
          this.logger.error(
            `[Kaiwa] [${requestId}] [PARSE_AUDIO] ERROR: payload.audio is ${typeof payload.audio}, not Uint8Array or Buffer`
          )
          throw new Error('Invalid audio format: must be Uint8Array or Buffer')
        }
      } else {
        this.logger.error(
          `[Kaiwa] [${requestId}] [PARSE_AUDIO] ERROR: payload object does not have audio field`
        )
        throw new Error('Invalid payload: object must have audio field')
      }

      // Detect format từ metadata (nếu có)
      if (payload.format) {
        audioFormat = payload.format.toUpperCase() as any
        this.logger.log(
          `[Kaiwa] [${requestId}] [PARSE_AUDIO] Using format from metadata: ${audioFormat}`
        )
      }
      if (payload.mimeType) {
        mimeType = payload.mimeType
        this.logger.log(
          `[Kaiwa] [${requestId}] [PARSE_AUDIO] Using mimeType from metadata: ${mimeType}`
        )
      }
    } else if (typeof payload === 'string') {
      this.logger.log(
        `[Kaiwa] [${requestId}] [PARSE_AUDIO] Payload is string (base64), length: ${payload.length} chars`
      )
      // Nếu là base64 string
      try {
        audioBuffer = Buffer.from(payload, 'base64')
        this.logger.log(
          `[Kaiwa] [${requestId}] [PARSE_AUDIO] Decoded base64 to Buffer, size: ${audioBuffer.length} bytes`
        )
      } catch (e) {
        this.logger.error(
          `[Kaiwa] [${requestId}] [PARSE_AUDIO] ERROR: Failed to decode base64: ${e.message}`
        )
        throw new Error(`Failed to decode base64 audio: ${e.message}`)
      }
    } else {
      this.logger.error(
        `[Kaiwa] [${requestId}] [PARSE_AUDIO] ERROR: Invalid payload type: ${typeof payload}`
      )
      throw new Error(
        `Invalid payload type: expected Buffer, Uint8Array, or object with audio field, got ${typeof payload}`
      )
    }

    // Auto-detect format từ buffer header nếu chưa có metadata
    // Chỉ detect nếu chưa có format từ metadata
    if (audioFormat === 'LINEAR16' && audioBuffer.length >= 12) {
      const header0_4 = audioBuffer.toString('ascii', 0, 4)
      const header4_8 = audioBuffer.length >= 8 ? audioBuffer.toString('ascii', 4, 8) : ''
      const header8_12 =
        audioBuffer.length >= 12 ? audioBuffer.toString('ascii', 8, 12) : ''

      // Check CAFF format (Core Audio Format - iOS/macOS)
      if (header0_4 === 'caff') {
        // CAFF file (Core Audio Format của iOS/macOS)
        // CAFF có thể chứa nhiều codec, nhưng thường được Google Speech API xử lý như LINEAR16
        audioFormat = 'LINEAR16' // Xử lý như LINEAR16 (đã hoạt động trên máy ảo)
        mimeType = 'audio/x-caf' // Core Audio Format
        this.logger.log(
          `[Kaiwa] [${requestId}] Detected CAFF format from header (Core Audio Format - iOS/macOS)`
        )
      }
      // Check WAV format (RIFF...WAVE)
      else if (header0_4 === 'RIFF' && header8_12 === 'WAVE') {
        // WAV file (đã có header, không cần convert)
        audioFormat = 'LINEAR16' // Vẫn dùng LINEAR16 nhưng đã là WAV format
        mimeType = 'audio/wav'
        this.logger.log(`[Kaiwa] [${requestId}] Detected WAV format from header`)
      }
      // Check MP4/M4A format (ftyp ở byte 4)
      else if (
        header4_8 === 'ftyp' ||
        header4_8.includes('mp4') ||
        header4_8.includes('M4A') ||
        header4_8.includes('isom') ||
        header4_8.includes('qt  ')
      ) {
        // MP4/M4A file (header thường ở byte 4)
        audioFormat =
          header4_8.includes('M4A') || header4_8.includes('M4A ') ? 'M4A' : 'MP4'
        mimeType = 'audio/mp4'
        this.logger.log(
          `[Kaiwa] [${requestId}] Detected ${audioFormat} format from header (${header4_8})`
        )
      }
      // Check OGG format
      else if (header0_4 === 'OggS') {
        // OGG file
        audioFormat = 'OGG'
        mimeType = 'audio/ogg'
        this.logger.log(`[Kaiwa] [${requestId}] Detected OGG format from header`)
      }
      // Check WEBM format
      else if (header0_4 === 'RIFF' && header8_12 === 'WEBM') {
        // WEBM file
        audioFormat = 'WEBM'
        mimeType = 'audio/webm'
        this.logger.log(`[Kaiwa] [${requestId}] Detected WEBM format from header`)
      } else {
        // Raw LINEAR16 PCM (không có header) - sẽ convert sang WAV
        this.logger.log(
          `[Kaiwa] [${requestId}] No format header detected (header0_4: "${header0_4}", header4_8: "${header4_8}"), assuming LINEAR16 PCM (will convert to WAV)`
        )
      }
    } else if (audioFormat === 'LINEAR16') {
      // Buffer quá ngắn, assume là raw PCM
      this.logger.log(
        `[Kaiwa] [${requestId}] [PARSE_AUDIO] Buffer too short (${audioBuffer.length} bytes) for format detection, assuming LINEAR16 PCM (will convert to WAV)`
      )
    }

    // Log kết quả cuối cùng
    this.logger.log(
      `[Kaiwa] [${requestId}] [PARSE_AUDIO] Parse completed - finalBufferSize: ${audioBuffer.length} bytes, format: ${audioFormat}, mimeType: ${mimeType}`
    )
    if (audioBuffer.length > 0) {
      const headerPreview = audioBuffer.slice(0, Math.min(12, audioBuffer.length))
      this.logger.log(
        `[Kaiwa] [${requestId}] [PARSE_AUDIO] Final buffer header (hex): ${headerPreview.toString('hex')}`
      )
    } else {
      this.logger.error(
        `[Kaiwa] [${requestId}] [PARSE_AUDIO] ERROR: Final audio buffer is EMPTY (0 bytes) - NO AUDIO DATA`
      )
    }

    return { audioBuffer, audioFormat, mimeType }
  }

  /**
   * Convert MP4/M4A audio buffer sang FLAC format (sử dụng ffmpeg)
   * @param mp4Buffer - MP4/M4A audio buffer
   * @param requestId - Request ID cho logging
   * @returns FLAC audio buffer
   * @throws Error nếu conversion fails hoặc ffmpeg không có sẵn
   */
  async convertMp4ToFlac(mp4Buffer: Buffer, requestId: string): Promise<Buffer> {
    const tempInputPath = join(tmpdir(), `input_${randomUUID()}.mp4`)
    const tempOutputPath = join(tmpdir(), `output_${randomUUID()}.flac`)

    try {
      this.logger.log(
        `[Kaiwa] [${requestId}] [AUDIO_CONVERT] Starting MP4 to FLAC conversion, input size: ${mp4Buffer.length} bytes`
      )

      // Write MP4 buffer to temp file
      await writeFile(tempInputPath, mp4Buffer)
      this.logger.log(
        `[Kaiwa] [${requestId}] [AUDIO_CONVERT] Written MP4 to temp file: ${tempInputPath}`
      )

      // Convert MP4 to FLAC using ffmpeg
      // FLAC parameters: 16kHz sample rate, mono channel, 16-bit depth (compatible with Google Speech API)
      const ffmpegCommand = `ffmpeg -i "${tempInputPath}" -ar 16000 -ac 1 -sample_fmt s16 -y "${tempOutputPath}"`

      this.logger.log(`[Kaiwa] [${requestId}] [AUDIO_CONVERT] Running ffmpeg command...`)
      const { stdout, stderr } = await execAsync(ffmpegCommand, {
        timeout: 30000, // 30 seconds timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      })

      if (stderr && !stderr.includes('Stream mapping')) {
        // ffmpeg outputs info to stderr, but errors are also there
        this.logger.warn(
          `[Kaiwa] [${requestId}] [AUDIO_CONVERT] ffmpeg stderr: ${stderr.substring(0, 200)}`
        )
      }

      // Read converted FLAC file
      const flacBuffer = await readFile(tempOutputPath)
      this.logger.log(
        `[Kaiwa] [${requestId}] [AUDIO_CONVERT] Conversion successful, output size: ${flacBuffer.length} bytes`
      )

      return flacBuffer
    } catch (error) {
      this.logger.error(
        `[Kaiwa] [${requestId}] [AUDIO_CONVERT] Failed to convert MP4 to FLAC: ${error.message}`,
        error.stack
      )

      // Check if ffmpeg is not installed
      if (
        error.message.includes('ffmpeg') ||
        error.message.includes('ENOENT') ||
        error.message.includes('not found')
      ) {
        throw new Error(
          'ffmpeg is not installed on the server. Please install ffmpeg to support MP4/M4A audio conversion.'
        )
      }

      throw new Error(`Failed to convert MP4 to FLAC: ${error.message}`)
    } finally {
      // Clean up temp files
      try {
        await unlink(tempInputPath).catch(() => {})
        await unlink(tempOutputPath).catch(() => {})
        this.logger.log(`[Kaiwa] [${requestId}] [AUDIO_CONVERT] Cleaned up temp files`)
      } catch (cleanupError) {
        this.logger.warn(
          `[Kaiwa] [${requestId}] [AUDIO_CONVERT] Failed to clean up temp files: ${cleanupError.message}`
        )
      }
    }
  }

  /**
   * Convert LINEAR16 PCM buffer sang WAV format
   */
  convertLinear16ToWav(pcmBuffer: Buffer, sampleRate: number = 16000): Buffer {
    const numChannels = 1 // Mono
    const bitsPerSample = 16
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
    const blockAlign = numChannels * (bitsPerSample / 8)
    const dataSize = pcmBuffer.length
    const fileSize = 36 + dataSize

    // Tạo WAV header
    const wavHeader = Buffer.alloc(44)

    // RIFF header
    wavHeader.write('RIFF', 0)
    wavHeader.writeUInt32LE(fileSize, 4)
    wavHeader.write('WAVE', 8)

    // fmt chunk
    wavHeader.write('fmt ', 12)
    wavHeader.writeUInt32LE(16, 16) // fmt chunk size
    wavHeader.writeUInt16LE(1, 20) // audio format (1 = PCM)
    wavHeader.writeUInt16LE(numChannels, 22)
    wavHeader.writeUInt32LE(sampleRate, 24)
    wavHeader.writeUInt32LE(byteRate, 28)
    wavHeader.writeUInt16LE(blockAlign, 32)
    wavHeader.writeUInt16LE(bitsPerSample, 34)

    // data chunk
    wavHeader.write('data', 36)
    wavHeader.writeUInt32LE(dataSize, 40)

    // Combine header + PCM data
    return Buffer.concat([wavHeader, pcmBuffer])
  }

  /**
   * Convert audio Buffer thành Multer file object để upload
   */
  bufferToMulterFile(
    buffer: Buffer,
    filename: string,
    mimetype: string
  ): Express.Multer.File {
    return {
      buffer: buffer,
      originalname: filename,
      mimetype: mimetype,
      fieldname: 'audio',
      encoding: '7bit',
      size: buffer.length,
      destination: '',
      filename: filename,
      path: '',
      stream: null as any
    }
  }

  /**
   * Upload audio buffer và trả về URL
   */
  async uploadAudioBuffer(
    audioBuffer: Buffer,
    filename: string,
    mimetype: string,
    folder: string = 'kaiwa/audio'
  ): Promise<string | null> {
    try {
      const audioFile = this.bufferToMulterFile(audioBuffer, filename, mimetype)
      const result = await this.uploadService.uploadFile(audioFile, folder)
      this.logger.log(`[Kaiwa] Audio uploaded successfully: ${result.url}`)
      return result.url
    } catch (error) {
      this.logger.error(`[Kaiwa] Failed to upload audio: ${error.message}`, error.stack)
      return null
    }
  }

  /**
   * Prepare audio buffer for upload: detect format và convert nếu cần
   * @returns { finalBuffer, mimeType, extension }
   */
  prepareAudioForUpload(
    audioBuffer: Buffer,
    audioFormat: 'LINEAR16' | 'MP4' | 'M4A' | 'OGG' | 'WEBM',
    requestId: string
  ): { finalBuffer: Buffer; mimeType: string; extension: string } {
    let finalBuffer: Buffer
    let mimeType: string
    let extension: string

    if (audioFormat === 'LINEAR16') {
      // Check xem đã là WAV chưa (có header RIFF)
      if (
        audioBuffer.length >= 12 &&
        audioBuffer.toString('ascii', 0, 4) === 'RIFF' &&
        audioBuffer.toString('ascii', 8, 12) === 'WAVE'
      ) {
        // Đã là WAV format, không cần convert
        finalBuffer = audioBuffer
        mimeType = 'audio/wav'
        extension = 'wav'
        this.logger.log(
          `[Kaiwa] [${requestId}] Audio already in WAV format, skipping conversion`
        )
      } else {
        // Raw LINEAR16 PCM, convert sang WAV format
        finalBuffer = this.convertLinear16ToWav(audioBuffer, 16000)
        mimeType = 'audio/wav'
        extension = 'wav'
        this.logger.log(`[Kaiwa] [${requestId}] Converted LINEAR16 PCM to WAV format`)
      }
    } else if (audioFormat === 'MP4' || audioFormat === 'M4A') {
      // MP4/M4A từ mobile - giữ nguyên format
      finalBuffer = audioBuffer
      mimeType = 'audio/mp4' // M4A cũng là MP4 container
      extension = audioFormat === 'MP4' ? 'mp4' : 'm4a'
    } else if (audioFormat === 'OGG') {
      // OGG - giữ nguyên
      finalBuffer = audioBuffer
      mimeType = 'audio/ogg'
      extension = 'ogg'
    } else if (audioFormat === 'WEBM') {
      // WEBM - giữ nguyên
      finalBuffer = audioBuffer
      mimeType = 'audio/webm'
      extension = 'webm'
    } else {
      // Fallback: convert sang WAV
      this.logger.warn(
        `[Kaiwa] [${requestId}] Unknown audio format: ${audioFormat}, converting to WAV`
      )
      finalBuffer = this.convertLinear16ToWav(audioBuffer, 16000)
      mimeType = 'audio/wav'
      extension = 'wav'
    }

    return { finalBuffer, mimeType, extension }
  }
}
