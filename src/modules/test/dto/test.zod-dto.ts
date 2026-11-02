import { createZodDto } from 'nestjs-zod'
import {
  CreateTestBodySchema,
  UpdateTestBodySchema,
  TestResSchema,
  TestListResSchema,
  GetTestByIdParamsSchema,
  GetTestListQuerySchema,
  CreateTestWithMeaningsBodySchema,
  UpdateTestWithMeaningsBodySchema,
  DeleteManyTestsBodySchema,
  AddTestSetsToTestBodySchema,
  RemoveTestSetsFromTestBodySchema
} from '../entities/test.entities'

// Create Test DTO
export class CreateTestBodyDTO extends createZodDto(CreateTestBodySchema) {}

// Update Test DTO
export class UpdateTestBodyDTO extends createZodDto(UpdateTestBodySchema) {}

// Test Response DTO
export class TestResDTO extends createZodDto(TestResSchema) {}

// Test List Response DTO
export class TestListResDTO extends createZodDto(TestListResSchema) {}

// Get Test by ID Params DTO
export class GetTestByIdParamsDTO extends createZodDto(GetTestByIdParamsSchema) {}

// Get Test List Query DTO
export class GetTestListQueryDTO extends createZodDto(GetTestListQuerySchema) {}

// Create Test with Meanings DTO
export class CreateTestWithMeaningsBodyDTO extends createZodDto(
  CreateTestWithMeaningsBodySchema
) {}

// Update Test with Meanings DTO
export class UpdateTestWithMeaningsBodyDTO extends createZodDto(
  UpdateTestWithMeaningsBodySchema
) {}

// Delete Many Tests DTO
export class DeleteManyTestsBodyDTO extends createZodDto(DeleteManyTestsBodySchema) {}

// Add TestSets to Test DTO
export class AddTestSetsToTestBodyDTO extends createZodDto(AddTestSetsToTestBodySchema) {}

// Remove TestSets from Test DTO
export class RemoveTestSetsFromTestBodyDTO extends createZodDto(
  RemoveTestSetsFromTestBodySchema
) {}
