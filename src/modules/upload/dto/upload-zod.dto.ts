import { resSchema } from '@/shared/utils/res-schema'
import { ApiProperty } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// Enum cho các loại file được hỗ trợ
export const FileTypeEnum = z.enum(['image', 'audio', 'video', 'document'], {
  errorMap: () => ({ message: 'Type phải là một trong: image, audio, video, document' })
})

// Schema cho upload file với type
export const UploadFileBodySchema = z
  .object({
    folderName: z
      .string()
      .min(1, 'Folder name không được để trống')
      .max(50, 'Folder name không được vượt quá 50 ký tự')
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        'Folder name chỉ được chứa chữ cái, số, dấu gạch ngang và gạch dưới'
      ),

    type: FileTypeEnum.optional().default('image'),

    // Field file sẽ được handle bởi multer, không validate ở đây
    file: z.any().optional()
  })
  .strict()

export type UploadFileBody = z.infer<typeof UploadFileBodySchema>

export class UploadFileBodyDTO extends createZodDto(UploadFileBodySchema) {}

// Response schema
export const UploadFileResponseSchema = resSchema(
  z.object({
    url: z.string().url(),
    publicId: z.string().optional()
  })
)

export type UploadFileResponse = z.infer<typeof UploadFileResponseSchema>

export class UploadFileResponseDTO extends createZodDto(UploadFileResponseSchema) {}

// Swagger DTO cho multipart form
export class UploadFileSwaggerDTO {
  @ApiProperty({
    example: 'pokemon',
    description: 'Tên folder để upload (pokemon, avatar, vocabulary, etc.)',
    required: true
  })
  folderName: string

  @ApiProperty({
    enum: ['image', 'audio', 'video', 'document'],
    example: 'image',
    description: 'Loại file để upload',
    required: false,
    default: 'image'
  })
  type?: 'image' | 'audio' | 'video' | 'document'

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description:
      'File để upload. Giới hạn: image(5MB), audio(10MB), video(50MB), document(5MB)',
    required: true
  })
  file: any
}
