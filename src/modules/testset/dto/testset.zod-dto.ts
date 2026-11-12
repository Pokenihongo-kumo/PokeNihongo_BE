import { createZodDto } from 'nestjs-zod'
import {
  CreateTestSetBodySchema,
  UpdateTestSetBodySchema,
  TestSetResSchema,
  TestSetListResSchema,
  GetTestSetByIdParamsSchema,
  GetTestSetListQuerySchema,
  CreateTestSetWithMeaningsBodySchema,
  UpdateTestSetWithMeaningsBodySchema,
  CreateTestSetWithQuestionBodySchema,
  UpsertTestSetWithQuestionBanksBodySchema
} from '../entities/testset.entity'

// Create TestSet DTO
export class CreateTestSetBodyDTO extends createZodDto(CreateTestSetBodySchema) {}

// Update TestSet DTO
export class UpdateTestSetBodyDTO extends createZodDto(UpdateTestSetBodySchema) {}

// TestSet Response DTO
export class TestSetResDTO extends createZodDto(TestSetResSchema) {}

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

// Create TestSet with QuestionBanks DTO
export class CreateTestSetWithQuestionBodyDTO extends createZodDto(
  CreateTestSetWithQuestionBodySchema
) {}

// Upsert TestSet with QuestionBanks DTO (gộp create và update)
export class UpsertTestSetWithQuestionBanksBodyDTO extends createZodDto(
  UpsertTestSetWithQuestionBanksBodySchema
) {}
