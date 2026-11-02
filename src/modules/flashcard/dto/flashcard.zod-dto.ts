import { createZodDto } from 'nestjs-zod'
import {
  CreateFlashcardCardBodySchema,
  CreateFlashcardDeckBodySchema,
  FlashcardDeckCardParamsSchema,
  FlashcardDeckParamsSchema,
  GetFlashcardCardListQuerySchema,
  GetFlashcardDeckListQuerySchema,
  ImportFlashcardCardsBodySchema,
  FlashcardLibrarySearchQuerySchema,
  FlashcardReviewActionBodySchema,
  FlashcardReviewQuerySchema,
  UpdateFlashcardCardBodySchema,
  UpdateFlashcardDeckBodySchema,
  DeleteFlashcardCardsBodySchema,
  FlashcardReadBodySchema
} from '../entities/flashcard.entities'

export class CreateFlashcardDeckBodyDTO extends createZodDto(
  CreateFlashcardDeckBodySchema
) {}
export class UpdateFlashcardDeckBodyDTO extends createZodDto(
  UpdateFlashcardDeckBodySchema
) {}
export class GetFlashcardDeckListQueryDTO extends createZodDto(
  GetFlashcardDeckListQuerySchema
) {}
export class FlashcardDeckParamsDTO extends createZodDto(FlashcardDeckParamsSchema) {}

export class CreateFlashcardCardBodyDTO extends createZodDto(
  CreateFlashcardCardBodySchema
) {}
export class UpdateFlashcardCardBodyDTO extends createZodDto(
  UpdateFlashcardCardBodySchema
) {}
export class GetFlashcardCardListQueryDTO extends createZodDto(
  GetFlashcardCardListQuerySchema
) {}
export class FlashcardDeckCardParamsDTO extends createZodDto(
  FlashcardDeckCardParamsSchema
) {}
export class ImportFlashcardCardsBodyDTO extends createZodDto(
  ImportFlashcardCardsBodySchema
) {}
export class FlashcardLibrarySearchQueryDTO extends createZodDto(
  FlashcardLibrarySearchQuerySchema
) {}
export class FlashcardReviewQueryDTO extends createZodDto(FlashcardReviewQuerySchema) {}
export class FlashcardReviewActionBodyDTO extends createZodDto(
  FlashcardReviewActionBodySchema
) {}
export class DeleteFlashcardCardsBodyDTO extends createZodDto(
  DeleteFlashcardCardsBodySchema
) {}
export class FlashcardReadBodyDTO extends createZodDto(FlashcardReadBodySchema) {}
