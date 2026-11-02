import { ApiProperty } from '@nestjs/swagger'
import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'

// Schema để thêm nghĩa mới
export const AddMeaningToVocabularySchema = z.object({
  vocabularyId: z.number().min(1, 'Vocabulary ID phải lớn hơn 0'),
  wordTypeId: z.number().min(1, 'WordType ID phải lớn hơn 0').optional(),
  exampleSentenceJp: z
    .string()
    .max(1000, 'Câu ví dụ tiếng Nhật quá dài (tối đa 1000 ký tự)')
    .optional()
})

// Zod DTO
export class AddMeaningToVocabularyDTO extends createZodDto(
  AddMeaningToVocabularySchema
) {}

// Swagger DTO
export class AddMeaningSwaggerDTO {
  @ApiProperty({
    example: 1,
    description: 'ID của từ vựng cần thêm nghĩa'
  })
  vocabularyId: number

  @ApiProperty({
    example: 1,
    description: 'ID của loại từ (noun, verb, adjective, etc.)',
    required: false
  })
  wordTypeId?: number

  @ApiProperty({
    example: 'これは例文です。',
    description: 'Câu ví dụ tiếng Nhật',
    required: false
  })
  exampleSentenceJp?: string
}

export type AddMeaningToVocabularyType = z.infer<typeof AddMeaningToVocabularySchema>
