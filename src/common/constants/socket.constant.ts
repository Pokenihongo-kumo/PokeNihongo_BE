// ========== MATCHING SOCKET TYPES ==========
export interface MatchFoundPayload {
  type: 'MATCH_FOUND'
  matchId: number
  match: {
    id: number
    status: string
    createdAt: Date
    endTime?: Date
    timeLimitMs?: number
  }
  opponent: {
    id: number
    name: string
    avatar: string | null
  }
  participant: {
    id: number
    hasAccepted: boolean
    userId: number
    matchId: number
  }
}

export interface MatchmakingFailedPayload {
  type: 'MATCHMAKING_FAILED'
  reason: string
}

export interface MatchStatusUpdatePayload {
  type: 'MATCH_STATUS_UPDATE'
  matchId: number
  status: string
  message?: string
}

export interface PokemonSelectedPayload {
  type: 'POKEMON_SELECTED'
  matchRoundId: number
  matchRound: any
  participant: any
  opponent: any
}

export type MatchingEventPayload =
  | MatchFoundPayload
  | MatchmakingFailedPayload
  | MatchStatusUpdatePayload
  | PokemonSelectedPayload

// ========== SOCKET EVENTS ==========
export const MATCHING_EVENTS = {
  // Server -> Client events
  MATCHING_EVENT: 'matching-event',
  SELECT_POKEMON: 'select-pokemon',
  POKEMON_SELECTION_EXPIRED: 'pokemon-selection-expired',
  ROUND_STARTED: 'round-started',
  ROUND_STARTING: 'round-starting',
  ROUND_POKES_SELECTED: 'round-pokes-selected',
  QUESTION_COMPLETED: 'question-completed',
  OPPONENT_COMPLETED: 'opponent-completed',
  WAITING_FOR_OPPONENT: 'waiting-for-opponent',
  QUESTION_ANSWERED: 'question-answered',
  ROUND_COMPLETED: 'round-completed',
  MATCH_COMPLETED: 'match-completed',
  // Client -> Server events
  JOIN_MATCHING_ROOM: 'join-matching-room',
  LEAVE_MATCHING_ROOM: 'leave-matching-room',
  JOIN_USER_MATCH_ROOM: 'join-user-match-room',
  JOIN_SEARCHING_ROOM: 'join-searching-room',
  LEAVE_SEARCHING_ROOM: 'leave-searching-room',
  JOIN_USER_ROOM: 'join-user-room',
  LEAVE_USER_ROOM: 'leave-user-room'
  // Add more events as needed
} as const

export const KAIWA_EVENTS = {
  // Server -> Client events
  USER_AUDIO_CHUNK: 'user-audio-chunk',
  TRANSCRIPTION: 'transcription',
  PROCESSING: 'processing',
  TEXT_RESPONSE: 'text-response',
  TEXT_RESPONSE_UPDATE: 'text-response-update',
  AUDIO_RESPONSE: 'audio-response',
  HISTORY: 'history',
  JOINED: 'joined',
  LEFT: 'left',
  ERROR: 'error',
  ROOM_UPDATED: 'room-updated', // Emit khi room được tạo/cập nhật
  MESSAGE_AUDIO_UPDATED: 'message-audio-updated', // Emit khi audioUrl được update cho message
  // Client -> Server events
  JOIN_KAIWA_ROOM: 'join-kaiwa-room',
  LEAVE_KAIWA_ROOM: 'leave-kaiwa-room'
  // Add more events as needed
} as const

// ========== SOCKET ROOMS ==========
export const SOCKET_ROOM = {
  /**
   * Get matching room name for a user (individual matchmaking queue)
   * Pattern: matching_{userId}
   */
  getMatchingRoomByUserId: (userId: number): string => `searching_${userId}`,

  /**
   * Get match room name - shared by both users in the match (used for Pokemon selection)
   * Pattern: matching_{matchId}
   * Note: Uses "matching_" prefix for consistency with matchmaking flow
   */
  getMatchRoom: (matchId: number): string => `matching_${matchId}`,

  /**
   * Get match round room name - shared by both users in the match round
   * Pattern: match_round_{matchRoundId}
   */
  getMatchRoundRoom: (matchRoundId: number): string => `match_round_${matchRoundId}`,

  /**
   * Get user room name (legacy pattern)
   * Pattern: user:{userId}
   */
  getUserRoom: (userId: number): string => `user_${userId}`,

  /**
   * Get kaiwa room name
   * Pattern: kaiwa_{conversationId}
   */
  getKaiwaRoom: (conversationId: string): string => `kaiwa_${conversationId}`
} as const
