import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { Controller, Get, Param, Query } from '@nestjs/common'
import { DashboardService } from './dashboard.service'
import {
  DashboardGachaBannerParamsDTO,
  DashboardPeriodQueryDTO,
  DashboardRevenueQueryDTO,
  DashboardSeasonParamsDTO,
  DashboardSeasonStatsQueryDTO,
  DashboardYearQueryDTO
} from './dto/dashboard.zod-dto'

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('subscription-stats')
  getSubStats(@I18nLang() lang: string) {
    return this.dashboardService.getSubStats(lang)
  }

  @Get('subscription-stats/revennue')
  getSubStatsRevenue(
    @I18nLang() lang: string,
    @Query() { month, year }: DashboardRevenueQueryDTO
  ) {
    return this.dashboardService.getSubStatsRevenue(lang, month, year)
  }

  @Get('subscription-stats/yearly-revenue')
  getYearlyRevenue(@I18nLang() lang: string, @Query() { year }: DashboardYearQueryDTO) {
    return this.dashboardService.getYearlyRevenue(lang, year)
  }

  @Get('subscription-stats/register-recently')
  getListUserRegister(@I18nLang() lang: string, @Query() query: PaginationQueryDTO) {
    return this.dashboardService.getListUserRegister(query, lang)
  }

  //*Thống kê tăng trưởng người dùng------------ ----------------------------------------------
  @Get('user-growth/total-users')
  getTotalUsers() {
    return this.dashboardService.getTotalUsers()
  }

  @Get('user-growth/new-users')
  getNewUsers(@Query() { period }: DashboardPeriodQueryDTO) {
    return this.dashboardService.getNewUsers(period)
  }

  @Get('user-growth/active-users')
  getActiveUsers(@Query() { period }: DashboardPeriodQueryDTO) {
    return this.dashboardService.getActiveUsers(period)
  }

  @Get('user-growth/account-activation')
  getAccountActivation() {
    return this.dashboardService.getAccountActivation()
  }

  @Get('user-growth/jlpt-distribution')
  getJLPTDistribution() {
    return this.dashboardService.getJLPTDistribution()
  }

  //*Tương tác và Game hóa------------ ----------------------------------------------
  @Get('engagement/streak-retention')
  getStreakRetention() {
    return this.dashboardService.getStreakRetention()
  }

  @Get('engagement/starter-pokemon-distribution')
  getStarterPokemonDistribution() {
    return this.dashboardService.getStarterPokemonDistribution()
  }

  @Get('engagement/battle-activity')
  getBattleActivity(@I18nLang() lang: string) {
    return this.dashboardService.getBattleActivity(lang)
  }

  @Get('engagement/sparkles-accumulation')
  getSparklesAccumulation() {
    return this.dashboardService.getSparklesAccumulation()
  }

  @Get('engagement/popular-content')
  getPopularContent(@I18nLang() lang: string) {
    return this.dashboardService.getPopularContent(lang)
  }
  // //! ----------------------------------------------------------------------------

  //*Hiệu suất Nội dung------------ ----------------------------------------------
  @Get('content-performance/completion-rate')
  getLessonCompletionRate(@I18nLang() lang: string) {
    return this.dashboardService.getLessonCompletionRate(lang)
  }

  // //! ----------------------------------------------------------------------------

  //*Mùa giải------------ ----------------------------------------------
  @Get('leaderboard-season/overview')
  getLeaderboardSeasonOverview(@I18nLang() lang: string) {
    return this.dashboardService.getLeaderboardSeasonOverview(lang)
  }
  @Get('leaderboard-season/stats')
  getLeaderboardSeasonStats(
    @I18nLang() lang: string,
    @Query() query: DashboardSeasonStatsQueryDTO
  ) {
    return this.dashboardService.getLeaderboardSeasonStats(
      lang,
      query.currentPage,
      query.pageSize,
      query.period
    )
  }

  @Get('leaderboard-season/:seasonId')
  getLeaderboardSeasonDetail(
    @I18nLang() lang: string,
    @Param() { seasonId }: DashboardSeasonParamsDTO,
    @Query() { period }: DashboardPeriodQueryDTO
  ) {
    return this.dashboardService.getLeaderboardSeasonDetail(seasonId, lang, period)
  }

  // //! --------------------------------------------------------------------------

  //* Gacha------------ ----------------------------------------------
  @Get('gacha-stats/overview')
  getGachaStatsOverview(@I18nLang() lang: string, @Query() query: PaginationQueryDTO) {
    return this.dashboardService.getGachaStatsOverview(
      lang,
      query.currentPage,
      query.pageSize
    )
  }

  @Get('gacha-stats/:gachaBannerId')
  getGachaStatsDetail(
    @I18nLang() lang: string,
    @Param() { gachaBannerId }: DashboardGachaBannerParamsDTO
  ) {
    return this.dashboardService.getGachaStatsDetail(gachaBannerId, lang)
  }

  // //! --------------------------------------------------------------------------
}
