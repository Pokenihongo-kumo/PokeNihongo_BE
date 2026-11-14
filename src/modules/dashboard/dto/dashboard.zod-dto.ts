import { createZodDto } from 'nestjs-zod'
import {
  DashboardGachaBannerParamsSchema,
  DashboardPeriodQuerySchema,
  DashboardRevenueQuerySchema,
  DashboardSeasonParamsSchema,
  DashboardSeasonStatsQuerySchema,
  DashboardYearQuerySchema
} from '../entities/dashboard.entity'

export class DashboardPeriodQueryDTO extends createZodDto(DashboardPeriodQuerySchema) {}
export class DashboardRevenueQueryDTO extends createZodDto(DashboardRevenueQuerySchema) {}
export class DashboardYearQueryDTO extends createZodDto(DashboardYearQuerySchema) {}
export class DashboardSeasonStatsQueryDTO extends createZodDto(
  DashboardSeasonStatsQuerySchema
) {}
export class DashboardSeasonParamsDTO extends createZodDto(DashboardSeasonParamsSchema) {}
export class DashboardGachaBannerParamsDTO extends createZodDto(
  DashboardGachaBannerParamsSchema
) {}
