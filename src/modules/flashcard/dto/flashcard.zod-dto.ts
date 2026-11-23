import { checkIdSchema } from '@/common/utils/id.validation'
import { FlashcardMessage as M } from '@/i18n/message-keys'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  FlashcardCardStatusEnum,
  FlashcardContentTypeEnum,
  FlashcardDeckStatusEnum,
  FlashcardImportItemSchema,
  JsonRecordSchema
} from '../entities/flashcard.entity'

export const CreateFlashcardDeckBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  metadata: JsonRecordSchema
})

export type CreateFlashcardDeckBody = z.infer<typeof CreateFlashcardDeckBodySchema>

export class CreateFlashcardDeckBodyDTO extends createZodDto(
  CreateFlashcardDeckBodySchema
) {}

export const UpdateFlashcardDeckBodySchema =
  CreateFlashcardDeckBodySchema.partial().refine((data) => Object.keys(data).length > 0, {
    message: M.UPDATE_ONE_FIELD
  })

export type UpdateFlashcardDeckBody = z.infer<typeof UpdateFlashcardDeckBodySchema>

export class UpdateFlashcardDeckBodyDTO extends createZodDto(
  UpdateFlashcardDeckBodySchema
) {}

export const GetFlashcardDeckListQuerySchema = z.object({
  currentPage: checkIdSchema(M.INVALID_PAGE).default(1),
  pageSize: checkIdSchema(M.INVALID_PAGE_SIZE).max(100, M.INVALID_PAGE_SIZE).default(10),
  search: z.string().trim().optional(),
  status: FlashcardDeckStatusEnum.optional()
})

export type GetFlashcardDeckListQuery = z.infer<typeof GetFlashcardDeckListQuerySchema>

export class GetFlashcardDeckListQueryDTO extends createZodDto(
  GetFlashcardDeckListQuerySchema
) {}

export const FlashcardDeckParamsSchema = z.object({
  deckId: checkIdSchema(M.INVALID_DECK_ID)
})

export type FlashcardDeckParams = z.infer<typeof FlashcardDeckParamsSchema>

export class FlashcardDeckParamsDTO extends createZodDto(FlashcardDeckParamsSchema) {}

export const CreateFlashcardCardBodySchema = z
  .object({
    id: z.preprocess(
      (val) => {
        // Nếu không truyền field hoặc rỗng, return null
        if (val === undefined || val === '' || val === null) return null
        const num = Number(val)
        return isNaN(num) ? null : num
      },
      z.union([z.number().int().min(1), z.null()]).default(null)
    ),
    contentType: FlashcardContentTypeEnum,
    notes: z.string().trim().max(4000).optional(),
    metadata: JsonRecordSchema
  })
  .superRefine((data, ctx) => {
    const { contentType, id, metadata } = data

    if (contentType === 'CUSTOM') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: M.CUSTOM_NOT_SUPPORTED,
        path: ['contentType']
      })
      return
    }

    // Nếu không có id, phải có metadata để user tự tạo card riêng
    if (!id || id === null || id === undefined) {
      if (
        !metadata ||
        metadata === null ||
        metadata === undefined ||
        Object.keys(metadata).length === 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: M.METADATA_REQUIRED,
          path: ['metadata']
        })
      }
    } else {
      // Nếu có id, validate id phải là số nguyên dương hợp lệ
      if (!Number.isInteger(id) || id < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: M.INVALID_CARD_ID,
          path: ['id']
        })
      }
    }
  })

export type CreateFlashcardCardBody = z.infer<typeof CreateFlashcardCardBodySchema>

export class CreateFlashcardCardBodyDTO extends createZodDto(
  CreateFlashcardCardBodySchema
) {}

export const UpdateFlashcardCardBodySchema = z
  .object({
    deckId: checkIdSchema(M.INVALID_DECK_ID),
    cardId: checkIdSchema(M.INVALID_CARD_ID),
    contentType: FlashcardContentTypeEnum.optional(),
    status: FlashcardCardStatusEnum.optional(),
    notes: z.string().trim().max(4000).nullable().optional(),
    read: z.boolean().optional(),
    metadata: JsonRecordSchema
  })
  .refine(
    (value) => {
      const updateFields = ['contentType', 'status', 'notes', 'read', 'metadata']
      return updateFields.some((field) => value[field] !== undefined)
    },
    {
      message: M.UPDATE_ONE_FIELD
    }
  )

export type UpdateFlashcardCardBody = z.infer<typeof UpdateFlashcardCardBodySchema>

export class UpdateFlashcardCardBodyDTO extends createZodDto(
  UpdateFlashcardCardBodySchema
) {}

export const GetFlashcardCardListQuerySchema = z.object({
  currentPage: checkIdSchema(M.INVALID_PAGE).default(1),
  pageSize: checkIdSchema(M.INVALID_PAGE_SIZE).default(10),
  contentType: FlashcardContentTypeEnum.optional(),
  search: z.string().trim().optional()
})

export type GetFlashcardCardListQuery = z.infer<typeof GetFlashcardCardListQuerySchema>

export class GetFlashcardCardListQueryDTO extends createZodDto(
  GetFlashcardCardListQuerySchema
) {}

export const ImportFlashcardCardsBodySchema = z.object({
  items: z.array(FlashcardImportItemSchema).min(1, M.IMPORT_ITEMS_REQUIRED)
})

export type ImportFlashcardCardsBody = z.infer<typeof ImportFlashcardCardsBodySchema>

export class ImportFlashcardCardsBodyDTO extends createZodDto(
  ImportFlashcardCardsBodySchema
) {}

export const FlashcardReviewQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20)
})

export type FlashcardReviewQuery = z.infer<typeof FlashcardReviewQuerySchema>

export class FlashcardReviewQueryDTO extends createZodDto(FlashcardReviewQuerySchema) {}

export const FlashcardReadBodySchema = z.object({
  deckId: checkIdSchema(M.INVALID_DECK_ID),
  cardId: checkIdSchema(M.INVALID_CARD_ID),
  read: z.boolean()
})

export type FlashcardReadBody = z.infer<typeof FlashcardReadBodySchema>

export class FlashcardReadBodyDTO extends createZodDto(FlashcardReadBodySchema) {}

export const FlashcardReviewActionBodySchema = z.object({
  deckId: checkIdSchema(M.INVALID_DECK_ID),
  cardId: checkIdSchema(M.INVALID_CARD_ID),
  result: z.enum(['correct', 'incorrect']),
  message: z.string().trim().max(1000).optional()
})

export type FlashcardReviewActionBody = z.infer<typeof FlashcardReviewActionBodySchema>

export class FlashcardReviewActionBodyDTO extends createZodDto(
  FlashcardReviewActionBodySchema
) {}

export const DeleteFlashcardCardsBodySchema = z.object({
  deckId: checkIdSchema(M.INVALID_DECK_ID),
  cardIds: z.array(checkIdSchema(M.INVALID_CARD_ID)).min(1, M.INVALID_CARD_ID)
})

export type DeleteFlashcardCardsBody = z.infer<typeof DeleteFlashcardCardsBodySchema>

export class DeleteFlashcardCardsBodyDTO extends createZodDto(
  DeleteFlashcardCardsBodySchema
) {}
