export type GeminiPreset = {
  key: string
  name: string
  description: string
  config: {
    temperature?: number
    topP?: number
    topK?: number
  }
}

export const GEMINI_PRESETS: GeminiPreset[] = [
  {
    key: 'DETERMINISTIC',
    name: '1. Nhất quán (Testing)',
    description:
      'Chỉ dùng cho testing/debug. Đảm bảo AI luôn trả về 1 câu trả lời duy nhất.',
    config: { temperature: 0.0, topK: 1 }
  },
  {
    key: 'STRICT',
    name: '2. Nghiêm ngặt (Strict)',
    description:
      'An toàn tuyệt đối. Dùng cho việc trích xuất dữ liệu, phân loại khi không được phép có bất kỳ sự suy diễn nào.',
    config: { temperature: 0.1, topP: 0.8 }
  },
  {
    key: 'CONCISE',
    name: '3. Ngắn gọn (Concise)',
    description:
      'Tập trung, ngắn gọn. Dùng để tạo tiêu đề, tóm tắt văn bản (summary) một cách an toàn, bám sát nội dung gốc.',
    config: { temperature: 0.2, topP: 0.85 }
  },
  {
    key: 'CAUTIOUS',
    name: '4. Thận trọng (Cautious)',
    description:
      'Logic, ít mạo hiểm. Dùng cho các trợ lý Q&A dựa trên dữ liệu (RAG) nhưng cần tự nhiên hơn một chút.',
    config: { temperature: 0.4, topP: 0.9 }
  },
  {
    key: 'BALANCED',
    name: '5. Cân bằng (Balanced)',
    description:
      '(Mặc định) Tốt cho 90% các tác vụ. Vừa đủ logic, vừa đủ tự nhiên. Dùng cho tóm tắt, trợ lý chung.',
    config: { temperature: 0.6, topP: 0.95 }
  },
  {
    key: 'CONVERSATIONAL',
    name: '6. Hội thoại (Conversational)',
    description:
      'Thân thiện, tự nhiên. Lựa chọn tốt nhất cho hội thoại (Kaiwa) và chatbot, nơi cần câu trả lời nghe giống người thật.',
    config: { temperature: 0.7, topP: 0.95 }
  },
  {
    key: 'CREATIVE',
    name: '7. Sáng tạo (Creative)',
    description:
      'Đa dạng ý tưởng. Dùng cho brainstorm, viết email marketing, soạn thảo nội dung, tạo ra các câu trả lời thú vị.',
    config: { temperature: 0.8, topP: 0.95 }
  },
  {
    key: 'INVENTIVE',
    name: '8. Phát minh (Inventive)',
    description:
      'Sáng tạo cao. Dùng để tạo ra các ý tưởng mới, viết kịch bản, làm thơ. Câu trả lời sẽ rất khác biệt sau mỗi lần gọi.',
    config: { temperature: 0.9, topP: 0.95 }
  },
  {
    key: 'EXPERIMENTAL',
    name: '9. Mạo hiểm (Experimental)',
    description:
      'Ngẫu nhiên có kiểm soát. Vẫn lọc bỏ các từ "rác" (nhờ topP: 0.95), nhưng cho phép sáng tạo tối đa.',
    config: { temperature: 1.0, topP: 0.95 }
  },
  {
    key: 'MAXIMUM',
    name: '10. Tối đa (Maximum)',
    description:
      'Ngẫu nhiên tối đa. Không có bộ lọc topP. Dùng cho các mục đích nghệ thuật, trừu tượng.',
    config: { temperature: 1.0, topP: 1.0 }
  }
]

export function getPresetByKey(key: string) {
  return GEMINI_PRESETS.find((p) => p.key === key)
}
