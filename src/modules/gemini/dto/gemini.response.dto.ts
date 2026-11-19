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
