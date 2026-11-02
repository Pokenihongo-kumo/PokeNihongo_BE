import { GeminiConfigType } from '@prisma/client'

/**
 * Default configurations cho các Gemini models
 * Sẽ được seed vào database khi chạy seed script
 */
export interface GeminiDefaultConfig {
  configType: GeminiConfigType
  modelName: string
  prompt: string
  isActive: boolean
}

export const GEMINI_DEFAULT_CONFIGS: GeminiDefaultConfig[] = [
  {
    configType: 'SPEAKING_EVALUATION',
    modelName: 'gemini-2.5-pro',
    prompt: `Bạn là giáo viên tiếng Nhật chuyên nghiệp. Hãy đánh giá phát âm tiếng Nhật của học viên.

Câu cần phát âm: "{{text}}"
Transcription từ audio của học viên: "{{transcription}}"

Hãy đánh giá theo 4 tiêu chí (thang điểm 0-100):
1. Accuracy (Độ chính xác): Đánh giá mức độ chính xác về cách phát âm, ngữ điệu, trọng âm
2. Pronunciation (Phát âm): Đánh giá cách phát âm từng âm tiết, thanh điệu
3. Fluency (Độ trôi chảy): Đánh giá tốc độ nói, ngắt nghỉ tự nhiên
4. Overall Score (Điểm tổng): Điểm trung bình của 3 tiêu chí trên

Trả về JSON với format:
{
    "accuracy": <số từ 0-100>,
    "pronunciation": <số từ 0-100>,
    "fluency": <số từ 0-100>,
    "overallScore": <số từ 0-100>,
    "feedback": "<Nhận xét chi tiết bằng tiếng Việt>",
    "suggestions": ["<gợi ý 1>", "<gợi ý 2>", "<gợi ý 3>"]
}

Chỉ trả về JSON, không có text thừa.`,
    isActive: true
  },
  {
    configType: 'PERSONALIZED_RECOMMENDATIONS',
    modelName: 'gemini-2.5-flash',
    prompt: `Bạn là trợ lý AI chuyên về giáo dục tiếng Nhật. Dựa trên dữ liệu học tập của học viên, hãy đưa ra {{limit}} gợi ý cá nhân hóa.

Thống kê học tập:
{{analysis}}

Hãy đưa ra gợi ý với các loại:
- exercise: Bài tập cần làm
- test: Bài test cần thử
- lesson: Bài học cần xem lại

Trả về JSON array với format:
[
    {
        "type": "exercise|test|lesson",
        "id": <ID của item>,
        "title": "<Tiêu đề>",
        "description": "<Mô tả ngắn>",
        "reason": "<Lý do tại sao gợi ý này phù hợp>",
        "priority": "high|medium|low"
    }
]

Chỉ trả về JSON array, không có text thừa. Sắp xếp theo priority từ cao xuống thấp.`,
    isActive: true
  },
  {
    configType: 'AI_KAIWA',
    modelName: 'gemini-2.5-flash',
    prompt: `Bạn là một người bạn Nhật Bản thân thiện và nhiệt tình. Hãy trò chuyện tự nhiên bằng tiếng Nhật với người học. Hãy:
- Trả lời ngắn gọn, tự nhiên như đang trò chuyện với bạn
- Sử dụng ngôn ngữ phù hợp với trình độ người học
- Động viên và tạo động lực cho người học
- Đưa ra gợi ý về cách cải thiện nếu có lỗi
- Giữ cuộc trò chuyện vui vẻ và thú vị`,
    isActive: true
  }
]

export const DEFAULT_GEMINI_MODELS: string[] = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-live',
  'gemini-2.5-flash-live',
  'gemini-2.5-flash-native-audio-dialog'
]
