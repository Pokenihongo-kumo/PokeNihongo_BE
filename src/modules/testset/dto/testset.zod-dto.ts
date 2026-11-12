import { createZodDto } from 'nestjs-zod'
import {
  UpdateTestSetBodySchema,
  TestSetListResSchema,
  GetTestSetByIdParamsSchema,
  GetTestSetListQuerySchema,
  CreateTestSetWithMeaningsBodySchema,
  UpdateTestSetWithMeaningsBodySchema,
  UpsertTestSetWithQuestionBanksBodySchema
} from '../entities/testset.entity'

// Update TestSet DTO
export class UpdateTestSetBodyDTO extends createZodDto(UpdateTestSetBodySchema) {}

// TestSet List Response DTO
export class TestSetListResDTO extends createZodDto(TestSetListResSchema) {}

// Get TestSet by ID Params DTO
export class GetTestSetByIdParamsDTO extends createZodDto(GetTestSetByIdParamsSchema) {}

// Get TestSet List Query DTO
export class GetTestSetListQueryDTO extends createZodDto(GetTestSetListQuerySchema) {}

// Create TestSet with Meanings DTO
export class CreateTestSetWithMeaningsBodyDTO extends createZodDto(
  CreateTestSetWithMeaningsBodySchema
) {}

// Update TestSet with Meanings DTO
export class UpdateTestSetWithMeaningsBodyDTO extends createZodDto(
  UpdateTestSetWithMeaningsBodySchema
) {}

// Upsert TestSet with QuestionBanks DTO (gộp create và update)
export class UpsertTestSetWithQuestionBanksBodyDTO extends createZodDto(
  UpsertTestSetWithQuestionBanksBodySchema
) {}
