export interface SpeakingEvaluationResponse {
  accuracy: number // Độ chính xác (0-100)
  pronunciation: number // Điểm phát âm (0-100)
  fluency: number // Điểm độ trôi chảy (0-100)
  overallScore: number // Điểm tổng (0-100)
  feedback: string // Nhận xét chi tiết
  suggestions: string[] // Gợi ý cải thiện
}

export interface PersonalizedRecommendation {
  type: 'exercise' | 'test' | 'lesson'
  id: number
  title: string
  description: string
  reason: string // Lý do tại sao gợi ý này phù hợp
  priority: 'high' | 'medium' | 'low'
}

export interface PersonalizedRecommendationsResponse {
  recommendations: PersonalizedRecommendation[]
  summary: {
    totalExerciseAttempts: number
    totalTestAttempts: number
    averageScore: number
    weakAreas: string[]
    strongAreas: string[]
  }
}

export interface AIKaiwaResponse {
  conversationId: string
  message: string // Response từ AI (text)
  audioUrl?: string // URL audio nếu includeAudio = true
  pronunciationAssessment?: {
    accuracy: number
    pronunciation: number
    fluency: number
    overallScore: number
    feedback: string
    suggestions: string[]
    confidence: number
  } // Đánh giá phát âm nếu có assessPronunciation = true
  transcription?: string // Transcription từ audio nếu có audioUrl
}

export interface ChatWithGeminiResponse {
  conversationId: string
  message: string // Response từ AI (text)
  modelUsed: string // Tên model đã sử dụng
}

export interface TestNativeAudioDialogResponse {
  conversationId: string
  message?: string // Response text từ AI (nếu có)
  audioResponse?: Buffer | string // Audio response từ AI (nếu có)
  rawResponse?: any // Raw response từ API để debug
}
