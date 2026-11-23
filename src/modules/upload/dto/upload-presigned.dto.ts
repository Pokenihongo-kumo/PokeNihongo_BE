import { resSchema } from '@/shared/utils/res-schema'
import { ApiProperty } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// Schema cho request generate upload URL
export const GenerateUploadUrlBodySchema = z
  .object({
    fileName: z
      .string()
      .min(1, 'Tên file không được để trống')
      .max(255, 'Tên file không được vượt quá 255 ký tự'),

    fileType: z.enum(['image', 'audio', 'video', 'document'], {
      errorMap: () => ({
        message: 'File type phải là một trong: image, audio, video, document'
      })
    }),

    folderName: z
      .string()
      .min(1, 'Folder name không được để trống')
      .max(50, 'Folder name không được vượt quá 50 ký tự')
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        'Folder name chỉ được chứa chữ cái, số, dấu gạch ngang và gạch dưới'
      ),

    // MIME type để validate chính xác hơn
    mimeType: z
      .string()
      .min(1, 'MIME type không được để trống')
      .regex(/^[a-z]+\/[a-z0-9\-\+]+$/i, 'MIME type không hợp lệ'),

    // Kích thước file (bytes) để validate trước khi upload
    fileSize: z
      .number()
      .min(1, 'Kích thước file phải lớn hơn 0')
      .max(100 * 1024 * 1024, 'Kích thước file không được vượt quá 100MB')
  })
  .strict()

export type GenerateUploadUrlBody = z.infer<typeof GenerateUploadUrlBodySchema>

export class GenerateUploadUrlBodyDTO extends createZodDto(GenerateUploadUrlBodySchema) {}

// Schema cho response
export const GenerateUploadUrlResponseSchema = resSchema(
  z.object({
    uploadUrl: z.string().url(),
    fileUrl: z.string().url(),
    publicId: z.string(),
    expiresAt: z.string() // ISO timestamp
  })
)

export class GenerateUploadUrlResponseDTO extends createZodDto(
  GenerateUploadUrlResponseSchema
) {}

// Swagger DTO
export class GenerateUploadUrlSwaggerDTO {
  @ApiProperty({
    example: 'pikachu.jpg',
    description: 'Tên file (bao gồm extension)'
  })
  fileName: string

  @ApiProperty({
    enum: ['image', 'audio', 'video', 'document'],
    example: 'image',
    description: 'Loại file'
  })
  fileType: 'image' | 'audio' | 'video' | 'document'

  @ApiProperty({
    example: 'pokemon',
    description: 'Tên folder để upload'
  })
  folderName: string

  @ApiProperty({
    example: 'image/jpeg',
    description: 'MIME type của file'
  })
  mimeType: string

  @ApiProperty({
    example: 2048000,
    description: 'Kích thước file tính bằng bytes'
  })
  fileSize: number
}
