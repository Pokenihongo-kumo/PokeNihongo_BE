import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { TestSetStatus, TestStatus as PrismaTestStatus } from '@prisma/client'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Test Schema
export const TestSchema = z.object({
  id: z.number(),
  name: z.union([
    z.string(),
    z.array(
      z.object({
        language: z.string(),
        value: z.string()
      })
    )
  ]),
  description: z
    .union([
      z.string().nullable(),
      z.array(
        z.object({
          language: z.string(),
          value: z.string()
        })
      )
    ])
    .optional(),
  price: z.number().nullable().optional(),
  levelN: z.number().int().min(0).max(5).nullable().optional(),
  limit: z.number().int().min(0).nullable().optional(),
  testType: z.nativeEnum(PrismaTestStatus),
  status: z.nativeEnum(TestSetStatus),
  creatorId: z.number().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create Test Schema
export const CreateTestBodySchema = z
  .object({
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    price: z.number().nullable().optional(),
    levelN: z.number().int().min(0).max(5).nullable().optional(),
    limit: z.number().int().min(0).nullable().optional(),
    testType: z.nativeEnum(PrismaTestStatus),
    status: z.nativeEnum(TestSetStatus).default(TestSetStatus.DRAFT),
    translations: z
      .array(
        z.object({
          field: z.enum(['name', 'description']),
          language_code: z.string(),
          value: z.string()
        })
      )
      .min(1, 'Phải có ít nhất 1 translation')
  })
  .strict()

// Create Test with Meanings Schema
export const CreateTestWithMeaningsBodySchema = z
  .object({
    price: z.number().nullable().optional(),
    levelN: z.number().int().min(0).max(5).nullable().optional(),
    limit: z.number().int().min(0).nullable().optional(),
    testType: z.nativeEnum(PrismaTestStatus),
    status: z.nativeEnum(TestSetStatus).default(TestSetStatus.DRAFT),
    meanings: z
      .array(
        z.object({
          field: z.enum(['name', 'description']),
          meaningKey: z.string().optional(),
          translations: z.object({
            vi: z.string(),
            en: z.string(),
            ja: z.string().optional()
          })
        })
      )
      .min(1, 'Phải có ít nhất 1 meaning')
  })
  .strict()

// Update Test Schema
export const UpdateTestBodySchema = z
  .object({
    price: z.number().nullable().optional(),
    levelN: z.number().int().min(0).max(5).nullable().optional(),
    limit: z.number().int().min(0).nullable().optional(),
    testType: z.nativeEnum(PrismaTestStatus).optional(),
    status: z.nativeEnum(TestSetStatus).optional(),
    translations: z
      .array(
        z.object({
          field: z.enum(['name', 'description']),
          language_code: z.string(),
          value: z.string()
        })
      )
      .optional()
  })
  .strict()

// Update Test with Meanings Schema
export const UpdateTestWithMeaningsBodySchema = z
  .object({
    price: z.number().nullable().optional(),
    levelN: z.number().int().min(0).max(5).nullable().optional(),
    limit: z.number().int().min(0).nullable().optional(),
    testType: z.nativeEnum(PrismaTestStatus).optional(),
    status: z.nativeEnum(TestSetStatus).optional(),
    meanings: z
      .array(
        z.object({
          field: z.enum(['name', 'description']),
          meaningKey: z.string().optional(),
          translations: z.object({
            vi: z.string(),
            en: z.string(),
            ja: z.string().optional()
          })
        })
      )
      .optional()
  })
  .strict()

// Test Response Schema
export const TestResSchema = z
  .object({
    statusCode: z.number(),
    data: TestSchema,
    message: z.string()
  })
  .strict()

// Test List Response Schema
export const TestListResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(TestSchema),
      pagination: z.object({
        current: z.number(),
        pageSize: z.number(),
        totalPage: z.number(),
        totalItem: z.number()
      })
    }),
    message: z.string()
  })
  .strict()

// Get Test by ID Params Schema
export const GetTestByIdParamsSchema = z
  .object({
    id: z.string().transform((val) => parseInt(val, 10))
  })
  .strict()

// Get Test List Query Schema
export const GetTestListQuerySchema = z
  .object({
    currentPage: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional()
      .default('1'),
    pageSize: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional()
      .default('10'),
    search: z.string().optional(),
    testType: z.nativeEnum(PrismaTestStatus).optional(),
    status: z.nativeEnum(TestSetStatus).optional(),
    levelN: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    creatorId: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    language: z.string().optional(),
    sortBy: z
      .enum([
        'id',
        'name',
        'testType',
        'status',
        'price',
        'levelN',
        'createdAt',
        'updatedAt'
      ])
      .optional()
      .default('createdAt'),
    sort: z.enum(['asc', 'desc']).optional().default('desc')
  })
  .strict()

// Delete Many Tests Schema
export const DeleteManyTestsBodySchema = z
  .object({
    ids: z.array(z.number()).min(1, 'Phải có ít nhất 1 ID để xóa')
  })
  .strict()

// Add TestSets to Test Schema
export const AddTestSetsToTestBodySchema = z
  .object({
    testSetIds: z.array(z.number()).min(1, 'Phải có ít nhất 1 TestSet ID')
  })
  .strict()

// Remove TestSets from Test Schema
export const RemoveTestSetsFromTestBodySchema = z
  .object({
    testSetIds: z.array(z.number()).min(1, 'Phải có ít nhất 1 TestSet ID')
  })
  .strict()

// Types
export type TestType = z.infer<typeof TestSchema>
export type CreateTestBodyType = z.infer<typeof CreateTestBodySchema>
export type UpdateTestBodyType = z.infer<typeof UpdateTestBodySchema>
export type CreateTestWithMeaningsBodyType = z.infer<
  typeof CreateTestWithMeaningsBodySchema
>
export type UpdateTestWithMeaningsBodyType = z.infer<
  typeof UpdateTestWithMeaningsBodySchema
>
export type TestResType = z.infer<typeof TestResSchema>
export type TestListResType = z.infer<typeof TestListResSchema>
export type GetTestByIdParamsType = z.infer<typeof GetTestByIdParamsSchema>
export type GetTestListQueryType = z.infer<typeof GetTestListQuerySchema>
export type DeleteManyTestsBodyType = z.infer<typeof DeleteManyTestsBodySchema>
export type AddTestSetsToTestBodyType = z.infer<typeof AddTestSetsToTestBodySchema>
export type RemoveTestSetsFromTestBodyType = z.infer<
  typeof RemoveTestSetsFromTestBodySchema
>
