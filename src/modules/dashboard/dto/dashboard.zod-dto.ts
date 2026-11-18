import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE, DashboardMessage as M } from '@/i18n/message-keys'
import { PaginationQuerySchema } from '@/shared/models/request.model'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// day / week / month, month when missing
const PeriodSchema = z
  .enum(['day', 'week', 'month'], { errorMap: () => ({ message: M.INVALID_PERIOD }) })
  .default('month')

const YearSchema = z.coerce
  .number({ invalid_type_error: M.INVALID_YEAR })
  .int(M.INVALID_YEAR)
  .min(2000, M.INVALID_YEAR)
  .max(3000, M.INVALID_YEAR)

export const DashboardPeriodQuerySchema = z.object({ period: PeriodSchema }).strict()

export class DashboardPeriodQueryDTO extends createZodDto(DashboardPeriodQuerySchema) {}

export const DashboardRevenueQuerySchema = z
  .object({
    month: z.coerce
      .number({ invalid_type_error: M.INVALID_MONTH })
      .int(M.INVALID_MONTH)
      .min(1, M.INVALID_MONTH)
      .max(12, M.INVALID_MONTH)
      .optional(),
    year: YearSchema.optional()
  })
  .strict()

export class DashboardRevenueQueryDTO extends createZodDto(DashboardRevenueQuerySchema) {}

export const DashboardYearQuerySchema = z.object({ year: YearSchema.optional() }).strict()

export class DashboardYearQueryDTO extends createZodDto(DashboardYearQuerySchema) {}

export const DashboardSeasonStatsQuerySchema = PaginationQuerySchema.extend({
  period: PeriodSchema
})

export class DashboardSeasonStatsQueryDTO extends createZodDto(
  DashboardSeasonStatsQuerySchema
) {}

export const DashboardSeasonParamsSchema = z
  .object({ seasonId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID) })
  .strict()

export class DashboardSeasonParamsDTO extends createZodDto(DashboardSeasonParamsSchema) {}

export const DashboardGachaBannerParamsSchema = z
  .object({ gachaBannerId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID) })
  .strict()

export class DashboardGachaBannerParamsDTO extends createZodDto(
  DashboardGachaBannerParamsSchema
) {}
