import { createZodDto } from 'nestjs-zod'
import {
  TestListResSchema,
  GetTestByIdParamsSchema,
  GetTestByLessonParamsSchema,
  GetLessonReviewParamsSchema,
  GetRandomQuestionsQuerySchema,
  GetTestListQuerySchema,
  CreateTestWithMeaningsBodySchema,
  UpdateTestWithMeaningsBodySchema,
  DeleteManyTestsBodySchema,
  AddTestSetsToTestBodySchema,
  RemoveTestSetsFromTestBodySchema
} from '../entities/test.entity'

// Test List Response DTO
export class TestListResDTO extends createZodDto(TestListResSchema) {}

// Params and queries
export class GetTestByIdParamsDTO extends createZodDto(GetTestByIdParamsSchema) {}
export class GetTestByLessonParamsDTO extends createZodDto(GetTestByLessonParamsSchema) {}
export class GetLessonReviewParamsDTO extends createZodDto(GetLessonReviewParamsSchema) {}
export class GetRandomQuestionsQueryDTO extends createZodDto(
  GetRandomQuestionsQuerySchema
) {}
export class GetTestListQueryDTO extends createZodDto(GetTestListQuerySchema) {}

// Bodies
export class CreateTestWithMeaningsBodyDTO extends createZodDto(
  CreateTestWithMeaningsBodySchema
) {}
export class UpdateTestWithMeaningsBodyDTO extends createZodDto(
  UpdateTestWithMeaningsBodySchema
) {}
export class DeleteManyTestsBodyDTO extends createZodDto(DeleteManyTestsBodySchema) {}
export class AddTestSetsToTestBodyDTO extends createZodDto(AddTestSetsToTestBodySchema) {}
export class RemoveTestSetsFromTestBodyDTO extends createZodDto(
  RemoveTestSetsFromTestBodySchema
) {}
