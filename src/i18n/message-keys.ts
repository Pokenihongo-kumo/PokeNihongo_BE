// Message keys for i18n
export const AuthMessage = {
  LOGIN_SUCCESS: 'auth.LOGIN_SUCCESS',
  REGISTER_SUCCESS: 'auth.REGISTER_SUCCESS',
  LOGOUT_SUCCESS: 'auth.LOGOUT_SUCCESS',
  FORGOT_PASSWORD_SUCCESS: 'auth.FORGOT_PASSWORD_SUCCESS',
  UPDATE_PROFILE_SUCCESS: 'auth.UPDATE_PROFILE_SUCCESS',
  GET_PROFILE_SUCCESS: 'auth.GET_PROFILE_SUCCESS',
  PHONE_IS_INVALID: 'auth.PHONE_IS_INVALID',
  NAME_IS_REQUIRED: 'auth.NAME_IS_REQUIRED',
  REFRESH_TOKEN_SUCCESS: 'auth.REFRESH_TOKEN_SUCCESS',
  INVALID_OTP: 'auth.INVALID_OTP',
  OTP_EXPIRED: 'auth.OTP_EXPIRED',
  FAILED_TO_SEND_OTP: 'auth.FAILED_TO_SEND_OTP',
  EMAIL_ALREADY_EXISTS: 'auth.EMAIL_ALREADY_EXISTS',
  NOT_FOUND_EMAIL: 'auth.NOT_FOUND_EMAIL',
  EMAIL_INACTIVE: 'auth.EMAIL_INACTIVE',
  EMAIL_ACTIVE: 'auth.EMAIL_ACTIVE',
  REFRESH_TOKEN_ALREADY_USED: 'auth.REFRESH_TOKEN_ALREADY_USED',
  UNAUTHORIZED_ACCESS: 'auth.UNAUTHORIZED_ACCESS',
  ACCOUNT_IS_BANNED: 'auth.ACCOUNT_IS_BANNED',
  FAILD_TO_GET_GOOGLE_USER_INFO: 'auth.FAILD_TO_GET_GOOGLE_USER_INFO',
  RESET_PASSWORD_SUCCESS: 'auth.RESET_PASSWORD_SUCCESS',
  SEND_OTP_SUCCESS: 'auth.SEND_OTP_SUCCESS',
  VERIFY_OTP_FORGOT_PASSWORD_SUCCESS: 'auth.VERIFY_OTP_FORGOT_PASSWORD_SUCCESS',
  CHANGE_PASSWORD_SUCCESS: 'auth.CHANGE_PASSWORD_SUCCESS',
  INVALID_PASSWORD: 'auth.INVALID_PASSWORD',
  UNVERIFIED_ACCOUNT: 'auth.UNVERIFIED_ACCOUNT',
  NEED_DEVICE_VERIFICATION: 'auth.NEED_DEVICE_VERIFICATION',
  INVALID_TOTP: 'auth.INVALID_TOTP',
  TOTP_ALREADY_ENABLED: 'auth.TOTP_ALREADY_ENABLED',
  TOTP_NOT_ENABLED: 'auth.TOTP_NOT_ENABLED',
  INVALID_TOTP_AND_CODE: 'auth.INVALID_TOTP_AND_CODE',
  OTP_AUTHENTICATION_SUCCESS: 'auth.OTP_AUTHENTICATION_SUCCESS',
  FAIL_TO_LOGIN: 'auth.FAIL_TO_LOGIN',
  FIRST_LOGIN: 'auth.FIRST_LOGIN',
  NOT_FIRST_LOGIN: 'auth.NOT_FIRST_LOGIN',
  INVALID_NEW_PASSWORD_CONFIRM_PASSWORD_REGISTER:
    'auth.INVALID_NEW_PASSWORD_CONFIRM_PASSWORD_REGISTER',
  INVALID_NEW_PASSWORD_CONFIRM_PASSWORD: 'auth.INVALID_NEW_PASSWORD_CONFIRM_PASSWORD',
  INVALID_OLD_PASSWORD: 'auth.INVALID_OLD_PASSWORD',
  NOT_FOUND_RECORD: 'auth.NOT_FOUND_RECORD',
  PASSWORD_MUST_BE_MATCH: 'auth.PASSWORD_MUST_BE_MATCH',
  MISSING_TOKEN: 'auth.MISSING_TOKEN',
  INVALID_TOKEN: 'auth.INVALID_TOKEN',
  UPDATE_LEVEL_JLPT_SUCCESS: 'auth.UPDATE_LEVEL_JLPT_SUCCESS',
  UPDATE_SUCCESS: 'auth.UPDATE_SUCCESS',
  MISSING_ACCESS_TOKEN: 'auth.MISSING_ACCESS_TOKEN'
} as const

export const RewardMessage = {
  CREATE_SUCCESS: 'reward.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'reward.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'reward.DELETE_SUCCESS',
  GET_SUCCESS: 'reward.GET_SUCCESS',
  GET_LIST_SUCCESS: 'reward.GET_LIST_SUCCESS',
  NOT_FOUND: 'reward.NOT_FOUND',
  ALREADY_EXISTS: 'reward.ALREADY_EXISTS',
  INVALID_DATA: 'reward.INVALID_DATA',
  NAME_REQUIRED: 'reward.NAME_REQUIRED'
} as const

export const LessonCategoryMessage = {
  CREATE_SUCCESS: 'lesson_category.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'lesson_category.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'lesson_category.DELETE_SUCCESS',
  GET_SUCCESS: 'lesson_category.GET_SUCCESS',
  GET_LIST_SUCCESS: 'lesson_category.GET_LIST_SUCCESS',
  CREATE_DEFAULT_SUCCESS: 'lesson_category.CREATE_DEFAULT_SUCCESS',
  NOT_FOUND: 'lesson_category.NOT_FOUND',
  ALREADY_EXISTS: 'lesson_category.ALREADY_EXISTS',
  INVALID_DATA: 'lesson_category.INVALID_DATA',
  INVALID_ID: 'lesson_category.INVALID_ID',
  NAME_KEY_REQUIRED: 'lesson_category.NAME_KEY_REQUIRED',
  NAME_KEY_TOO_LONG: 'lesson_category.NAME_KEY_TOO_LONG',
  SLUG_REQUIRED: 'lesson_category.SLUG_REQUIRED',
  SLUG_TOO_LONG: 'lesson_category.SLUG_TOO_LONG'
} as const

export const LanguagesMessage = {
  CREATE_SUCCESS: 'languages.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'languages.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'languages.DELETE_SUCCESS',
  GET_SUCCESS: 'languages.GET_SUCCESS',
  GET_LIST_SUCCESS: 'languages.GET_LIST_SUCCESS',
  NOT_FOUND: 'languages.NOT_FOUND',
  ALREADY_EXISTS: 'languages.ALREADY_EXISTS',
  INVALID_DATA: 'languages.INVALID_DATA',
  INVALID_ID: 'languages.INVALID_ID',
  CODE_TOO_SHORT: 'languages.CODE_TOO_SHORT',
  CODE_TOO_LONG: 'languages.CODE_TOO_LONG',
  CODE_INVALID: 'languages.CODE_INVALID',
  CODE_REQUIRED: 'languages.CODE_REQUIRED',
  NAME_REQUIRED: 'languages.NAME_REQUIRED',
  NAME_TOO_LONG: 'languages.NAME_TOO_LONG',
  NAME_INVALID: 'languages.NAME_INVALID'
} as const

export const WordTypeMessage = {
  CREATE_SUCCESS: 'wordtype.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'wordtype.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'wordtype.DELETE_SUCCESS',
  GET_SUCCESS: 'wordtype.GET_SUCCESS',
  GET_LIST_SUCCESS: 'wordtype.GET_LIST_SUCCESS',
  GET_STATS_SUCCESS: 'wordtype.GET_STATS_SUCCESS',
  CREATE_DEFAULT_SUCCESS: 'wordtype.CREATE_DEFAULT_SUCCESS',
  NOT_FOUND: 'wordtype.NOT_FOUND',
  ALREADY_EXISTS: 'wordtype.ALREADY_EXISTS',
  INVALID_DATA: 'wordtype.INVALID_DATA',
  INVALID_ID: 'wordtype.INVALID_ID'
} as const

export const SystemMessage = {
  NOT_FOUND: 'system.NOT_FOUND',
  INVALID_NEW_PASSWORD_CONFIRM_PASSWORD: 'system.INVALID_NEW_PASSWORD_CONFIRM_PASSWORD',
  INVALID_NEW_PASSWORD_CONFIRM_PASSWORD_REGISTER:
    'system.INVALID_NEW_PASSWORD_CONFIRM_PASSWORD_REGISTER',
  INVALID_PASSWORD: 'system.INVALID_PASSWORD',
  INVALID_OLD_PASSWORD: 'system.INVALID_OLD_PASSWORD',
  SESSION_EXPIRED: 'system.SESSION_EXPIRED',
  UNAUTHORIZED: 'system.UNAUTHORIZED',
  CONFLICT_FOREIGN_KEY: 'system.CONFLICT_FOREIGN_KEY'
} as const

export const LevelMessage = {
  CREATE_SUCCESS: 'level.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'level.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'level.DELETE_SUCCESS',
  GET_SUCCESS: 'level.GET_SUCCESS',
  GET_LIST_SUCCESS: 'level.GET_LIST_SUCCESS',
  NOT_FOUND: 'level.NOT_FOUND',
  ALREADY_EXISTS: 'level.ALREADY_EXISTS',
  INVALID_DATA: 'level.INVALID_DATA',
  LEVEL_NUMBER_REQUIRED: 'level.LEVEL_NUMBER_REQUIRED',
  LEVEL_NUMBER_MIN: 'level.LEVEL_NUMBER_MIN',
  REQUIRED_EXP_REQUIRED: 'level.REQUIRED_EXP_REQUIRED',
  LEVEL_TYPE_REQUIRED: 'level.LEVEL_TYPE_REQUIRED',
  NEXT_LEVEL_ID_REQUIRED: 'level.NEXT_LEVEL_ID_REQUIRED',
  REWARD_ID_REQUIRED: 'level.REWARD_ID_REQUIRED',
  CONFLICT_TYPE_NEXT_LEVEL: 'level.CONFLICT_TYPE_NEXT_LEVEL'
} as const

export const ElementalTypeMessage = {
  CREATE_SUCCESS: 'elemental_type.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'elemental_type.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'elemental_type.DELETE_SUCCESS',
  GET_SUCCESS: 'elemental_type.GET_SUCCESS',
  GET_LIST_SUCCESS: 'elemental_type.GET_LIST_SUCCESS',
  NOT_FOUND: 'elemental_type.NOT_FOUND',
  ALREADY_EXISTS: 'elemental_type.ALREADY_EXISTS',
  INVALID_DATA: 'elemental_type.INVALID_DATA',
  TYPE_NAME_REQUIRED: 'elemental_type.TYPE_NAME_REQUIRED',
  TYPE_NAME_MAX_LENGTH: 'elemental_type.TYPE_NAME_MAX_LENGTH',
  DISPLAY_NAME_REQUIRED: 'elemental_type.DISPLAY_NAME_REQUIRED',
  INVALID_COLOR_HEX: 'elemental_type.INVALID_COLOR_HEX'
} as const

export const TypeEffectivenessMessage = {
  CREATE_SUCCESS: 'type_effectiveness.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'type_effectiveness.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'type_effectiveness.DELETE_SUCCESS',
  GET_SUCCESS: 'type_effectiveness.GET_SUCCESS',
  GET_LIST_SUCCESS: 'type_effectiveness.GET_LIST_SUCCESS',
  NOT_FOUND: 'type_effectiveness.NOT_FOUND',
  ALREADY_EXISTS: 'type_effectiveness.ALREADY_EXISTS',
  INVALID_DATA: 'type_effectiveness.INVALID_DATA',
  INVALID_MULTIPLIER: 'type_effectiveness.INVALID_MULTIPLIER',
  INVALID_ID: 'type_effectiveness.INVALID_ID',
  ATTACK_TYPE_ID_REQUIRED: 'type_effectiveness.ATTACK_TYPE_ID_REQUIRED',
  DEFENSE_TYPE_ID_REQUIRED: 'type_effectiveness.DEFENSE_TYPE_ID_REQUIRED',
  MULTIPLIER_REQUIRED: 'type_effectiveness.MULTIPLIER_REQUIRED',
  MULTIPLIER_MIN: 'type_effectiveness.MULTIPLIER_MIN',
  MULTIPLIER_MAX: 'type_effectiveness.MULTIPLIER_MAX',
  CONFLICT_ATTACK_DEFENSE_TYPE: 'type_effectiveness.CONFLICT_ATTACK_DEFENSE_TYPE',
  MULTIPLIER_INVALID: 'type_effectiveness.MULTIPLIER_INVALID'
} as const

export const PokemonMessage = {
  CREATE_SUCCESS: 'pokemon.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'pokemon.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'pokemon.DELETE_SUCCESS',
  GET_LIST_SUCCESS: 'pokemon.GET_LIST_SUCCESS',
  GET_DETAIL_SUCCESS: 'pokemon.GET_DETAIL_SUCCESS',
  INVALID_ID: 'pokemon.INVALID_ID',
  NOT_FOUND: 'pokemon.NOT_FOUND',
  ALREADY_EXISTS: 'pokemon.ALREADY_EXISTS',
  POKEDEX_NUMBER_REQUIRED: 'pokemon.POKEDEX_NUMBER_REQUIRED',
  NAME_JP_REQUIRED: 'pokemon.NAME_JP_REQUIRED',
  ASSIGN_TYPES_SUCCESS: 'pokemon.ASSIGN_TYPES_SUCCESS',
  INVALID_EVOLUTION: 'pokemon.INVALID_EVOLUTION',
  POKEDEX_INVALID: 'pokemon.POKEDEX_INVALID',
  NAME_JP_INVALID: 'pokemon.NAME_JP_INVALID',
  NAME_TRANSLATIONS_INVALID: 'pokemon.NAME_TRANSLATIONS_INVALID',
  NEED_AT_LEAST_ONE_TYPE: 'pokemon.NEED_AT_LEAST_ONE_TYPE',
  NEED_EVOLUTION: 'pokemon.NEED_EVOLUTION',
  INVALID_FORMAT: 'pokemon.INVALID_FORMAT',
  NO_TYPE_WEAKNESS: 'pokemon.NO_TYPE_WEAKNESS',
  GET_EVOLUTION_OPTIONS_SUCCESS: 'pokemon.GET_EVOLUTION_OPTIONS_SUCCESS',
  CALCULATE_WEAKNESS_SUCCESS: 'pokemon.CALCULATE_WEAKNESS_SUCCESS'
} as const

export const UserPokemonMessage = {
  GET_STATS_SUCCESS: 'user_pokemon.GET_STATS_SUCCESS',
  CREATE_SUCCESS: 'user_pokemon.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'user_pokemon.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'user_pokemon.DELETE_SUCCESS',
  GET_LIST_SUCCESS: 'user_pokemon.GET_LIST_SUCCESS',
  GET_DETAIL_SUCCESS: 'user_pokemon.GET_DETAIL_SUCCESS',
  INVALID_ID: 'user_pokemon.INVALID_ID',
  NOT_FOUND: 'user_pokemon.NOT_FOUND',
  NICKNAME_ALREADY_EXISTS: 'user_pokemon.NICKNAME_ALREADY_EXISTS',
  ERROR_INIT_LEVEL: 'user_pokemon.ERROR_INIT_LEVEL',
  INVALID_ACCESS_POKEMON: 'user_pokemon.INVALID_ACCESS_POKEMON',
  INVALID_NEXT_POKEMON: 'user_pokemon.INVALID_NEXT_POKEMON',
  CANNOT_EVOLVE: 'user_pokemon.CANNOT_EVOLVE',
  USER_HAS_POKEMON: 'user_pokemon.USER_HAS_POKEMON',
  INVALID_NICKNAME: 'user_pokemon.INVALID_NICKNAME',
  INVALID_EXP: 'user_pokemon.INVALID_EXP',
  SET_MAIN_POKEMON_SUCCESS: 'user_pokemon.SET_MAIN_POKEMON_SUCCESS',
  EVOLVE_SUCCESS: 'user_pokemon.EVOLVE_SUCCESS',
  ADD_EXP_SUCCESS: 'user_pokemon.ADD_EXP_SUCCESS',
  LEVEL_UP_SUCCESS: 'user_pokemon.LEVEL_UP_SUCCESS',
  USER_NOT_IN_ROUND: 'user_pokemon.USER_NOT_IN_ROUND'
} as const

export const UserMessage = {
  GET_LIST_SUCCESS: 'user.GET_LIST_SUCCESS',
  GET_DETAIL_SUCCESS: 'user.GET_DETAIL_SUCCESS',
  CREATE_SUCCESS: 'user.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'user.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'user.DELETE_SUCCESS',
  NOT_FOUND: 'user.NOT_FOUND',
  EMAIL_ALREADY_EXISTS: 'user.EMAIL_ALREADY_EXISTS',
  INVALID_DATA: 'user.INVALID_DATA',
  INVALID_EMAIL: 'user.INVALID_EMAIL',
  NAME_REQUIRED: 'user.NAME_REQUIRED',
  PASSWORD_MIN: 'user.PASSWORD_MIN',
  PHONE_INVALID: 'user.PHONE_INVALID',
  SET_MAIN_POKEMON_SUCCESS: 'user.SET_MAIN_POKEMON_SUCCESS',
  HAS_NOT_JOINED_SEASON: 'user.HAS_NOT_JOINED_SEASON'
} as const

export const FlashcardMessage = {
  CREATE_DECK_SUCCESS: 'flashcard.CREATE_DECK_SUCCESS',
  UPDATE_DECK_SUCCESS: 'flashcard.UPDATE_DECK_SUCCESS',
  DELETE_DECK_SUCCESS: 'flashcard.DELETE_DECK_SUCCESS',
  GET_DECK_SUCCESS: 'flashcard.GET_DECK_SUCCESS',
  GET_DECK_LIST_SUCCESS: 'flashcard.GET_DECK_LIST_SUCCESS',
  CREATE_CARD_SUCCESS: 'flashcard.CREATE_CARD_SUCCESS',
  UPDATE_CARD_SUCCESS: 'flashcard.UPDATE_CARD_SUCCESS',
  DELETE_CARD_SUCCESS: 'flashcard.DELETE_CARD_SUCCESS',
  IMPORT_CARD_SUCCESS: 'flashcard.IMPORT_CARD_SUCCESS',
  NOT_FOUND_DECK: 'flashcard.NOT_FOUND_DECK',
  NOT_FOUND_CARD: 'flashcard.NOT_FOUND_CARD',
  INVALID_CONTENT_TYPE: 'flashcard.INVALID_CONTENT_TYPE',
  CONTENT_ALREADY_IN_DECK: 'flashcard.CONTENT_ALREADY_IN_DECK',
  INVALID_IMPORT_IDS: 'flashcard.INVALID_IMPORT_IDS',
  GET_LIBRARY_SUCCESS: 'flashcard.GET_LIBRARY_SUCCESS',
  GET_REVIEW_LIST_SUCCESS: 'flashcard.GET_REVIEW_LIST_SUCCESS',
  REVIEW_CARD_SUCCESS: 'flashcard.REVIEW_CARD_SUCCESS',
  EXPORT_DECK_SUCCESS: 'flashcard.EXPORT_DECK_SUCCESS'
} as const

export const RoleMessage = {
  CREATE_SUCCESS: 'role.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'role.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'role.DELETE_SUCCESS',
  GET_SUCCESS: 'role.GET_SUCCESS',
  GET_LIST_SUCCESS: 'role.GET_LIST_SUCCESS',
  NOT_FOUND: 'role.NOT_FOUND',
  ALREADY_EXISTS: 'role.ALREADY_EXISTS',
  PROHIBITED_ACTION_ON_BASE_ROLE: 'role.PROHIBITED_ACTION_ON_BASE_ROLE'
} as const

export const PermissionMessage = {
  CREATE_SUCCESS: 'permission.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'permission.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'permission.DELETE_SUCCESS',
  GET_SUCCESS: 'permission.GET_SUCCESS',
  GET_LIST_SUCCESS: 'permission.GET_LIST_SUCCESS',
  NOT_FOUND: 'permission.NOT_FOUND',
  ALREADY_EXISTS: 'permission.ALREADY_EXISTS'
} as const

export const ValidationMessage = {
  INVALID_DATA: 'validation.INVALID_DATA',
  REQUIRED: 'validation.REQUIRED',
  INVALID_FORMAT: 'validation.INVALID_FORMAT',
  INVALID_USER_ID: 'validation.INVALID_USER_ID'
} as const

export const CommonMessage = {
  SUCCESS: 'common.SUCCESS',
  ERROR: 'common.ERROR',
  INVALID_DATA: 'common.INVALID_DATA',
  UNAUTHORIZED: 'common.UNAUTHORIZED',
  FORBIDDEN: 'common.FORBIDDEN',
  LANGUAGE_NOT_EXIST_TO_TRANSLATE: 'common.LANGUAGE_NOT_EXIST_TO_TRANSLATE',
  ERROR_UNKNOW_WITH_PAYOS_SYSTEM: 'common.ERROR_UNKNOW_WITH_PAYOS_SYSTEM'
} as const

export const ENTITY_MESSAGE = {
  INVALID_DATA: 'entity.INVALID_DATA',
  NOT_FOUND: 'entity.NOT_FOUND',
  ALREADY_EXISTS: 'entity.ALREADY_EXISTS',
  INVALID_ID: 'entity.INVALID_ID',
  GET_LIST_SUCCESS: 'entity.GET_LIST_SUCCESS',
  GET_SUCCESS: 'entity.GET_SUCCESS',
  CREATE_SUCCESS: 'entity.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'entity.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'entity.DELETE_SUCCESS'
} as const

export const AchievementGroupMessage = {
  CREATE_SUCCESS: 'achievement_group.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'achievement_group.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'achievement_group.DELETE_SUCCESS',
  GET_SUCCESS: 'achievement_group.GET_SUCCESS',
  GET_LIST_SUCCESS: 'achievement_group.GET_LIST_SUCCESS',
  NOT_FOUND: 'achievement_group.NOT_FOUND',
  ALREADY_EXISTS: 'achievement_group.ALREADY_EXISTS',
  INVALID_DATA: 'achievement_group.INVALID_DATA',
  NAME_REQUIRED: 'achievement_group.NAME_REQUIRED'
} as const

export const DailyRequestMessage = {
  CREATE_SUCCESS: 'daily_request.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'daily_request.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'daily_request.DELETE_SUCCESS',
  GET_SUCCESS: 'daily_request.GET_SUCCESS',
  GET_LIST_SUCCESS: 'daily_request.GET_LIST_SUCCESS',
  NOT_FOUND: 'daily_request.NOT_FOUND',
  ALREADY_EXISTS: 'daily_request.ALREADY_EXISTS'
} as const

export const TranslationMessage = {
  DUPLICATE_LANGUAGE: 'translation.DUPLICATE_LANGUAGE',
  ALREADY_EXISTS: 'translation.ALREADY_EXISTS',
  DUPLICATE_VALUE: 'translation.DUPLICATE_VALUE'
} as const

export const UserDailyRequestMessage = {
  CREATE_SUCCESS: 'user_daily_request.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'user_daily_request.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'user_daily_request.DELETE_SUCCESS',
  GET_SUCCESS: 'user_daily_request.GET_SUCCESS',
  GET_LIST_SUCCESS: 'user_daily_request.GET_LIST_SUCCESS',
  NOT_FOUND: 'user_daily_request.NOT_FOUND',
  ALREADY_EXISTS: 'user_daily_request.ALREADY_EXISTS',
  USER_ALREADY_ATTENDED_TODAY: 'user_daily_request.USER_ALREADY_ATTENDED_TODAY'
} as const

export const AchievementMessage = {
  CREATE_SUCCESS: 'achievement.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'achievement.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'achievement.DELETE_SUCCESS',
  GET_SUCCESS: 'achievement.GET_SUCCESS',
  GET_LIST_SUCCESS: 'achievement.GET_LIST_SUCCESS',
  NOT_FOUND: 'achievement.NOT_FOUND',
  ALREADY_EXISTS: 'achievement.ALREADY_EXISTS',
  INVALID_DATA: 'achievement.INVALID_DATA'
} as const

export const DailyRequestCategoryMessage = {
  CREATE_SUCCESS: 'daily_request_category.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'daily_request_category.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'daily_request_category.DELETE_SUCCESS',
  GET_SUCCESS: 'daily_request_category.GET_SUCCESS',
  GET_LIST_SUCCESS: 'daily_request_category.GET_LIST_SUCCESS',
  NOT_FOUND: 'daily_request_category.NOT_FOUND',
  ALREADY_EXISTS: 'daily_request_category.ALREADY_EXISTS'
} as const

export const AttendenceConfigMessage = {
  CREATE_SUCCESS: 'attendence_config.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'attendence_config.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'attendence_config.DELETE_SUCCESS',
  GET_SUCCESS: 'attendence_config.GET_SUCCESS',
  GET_LIST_SUCCESS: 'attendence_config.GET_LIST_SUCCESS',
  NOT_FOUND: 'attendence_config.NOT_FOUND',
  ALREADY_EXISTS: 'attendence_config.ALREADY_EXISTS',
  INVALID_DATA: 'attendence_config.INVALID_DATA',
  INVALID_DAY_OF_WEEK: 'attendence_config.INVALID_DAY_OF_WEEK'
} as const
export const AttendanceMessage = {
  CREATE_SUCCESS: 'attendance.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'attendance.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'attendance.DELETE_SUCCESS',
  GET_SUCCESS: 'attendance.GET_SUCCESS',
  GET_LIST_SUCCESS: 'attendance.GET_LIST_SUCCESS',
  NOT_FOUND: 'attendance.NOT_FOUND',
  ALREADY_EXISTS: 'attendance.ALREADY_EXISTS',
  INVALID_DATA: 'attendance.INVALID_DATA',
  CHECKIN_ALREADY: 'attendance.CHECKIN_ALREADY'
} as const

export const WalletMessage = {
  CREATE_SUCCESS: 'wallet.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'wallet.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'wallet.DELETE_SUCCESS',
  GET_SUCCESS: 'wallet.GET_SUCCESS',
  GET_LIST_SUCCESS: 'wallet.GET_LIST_SUCCESS',
  NOT_FOUND: 'wallet.NOT_FOUND',
  ALREADY_EXISTS: 'wallet.ALREADY_EXISTS',
  INVALID_DATA: 'wallet.INVALID_DATA',
  INSUFFICIENT_BALANCE: 'wallet.INSUFFICIENT_BALANCE'
} as const

export const WalletTransactionMessage = {
  CREATE_SUCCESS: 'wallet_transaction.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'wallet_transaction.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'wallet_transaction.DELETE_SUCCESS',
  GET_SUCCESS: 'wallet_transaction.GET_SUCCESS',
  GET_LIST_SUCCESS: 'wallet_transaction.GET_LIST_SUCCESS',
  NOT_FOUND: 'wallet_transaction.NOT_FOUND',
  ALREADY_EXISTS: 'wallet_transaction.ALREADY_EXISTS',
  INVALID_DATA: 'wallet_transaction.INVALID_DATA'
} as const

export const ShopBannerMessage = {
  CREATE_SUCCESS: 'shop_banner.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'shop_banner.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'shop_banner.DELETE_SUCCESS',
  GET_SUCCESS: 'shop_banner.GET_SUCCESS',
  GET_LIST_SUCCESS: 'shop_banner.GET_LIST_SUCCESS',
  NOT_FOUND: 'shop_banner.NOT_FOUND',
  ALREADY_EXISTS: 'shop_banner.ALREADY_EXISTS',
  INVALID_DATA: 'shop_banner.INVALID_DATA',
  ONLY_ONE_ACTIVE: 'shop_banner.ONLY_ONE_ACTIVE',
  INVALID_MIN_MAX: 'shop_banner.INVALID_MIN_MAX'
} as const

export const ShopItemMessage = {
  CREATE_SUCCESS: 'shop_item.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'shop_item.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'shop_item.DELETE_SUCCESS',
  GET_SUCCESS: 'shop_item.GET_SUCCESS',
  GET_LIST_SUCCESS: 'shop_item.GET_LIST_SUCCESS',
  NOT_FOUND: 'shop_item.NOT_FOUND',
  ALREADY_EXISTS: 'shop_item.ALREADY_EXISTS',
  INVALID_DATA: 'shop_item.INVALID_DATA',
  SHOP_BANNER_INVALID: 'shop_item.SHOP_BANNER_INVALID',
  SHOP_BANNER_INACTIVE: 'shop_item.SHOP_BANNER_INACTIVE',
  SHOP_BANNER_ACTIVE: 'shop_item.SHOP_BANNER_ACTIVE',
  SHOP_BANNER_EXPIRED: 'shop_item.SHOP_BANNER_EXPIRED',
  POKEMON_DUPLICATE: 'shop_item.POKEMON_DUPLICATE',
  MAX_ITEMS_EXCEEDED: 'shop_item.MAX_ITEMS_EXCEEDED'
} as const

export const ShopPurchaseMessage = {
  CREATE_SUCCESS: 'shop_purchase.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'shop_purchase.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'shop_purchase.DELETE_SUCCESS',
  GET_SUCCESS: 'shop_purchase.GET_SUCCESS',
  GET_LIST_SUCCESS: 'shop_purchase.GET_LIST_SUCCESS',
  NOT_FOUND: 'shop_purchase.NOT_FOUND',

  ALREADY_EXISTS: 'shop_purchase.ALREADY_EXISTS',
  INVALID_DATA: 'shop_purchase.INVALID_DATA',
  PURCHASE_LIMIT_REACHED: 'shop_purchase.PURCHASE_LIMIT_REACHED',
  MISSING_PREVIOUS_POKEMON: 'shop_purchase.MISSING_PREVIOUS_POKEMON',
  SHOP_NOT_OPEN: 'shop_purchase.SHOP_NOT_OPEN'
} as const

export const GachaBannerMessage = {
  CREATE_SUCCESS: 'gacha_banner.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'gacha_banner.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'gacha_banner.DELETE_SUCCESS',
  GET_SUCCESS: 'gacha_banner.GET_SUCCESS',
  GET_LIST_SUCCESS: 'gacha_banner.GET_LIST_SUCCESS',
  NOT_FOUND: 'gacha_banner.NOT_FOUND',
  ALREADY_EXISTS: 'gacha_banner.ALREADY_EXISTS',
  INVALID_DATA: 'gacha_banner.INVALID_DATA',
  ACTIVE_LIMIT_EXCEEDED: 'gacha_banner.ACTIVE_LIMIT_EXCEEDED',
  INVALID_AMOUNT_ITEMS: 'gacha_banner.INVALID_AMOUNT_ITEMS'
} as const

export const GachaItemRateMessage = {
  CREATE_SUCCESS: 'gacha_item_rate.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'gacha_item_rate.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'gacha_item_rate.DELETE_SUCCESS',

  GET_LIST_SUCCESS: 'gacha_item_rate.GET_LIST_SUCCESS',
  GET_SUCCESS: 'gacha_item_rate.GET_SUCCESS',
  NOT_FOUND: 'gacha_item_rate.NOT_FOUND',
  ALREADY_EXISTS: 'gacha_item_rate.ALREADY_EXISTS',
  INVALID_DATA: 'gacha_item_rate.INVALID_DATA'
} as const

export const GachaItemMessage = {
  CREATE_SUCCESS: 'gacha_item.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'gacha_item.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'gacha_item.DELETE_SUCCESS',
  GET_LIST_SUCCESS: 'gacha_item.GET_LIST_SUCCESS',
  GET_DETAIL_SUCCESS: 'gacha_item.GET_DETAIL_SUCCESS',
  NOT_FOUND: 'gacha_item.NOT_FOUND',
  ALREADY_EXISTS: 'gacha_item.ALREADY_EXISTS',
  INVALID_DATA: 'gacha_item.INVALID_DATA',
  GACHA_BANNER_INVALID: 'gacha_item.GACHA_BANNER_INVALID',
  GACHA_BANNER_INACTIVE: 'gacha_item.GACHA_BANNER_INACTIVE',
  GACHA_BANNER_ACTIVE: 'gacha_item.GACHA_BANNER_ACTIVE',
  GACHA_BANNER_EXPIRED: 'gacha_item.GACHA_BANNER_EXPIRED',
  POKEMON_DUPLICATE: 'gacha_item.POKEMON_DUPLICATE',
  MAX_ITEMS_EXCEEDED: 'gacha_item.MAX_ITEMS_EXCEEDED',
  POKEMON_HAS_PREV_EVOLUTION: 'gacha_item.POKEMON_HAS_PREV_EVOLUTION',
  POKEMON_INVALID_RARITY_WITH_STAR_TYPE_TO_ADD:
    'gacha_item.POKEMON_INVALID_RARITY_WITH_STAR_TYPE_TO_ADD',
  DUPLICATE_STAR_TYPE_IN_LIST: 'gacha_item.DUPLICATE_STAR_TYPE_IN_LIST'
} as const

export const ShopRarityPriceMessage = {
  CREATE_SUCCESS: 'shop_rarity_price.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'shop_rarity_price.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'shop_rarity_price.DELETE_SUCCESS',
  GET_SUCCESS: 'shop_rarity_price.GET_SUCCESS',
  GET_LIST_SUCCESS: 'shop_rarity_price.GET_LIST_SUCCESS',
  NOT_FOUND: 'shop_rarity_price.NOT_FOUND',
  ALREADY_EXISTS: 'shop_rarity_price.ALREADY_EXISTS',
  INVALID_DATA: 'shop_rarity_price.INVALID_DATA'
} as const

export const UserGachaPityMessage = {
  CREATE_SUCCESS: 'user_gacha_pity.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'user_gacha_pity.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'user_gacha_pity.DELETE_SUCCESS',
  GET_SUCCESS: 'user_gacha_pity.GET_SUCCESS',
  GET_LIST_SUCCESS: 'user_gacha_pity.GET_LIST_SUCCESS',
  NOT_FOUND: 'user_gacha_pity.NOT_FOUND',
  ALREADY_EXISTS: 'user_gacha_pity.ALREADY_EXISTS',
  INVALID_DATA: 'user_gacha_pity.INVALID_DATA',
  HAS_PENDING: 'user_gacha_pity.HAS_PENDING'
} as const

export const GachaPurchaseMessage = {
  CREATE_SUCCESS: 'gacha_purchase.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'gacha_purchase.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'gacha_purchase.DELETE_SUCCESS',
  GET_SUCCESS: 'gacha_purchase.GET_SUCCESS',
  GET_LIST_SUCCESS: 'gacha_purchase.GET_LIST_SUCCESS',
  NOT_FOUND: 'gacha_purchase.NOT_FOUND',
  ALREADY_EXISTS: 'gacha_purchase.ALREADY_EXISTS',
  INVALID_DATA: 'gacha_purchase.INVALID_DATA'
} as const

export const GachaRollHistoryMessage = {
  CREATE_SUCCESS: 'gacha_roll_history.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'gacha_roll_history.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'gacha_roll_history.DELETE_SUCCESS',
  GET_SUCCESS: 'gacha_roll_history.GET_SUCCESS',
  GET_LIST_SUCCESS: 'gacha_roll_history.GET_LIST_SUCCESS',
  NOT_FOUND: 'gacha_roll_history.NOT_FOUND',
  ALREADY_EXISTS: 'gacha_roll_history.ALREADY_EXISTS',
  INVALID_DATA: 'gacha_roll_history.INVALID_DATA'
} as const

export const UserExerciseAttemptMessage = {
  REVIEW_NOT_COMPLETED: 'user_exercise_attempt.REVIEW_NOT_COMPLETED',
  REVIEW_INSUFFICIENT_SCORE: 'user_exercise_attempt.REVIEW_INSUFFICIENT_SCORE',
  REVIEW_SUCCESS: 'user_exercise_attempt.REVIEW_SUCCESS'
} as const

export const UserTestAttemptMessage = {
  REVIEW_NOT_COMPLETED: 'user_test_attempt.REVIEW_NOT_COMPLETED',
  REVIEW_INSUFFICIENT_SCORE: 'user_test_attempt.REVIEW_INSUFFICIENT_SCORE',
  REVIEW_SUCCESS: 'user_test_attempt.REVIEW_SUCCESS',
  OUT_OF_LIMIT: 'user_test_attempt.OUT_OF_LIMIT',
  USER_TEST_NOT_FOUND: 'user_test_attempt.USER_TEST_NOT_FOUND',
  TEST_COMPLETED_ALL_CORRECT: 'user_test_attempt.TEST_COMPLETED_ALL_CORRECT',
  TEST_COMPLETED_SOME_WRONG: 'user_test_attempt.TEST_COMPLETED_SOME_WRONG',
  NOT_ENOUGH_ANSWERS: 'user_test_attempt.NOT_ENOUGH_ANSWERS'
} as const

export const UserHistoryMessage = {
  GET_LIST_SUCCESS: 'user_history.GET_LIST_SUCCESS'
} as const

export const LeaderboardSeasonMessage = {
  CREATE_SUCCESS: 'leaderboard_season.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'leaderboard_season.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'leaderboard_season.DELETE_SUCCESS',
  GET_SUCCESS: 'leaderboard_season.GET_SUCCESS',
  GET_LIST_SUCCESS: 'leaderboard_season.GET_LIST_SUCCESS',
  NOT_FOUND: 'leaderboard_season.NOT_FOUND',
  ALREADY_EXISTS: 'leaderboard_season.ALREADY_EXISTS',
  INVALID_DATA: 'leaderboard_season.INVALID_DATA',
  HAS_ACTIVE: 'leaderboard_season.HAS_ACTIVE',
  HAS_OPENED: 'leaderboard_season.HAS_OPENED',
  NOT_STARTED: 'leaderboard_season.NOT_STARTED',
  NEW_SEASON: 'leaderboard_season.NEW_SEASON',
  NOT_JOIN_NEW_SEASON: 'leaderboard_season.NOT_JOIN_NEW_SEASON'
} as const

export const MatchQueueMessage = {
  CREATE_SUCCESS: 'match_queue.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'match_queue.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'match_queue.DELETE_SUCCESS',
  GET_SUCCESS: 'match_queue.GET_SUCCESS',
  GET_LIST_SUCCESS: 'match_queue.GET_LIST_SUCCESS',
  NOT_FOUND: 'match_queue.NOT_FOUND',
  ALREADY_EXISTS: 'match_queue.ALREADY_EXISTS',
  INVALID_DATA: 'match_queue.INVALID_DATA',
  USER_NOT_ENOUGH_CONDITION: 'match_queue.USER_NOT_ENOUGH_CONDITION',
  YOU_HAS_MATCH: 'match_queue.YOU_HAS_MATCH',
  LEVEL_NEED: 'match_queue.LEVEL_NEED',
  AMOUNT_POKEMON_NEED: 'match_queue.AMOUNT_POKEMON_NEED'
} as const

export const MatchMessage = {
  CREATE_SUCCESS: 'match.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'match.UPDATE_SUCCESS',

  DELETE_SUCCESS: 'match.DELETE_SUCCESS',
  GET_SUCCESS: 'match.GET_SUCCESS',
  GET_LIST_SUCCESS: 'match.GET_LIST_SUCCESS',
  NOT_FOUND: 'match.NOT_FOUND',
  ALREADY_EXISTS: 'match.ALREADY_EXISTS',
  INVALID_DATA: 'match.INVALID_DATA',
  NOT_HAVE_ACTIVE_LEADERBOARD_SEASON: 'match.NOT_HAVE_ACTIVE_LEADERBOARD_SEASON'
} as const

export const MatchRoundMessage = {
  CREATE_SUCCESS: 'match_round.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'match_round.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'match_round.DELETE_SUCCESS',
  GET_SUCCESS: 'match_round.GET_SUCCESS',
  GET_LIST_SUCCESS: 'match_round.GET_LIST_SUCCESS',
  NOT_FOUND: 'match_round.NOT_FOUND',
  ALREADY_EXISTS: 'match_round.ALREADY_EXISTS',
  INVALID_DATA: 'match_round.INVALID_DATA'
} as const

export const MatchParticipantMessage = {
  CREATE_SUCCESS: 'match_participant.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'match_participant.UPDATE_SUCCESS',

  DELETE_SUCCESS: 'match_participant.DELETE_SUCCESS',
  GET_SUCCESS: 'match_participant.GET_SUCCESS',
  GET_LIST_SUCCESS: 'match_participant.GET_LIST_SUCCESS',
  NOT_FOUND: 'match_participant.NOT_FOUND',
  ALREADY_EXISTS: 'match_participant.ALREADY_EXISTS',
  INVALID_DATA: 'match_participant.INVALID_DATA',
  INVALID_ACTION: 'match_participant.INVALID_ACTION'
} as const

export const MatchRoundParticipantMessage = {
  CREATE_SUCCESS: 'match_round_participant.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'match_round_participant.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'match_round_participant.DELETE_SUCCESS',
  GET_SUCCESS: 'match_round_participant.GET_SUCCESS',
  GET_LIST_SUCCESS: 'match_round_participant.GET_LIST_SUCCESS',
  NOT_FOUND: 'match_round_participant.NOT_FOUND',
  ALREADY_EXISTS: 'match_round_participant.ALREADY_EXISTS',

  INVALID_DATA: 'match_round_participant.INVALID_DATA'
} as const

export const DebuffRoundMessage = {
  CREATE_SUCCESS: 'debuff_round.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'debuff_round.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'debuff_round.DELETE_SUCCESS',
  GET_SUCCESS: 'debuff_round.GET_SUCCESS',
  GET_LIST_SUCCESS: 'debuff_round.GET_LIST_SUCCESS',
  NOT_FOUND: 'debuff_round.NOT_FOUND',
  ALREADY_EXISTS: 'debuff_round.ALREADY_EXISTS',
  INVALID_DATA: 'debuff_round.INVALID_DATA'
} as const

export const UserSeasonHistoryMessage = {
  CREATE_SUCCESS: 'user_season_history.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'user_season_history.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'user_season_history.DELETE_SUCCESS',
  GET_SUCCESS: 'user_season_history.GET_SUCCESS',
  GET_LIST_SUCCESS: 'user_season_history.GET_LIST_SUCCESS',
  NOT_FOUND: 'user_season_history.NOT_FOUND',
  ALREADY_EXISTS: 'user_season_history.ALREADY_EXISTS',
  INVALID_DATA: 'user_season_history.INVALID_DATA',
  CAN_NOT_CLAIM_REWARDS: 'user_season_history.CAN_NOT_CLAIM_REWARDS',
  GET_REWARD_SUCCESS: 'user_season_history.GET_REWARD_SUCCESS'
} as const

export const RoundQuestionMessage = {
  CREATE_SUCCESS: 'round_question.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'round_question.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'round_question.DELETE_SUCCESS',
  GET_SUCCESS: 'round_question.GET_SUCCESS',

  GET_LIST_SUCCESS: 'round_question.GET_LIST_SUCCESS',
  NOT_FOUND: 'round_question.NOT_FOUND',
  ALREADY_EXISTS: 'round_question.ALREADY_EXISTS',
  INVALID_DATA: 'round_question.INVALID_DATA'
} as const

export const RoundQuestionsAnswerLogMessage = {
  CREATE_SUCCESS: 'round_questions_answer_log.CREATE_SUCCESS',

  UPDATE_SUCCESS: 'round_questions_answer_log.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'round_questions_answer_log.DELETE_SUCCESS',
  GET_SUCCESS: 'round_questions_answer_log.GET_SUCCESS',
  GET_LIST_SUCCESS: 'round_questions_answer_log.GET_LIST_SUCCESS',
  NOT_FOUND: 'round_questions_answer_log.NOT_FOUND',
  ALREADY_EXISTS: 'round_questions_answer_log.ALREADY_EXISTS',
  INVALID_DATA: 'round_questions_answer_log.INVALID_DATA'
} as const

export const SeasonRankRewardMessage = {
  CREATE_SUCCESS: 'season_rank_reward.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'season_rank_reward.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'season_rank_reward.DELETE_SUCCESS',
  GET_SUCCESS: 'season_rank_reward.GET_SUCCESS',
  GET_LIST_SUCCESS: 'season_rank_reward.GET_LIST_SUCCESS',
  NOT_FOUND: 'season_rank_reward.NOT_FOUND',
  ALREADY_EXISTS: 'season_rank_reward.ALREADY_EXISTS',
  INVALID_DATA: 'season_rank_reward.INVALID_DATA',
  RANK_NAME_INVALID: 'season_rank_reward.RANK_NAME_INVALID',
  RANK_ORDER_INVALID: 'season_rank_reward.RANK_ORDER_INVALID',
  MISSSING_REWARD_FOR_ALL: 'season_rank_reward.MISSSING_REWARD_FOR_ALL'
} as const

export const UserRewardHistoryMessage = {
  CREATE_SUCCESS: 'user_reward_history.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'user_reward_history.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'user_reward_history.DELETE_SUCCESS',
  GET_SUCCESS: 'user_reward_history.GET_SUCCESS',
  GET_LIST_SUCCESS: 'user_reward_history.GET_LIST_SUCCESS',

  NOT_FOUND: 'user_reward_history.NOT_FOUND',
  ALREADY_EXISTS: 'user_reward_history.ALREADY_EXISTS',
  INVALID_DATA: 'user_reward_history.INVALID_DATA'
} as const

export const UserAchievementMessage = {
  CREATE_SUCCESS: 'user_achievement.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'user_achievement.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'user_achievement.DELETE_SUCCESS',
  GET_SUCCESS: 'user_achievement.GET_SUCCESS',
  GET_LIST_SUCCESS: 'user_achievement.GET_LIST_SUCCESS',
  GET_REWARD_SUCCESS: 'user_achievement.GET_REWARD_SUCCESS',
  NOT_FOUND: 'user_achievement.NOT_FOUND',
  ALREADY_EXISTS: 'user_achievement.ALREADY_EXISTS',
  INVALID_DATA: 'user_achievement.INVALID_DATA',
  INVALID_STATUS_CLAIM: 'user_achievement.INVALID_STATUS_CLAIM'
} as const

export const SubscriptionMessage = {
  CREATE_SUCCESS: 'subscription.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'subscription.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'subscription.DELETE_SUCCESS',
  GET_SUCCESS: 'subscription.GET_SUCCESS',
  GET_LIST_SUCCESS: 'subscription.GET_LIST_SUCCESS',
  NOT_FOUND: 'subscription.NOT_FOUND',
  ALREADY_EXISTS: 'subscription.ALREADY_EXISTS',
  INVALID_DATA: 'subscription.INVALID_DATA'
} as const

export const SubscriptionFeatureMessage = {
  CREATE_SUCCESS: 'subscription_feature.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'subscription_feature.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'subscription_feature.DELETE_SUCCESS',
  GET_SUCCESS: 'subscription_feature.GET_SUCCESS',
  GET_LIST_SUCCESS: 'subscription_feature.GET_LIST_SUCCESS',
  NOT_FOUND: 'subscription_feature.NOT_FOUND',
  ALREADY_EXISTS: 'subscription_feature.ALREADY_EXISTS',
  INVALID_DATA: 'subscription_feature.INVALID_DATA',
  INVALID_XP_MULTIPLIER_VALUE: 'subscription_feature.INVALID_XP_MULTIPLIER_VALUE',
  INVALID_COIN_MULTIPLIER_VALUE: 'subscription_feature.INVALID_COIN_MULTIPLIER_VALUE',
  DUPLICATE: 'subscription_feature.DUPLICATE'
} as const

export const SubscriptionPlanMessage = {
  CREATE_SUCCESS: 'subscription_plan.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'subscription_plan.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'subscription_plan.DELETE_SUCCESS',
  GET_SUCCESS: 'subscription_plan.GET_SUCCESS',
  GET_LIST_SUCCESS: 'subscription_plan.GET_LIST_SUCCESS',
  NOT_FOUND: 'subscription_plan.NOT_FOUND',
  ALREADY_EXISTS: 'subscription_plan.ALREADY_EXISTS',
  INVALID_DATA: 'subscription_plan.INVALID_DATA',
  NOT_READY_TO_BUY: 'subscription_plan.NOT_READY_TO_BUY'
} as const

export const FeatureMessage = {
  CREATE_SUCCESS: 'feature.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'feature.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'feature.DELETE_SUCCESS',
  GET_SUCCESS: 'feature.GET_SUCCESS',
  GET_LIST_SUCCESS: 'feature.GET_LIST_SUCCESS',
  NOT_FOUND: 'feature.NOT_FOUND',
  ALREADY_EXISTS: 'feature.ALREADY_EXISTS',
  INVALID_DATA: 'feature.INVALID_DATA'
} as const

export const UserSubscriptionMessage = {
  CREATE_SUCCESS: 'user_subscription.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'user_subscription.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'user_subscription.DELETE_SUCCESS',
  GET_SUCCESS: 'user_subscription.GET_SUCCESS',
  GET_LIST_SUCCESS: 'user_subscription.GET_LIST_SUCCESS',
  NOT_FOUND: 'user_subscription.NOT_FOUND',
  ALREADY_EXISTS: 'user_subscription.ALREADY_EXISTS',
  INVALID_DATA: 'user_subscription.INVALID_DATA',
  HAS_ACTIVE_SUBSCRIPTION: 'user_subscription.HAS_ACTIVE_SUBSCRIPTION',
  HAS_PAYMENT_PENDING_SUBSCRIPTION: 'user_subscription.HAS_PAYMENT_PENDING_SUBSCRIPTION'
} as const

export const InvoiceMessage = {
  CREATE_SUCCESS: 'invoice.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'invoice.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'invoice.DELETE_SUCCESS',
  GET_SUCCESS: 'invoice.GET_SUCCESS',
  GET_LIST_SUCCESS: 'invoice.GET_LIST_SUCCESS',
  NOT_FOUND: 'invoice.NOT_FOUND',
  ALREADY_EXISTS: 'invoice.ALREADY_EXISTS',
  INVALID_DATA: 'invoice.INVALID_DATA'
} as const

export const PaymentMessage = {
  CREATE_SUCCESS: 'payment.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'payment.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'payment.DELETE_SUCCESS',
  GET_SUCCESS: 'payment.GET_SUCCESS',
  GET_LIST_SUCCESS: 'payment.GET_LIST_SUCCESS',
  NOT_FOUND: 'payment.NOT_FOUND',
  ALREADY_EXISTS: 'payment.ALREADY_EXISTS',
  INVALID_DATA: 'payment.INVALID_DATA',
  INVALID_STATUS_PENDING: 'payment.INVALID_STATUS_PENDING',
  ERROR_UNKNOWN_PAY: 'payment.ERROR_UNKNOWN_PAY',
  ALREADY_PAID: 'payment.ALREADY_PAID',
  PAY_SUCCESS: 'payment.PAY_SUCCESS',
  PAY_FAILED: 'payment.PAY_FAILED',
  PAY_CANCELLED: 'payment.PAY_CANCELLED'
} as const

export const NotificationMessage = {
  CREATE_SUCCESS: 'notification.CREATE_SUCCESS',
  UPDATE_SUCCESS: 'notification.UPDATE_SUCCESS',
  DELETE_SUCCESS: 'notification.DELETE_SUCCESS',
  GET_SUCCESS: 'notification.GET_SUCCESS',
  GET_LIST_SUCCESS: 'notification.GET_LIST_SUCCESS',
  NOT_FOUND: 'notification.NOT_FOUND',
  ALREADY_EXISTS: 'notification.ALREADY_EXISTS',
  INVALID_DATA: 'notification.INVALID_DATA',
  // title
  NOTI_ACHIEVEMENT: 'notification.NOTI_ACHIEVEMENT',
  NOTI_DAILY_REQUEST: 'notification.NOTI_DAILY_REQUEST',
  NOTI_LEVEL_UP: 'notification.NOTI_LEVEL_UP',
  NOTI_LESSON: 'notification.NOTI_LESSON',
  NOTI_EXCERCISE: 'notification.NOTI_EXERCISE',
  NOTI_REWARD: 'notification.NOTI_REWARD',
  NOTI_SYSTEM: 'notification.NOTI_SYSTEM',
  NOTI_OTHER: 'notification.NOTI_OTHER',
  NOTI_ATTENDANCE: 'notification.NOTI_ATTENDANCE',

  //body
  YOU_HAVE_NEW_ACHIEVEMENT: 'notification.YOU_HAVE_NEW_ACHIEVEMENT',
  YOU_HAVE_COMPLETED_ATTENDENCED: 'notification.YOU_HAVE_COMPLETED_ATTENDENCED',
  YOU_HAVE_LEVELED_UP: 'notification.YOU_HAVE_LEVELED_UP',
  YOU_HAVE_NEW_DAILY_REQUEST: 'notification.YOU_HAVE_NEW_DAILY_REQUEST',
  YOU_HAVE_COMPLETED_LESSON: 'notification.YOU_HAVE_COMPLETED_LESSON',
  YOU_HAVE_COMPLETED_EXCERCISE: 'notification.YOU_HAVE_COMPLETED_EXCERCISE',
  YOU_HAVE_NEW_REWARD: 'notification.YOU_HAVE_NEW_REWARD',
  YOU_HAVE_COMPLETED_ATTENDANCE: 'notification.YOU_HAVE_COMPLETED_ATTENDANCE'
} as const

export const SendMailMessage = {
  REGISTER_SUBSCRIPTION_SUCCESS: 'send_mail.REGISTER_SUBSCRIPTION_SUCCESS'
} as const

export const MatchingSocketMessage = {
  DO_NOT_HAVE_OPONENT: 'matching_socket.DO_NOT_HAVE_OPONENT',
  MATCH_FOUND: 'matching_socket.MATCH_FOUND',
  ERROR_UNKNOW: 'matching_socket.ERROR_UNKNOW',
  TIMOUT_SELECTED_POKEMON: 'matching_socket.TIMOUT_SELECTED_POKEMON',
  HAVE_PLAYER_CANCELLED: 'matching_socket.HAVE_PLAYER_CANCELLED',
  MATCH_READY_START: 'matching_socket.MATCH_READY_START',
  ALL_ACCEPT_MATCH: 'matching_socket.ALL_ACCEPT_MATCH',
  OPPONENT_COMMPLETED_ANSWER: 'matching_socket.OPPONENT_COMMIT_ANSWER',
  WAITING_OPPONENT_COMMPLETED_ANSWER: 'matching_socket.WAITING_OPPONENT_COMMIT_ANSWER',
  ROUND: 'matching_socket.ROUND',
  WILL_START_IN: 'matching_socket.WILL_START_IN',
  SECONDS: 'matching_socket.SECONDS',
  MATCH_COMPLETED_WITH_WINNER: 'matching_socket.MATCH_COMPLETED_WITH_WINNER'
} as const
