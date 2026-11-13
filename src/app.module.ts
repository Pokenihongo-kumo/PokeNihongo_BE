import { ApiExceptionFilter } from '@/common/filters/api-exception.filter'
import CustomZodValidationPipe from '@/common/pipes/custom-zod-validation.pipe'
import { I18nModule } from '@/i18n/i18n.module'
import { BullModule } from '@nestjs/bull'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ZodSerializerInterceptor } from 'nestjs-zod'
import { GeminiModule } from './3rdService/gemini/gemini.module'
import { MailModule } from './3rdService/mail/mail.module'
import { SpeechModule } from './3rdService/speech/speech.module'
import { UploadModule } from './3rdService/upload/upload.module'
import { TransformInterceptor } from './common/interceptor/transform.interceptor'
import { AuthModule } from './modules/auth/auth.module'
import { PermissionModule } from './modules/permission/permission.module'
import { RoleModule } from './modules/role/role.module'
import { TranslationModule } from './modules/translation/translation.module'
import { VocabularyModule } from './modules/vocabulary/vocabulary.module'

import { AchievementGroupModule } from './modules/achievement-group/achievement-group.module'
import { AchievementModule } from './modules/achievement/achievement.module'
import { AnswerModule } from './modules/answer/answer.module'
import { AttendanceModule } from './modules/attendance/attendance.module'
import { AttendenceConfigModule } from './modules/attendence-config/attendence-config.module'
import { DailyRequestModule } from './modules/daily-request/daily-request.module'
import { ElementalTypeModule } from './modules/elemental-type/elemental-type.module'
import { ExercisesModule } from './modules/exercises/exercises.module'
import { GeminiConfigModule } from './modules/gemini-config/gemini-config.module'
import { GrammarUsageModule } from './modules/grammar-usage/grammar-usage.module'
import { GrammarModule } from './modules/grammar/grammar.module'
import { KanjiModule } from './modules/kanji/kanji.module'
import { LanguagesModule } from './modules/languages/languages.module'
import { LessonCategoryModule } from './modules/lesson-category/lesson-category.module'
import { LessonContentModule } from './modules/lesson-content/lesson-content.module'
import { LessonModule } from './modules/lesson/lesson.module'
import { LevelModule } from './modules/level/level.module'
import { MeaningModule } from './modules/meaning/meaning.module'
import { PokemonModule } from './modules/pokemon/pokemon.module'

import { HandleGachaBannerCronjob } from './cronjobs/handle-gacha-banner.cronjob'
import { HandleLeaderboardSeasonCronjob } from './cronjobs/handle-leaderboard-season.cronjob'
import { HandleMatchmakingCronjob } from './cronjobs/handle-matchmaking.cronjob'
import { HandleShopBannerCronjob } from './cronjobs/handle-shop-banner.cronjob'
import { HandleUserSubscriptionCronjob } from './cronjobs/handle-user-subscription.cronjob'
import { AIConversationRoomModule } from './modules/ai-conversation-room/ai-conversation-room.module'
import { DashboardModule } from './modules/dashboard/dashboard.module'
import { DebuffRoundModule } from './modules/debuff-round/debuff-round.module'
import { FeatureModule } from './modules/feature/feature.module'
import { FlashcardModule } from './modules/flashcard/flashcard.module'
import { GachaBannerModule } from './modules/gacha-banner/gacha-banner.module'
import { GachaItemRateModule } from './modules/gacha-item-rate/gacha-item-rate.module'
import { GachaItemModule } from './modules/gacha-item/gacha-item.module'
import { GachaPurchaseModule } from './modules/gacha-purchase/gacha-purchase.module'
import { GachaRollHistoryModule } from './modules/gacha-roll-history/gacha-roll-history.module'
import { InvoiceModule } from './modules/invoice/invoice.module'
import { LeaderboardSeasonModule } from './modules/leaderboard-season/leaderboard-season.module'
import { MatchParticipantModule } from './modules/match-participant/match-participant.module'
import { MatchQueueModule } from './modules/match-queue/match-queue.module'
import { MatchRoundParticipantModule } from './modules/match-round-participant/match-round-participant.module'
import { MatchRoundModule } from './modules/match-round/match-round.module'
import { MatchModule } from './modules/match/match.module'
import { NotificationModule } from './modules/notification/notification.module'
import { PaymentModule } from './modules/payment/payment.module'
import { QuestionBankModule } from './modules/question-bank/question-bank.module'
import { RewardModule } from './modules/reward/reward.module'
import { RoundQuestionAnswerlogModule } from './modules/round-question-answerlog/round-question-answerlog.module'
import { RoundQuestionModule } from './modules/round-question/round-question.module'
import { SeasonRankRewardModule } from './modules/season-rank-reward/season-rank-reward.module'
import { ShopBannerModule } from './modules/shop-banner/shop-banner.module'
import { ShopItemModule } from './modules/shop-item/shop-item.module'
import { ShopPurchaseModule } from './modules/shop-purchase/shop-purchase.module'
import { ShopRarityPriceModule } from './modules/shop-rarity-price/shop-rarity-price.module'
import { SpeakingModule } from './modules/speaking/speaking.module'
import { SubscriptionFeatureModule } from './modules/subscription-feature/subscription-feature.module'
import { SubscriptionPlanModule } from './modules/subscription-plan/subscription-plan.module'
import { SubscriptionModule } from './modules/subscription/subscription.module'
import { TestModule } from './modules/test/test.module'
import { TestSetQuestionBankModule } from './modules/testset-questionbank/testset-questionbank.module'
import { TestSetModule } from './modules/testset/testset.module'
import { TypeEffectivenessModule } from './modules/type-effectiveness/type-effectiveness.module'
import { UserAchievementModule } from './modules/user-achievement/user-achievement.module'
import { UserAIConversationModule } from './modules/user-ai-conversation/user-ai-conversation.module'
import { UserAnswerLogModule } from './modules/user-answer-log/user-answer-log.module'
import { UserDailyRequestModule } from './modules/user-daily-request/user-daily-request.module'
import { UserExerciseAttemptModule } from './modules/user-exercise-attempt/user-exercise-attempt.module'
import { UserGachaPityModule } from './modules/user-gacha-pity/user-gacha-pity.module'
import { UserHistoryModule } from './modules/user-history/user-history.module'
import { UserPokemonModule } from './modules/user-pokemon/user-pokemon.module'
import { UserProgressModule } from './modules/user-progress/user-progress.module'
import { UserRewardHistoryModule } from './modules/user-reward-history/user-reward-history.module'
import { UserSeasonHistoryModule } from './modules/user-season-history/user-season-history.module'
import { SrsReviewModule } from './modules/user-srs-review/user-srs-review.module'
import { UserSubscriptionModule } from './modules/user-subscription/user-subscription.module'
import { UserTestAnswerLogModule } from './modules/user-test-answer-log/user-test-answer-log.module'
import { UserTestAttemptModule } from './modules/user-test-attempt/user-test-attempt.module'
import { UserTestModule } from './modules/user-test/user-test.module'
import { UserModule } from './modules/user/user.module'
import { WalletTransactionModule } from './modules/wallet-transaction/wallet-transaction.module'
import { WalletModule } from './modules/wallet/wallet.module'
import { WordTypeModule } from './modules/wordtype/wordtype.module'
import { SharedModule } from './shared/shared.module'
import { WebsocketsModule } from './websockets/websockets.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true // Cho phép dùng process.env ở mọi nơi
    }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      url:
        process.env.REDIS_URI ||
        `redis://${process.env.REDIS_HOST || 'localhost'}:${
          process.env.REDIS_PORT || '6379'
        }`
    }),
    I18nModule, // Add I18n module

    SharedModule, // Import SharedModule trước (Global module)
    GeminiModule, // Import GeminiModule sau SharedModule để có thể sử dụng PrismaService
    MailModule,
    UploadModule,
    SpeechModule,
    AuthModule,
    RoleModule,
    PermissionModule,
    VocabularyModule,
    TranslationModule,
    KanjiModule,
    LanguagesModule,
    MeaningModule,
    WordTypeModule,
    RewardModule,
    LevelModule,
    ElementalTypeModule,
    TypeEffectivenessModule,
    PokemonModule,
    UserPokemonModule,
    LessonModule,
    LessonCategoryModule,
    LessonContentModule,
    GrammarModule,
    GrammarUsageModule,
    ExercisesModule,
    AnswerModule,
    UserModule,
    AchievementGroupModule,
    DailyRequestModule,
    UserDailyRequestModule,
    UserAnswerLogModule,
    QuestionBankModule,
    UserExerciseAttemptModule,
    UserTestAttemptModule,
    UserTestAnswerLogModule,
    UserTestModule,
    UserProgressModule,
    UserRewardHistoryModule,
    UserAIConversationModule,
    AIConversationRoomModule,
    UserHistoryModule,
    AchievementGroupModule,
    AchievementModule,
    AttendenceConfigModule,
    AttendanceModule,
    GeminiConfigModule,
    TestSetModule,
    TestModule,
    TestSetQuestionBankModule,
    SpeakingModule,
    WalletModule,
    WalletTransactionModule,
    ShopBannerModule,
    ShopItemModule,
    ShopPurchaseModule,
    GachaBannerModule,
    GachaItemRateModule,
    GachaItemModule,
    ShopRarityPriceModule,
    UserGachaPityModule,
    GachaPurchaseModule,
    GachaRollHistoryModule,
    WebsocketsModule,
    LeaderboardSeasonModule,
    MatchQueueModule,
    MatchModule,
    MatchRoundModule,
    MatchParticipantModule,
    MatchRoundParticipantModule,
    DebuffRoundModule,
    SrsReviewModule,
    UserSeasonHistoryModule,
    UserAIConversationModule,
    AIConversationRoomModule,
    RoundQuestionModule,
    RoundQuestionAnswerlogModule,
    SeasonRankRewardModule,
    UserAchievementModule,
    SubscriptionModule,
    SubscriptionFeatureModule,
    FlashcardModule,
    SubscriptionPlanModule,
    FeatureModule,
    UserSubscriptionModule,
    InvoiceModule,
    PaymentModule,
    NotificationModule,
    DashboardModule
  ],

  controllers: [],
  providers: [
    HandleShopBannerCronjob,
    HandleUserSubscriptionCronjob, // Cronjob chạy mỗi giờ để cancel subscription hết hạn
    HandleGachaBannerCronjob,
    HandleLeaderboardSeasonCronjob,
    HandleMatchmakingCronjob, // Cronjob chạy mỗi 5s để xử lý matchmaking
    {
      provide: APP_PIPE,
      useClass: CustomZodValidationPipe
    },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    {
      provide: APP_FILTER,
      useClass: ApiExceptionFilter
    }
  ]
})
export class AppModule {}
