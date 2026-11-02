/**
 * Constants for AI prompts used in WebSocket gateways
 */

/**
 * Room title generation prompts by language
 */
export const ROOM_TITLE_PROMPTS = {
  en: `You are a Title Generation AI. Your task is to create a short, concise title (max 50 characters) in English for the following Japanese conversation.
    
    IMPORTANT:
    - Respond with ONLY the title text.
    - DO NOT use markdown (\`**\`), quotation marks, or any other formatting or explanation.
        
    Example 1: Self-introduction
    Example 2: Talking about hobbies
    Example 3: Ordering at a restaurant
        
    ---
    CONVERSATION:
    `,
  ja: `あなたはタイトル生成AIです。以下の日本語の会話に対して、日本語で簡潔なタイトル（最大50文字）を作成してください。
重要:
    - 回答はタイトルのテキストのみにしてください。
    - マークダウン（\`**\`）や引用符（\`""\`）、その他の説明やフォーマットは一切含めないでください。
        
    例1: 自己紹介
    例2: 天気について
    例3: 趣味の話
        
    ---
    会話内容:`,
  vi: `Bạn là AI chuyên tạo tiêu đề. Nhiệm vụ của bạn là tạo một tiêu đề ngắn (tối đa 50 ký tự) bằng Tiếng Việt cho cuộc hội thoại Tiếng Nhật dưới đây.

    QUAN TRỌNG:
    - Chỉ trả lời bằng nội dung tiêu đề.
    - KHÔNG dùng markdown (\`**\`), dấu ngoặc kép, hay bất kỳ lời giải thích nào.
    
    Ví dụ 1: Giới thiệu bản thân
    Ví dụ 2: Hỏi về thời tiết
    Ví dụ 3: Đặt lịch hẹn
    
    ---
    CUỘC HỘI THOẠI:
    `
} as const

/**
 * Room title generation labels by language
 */
export const ROOM_TITLE_LABELS = {
  en: {
    userLabel: 'Learner',
    aiLabel: 'AI'
  },
  ja: {
    userLabel: '学習者',
    aiLabel: 'AI'
  },
  vi: {
    userLabel: 'Người học',
    aiLabel: 'AI'
  }
} as const

/**
 * Get room title prompt for a specific language
 * @param language - Language code ('en', 'ja', 'vi')
 * @returns Prompt string for the language, default to Vietnamese if language not found
 */
export function getRoomTitlePrompt(language: string): string {
  const lang = language.toLowerCase() as keyof typeof ROOM_TITLE_PROMPTS
  return ROOM_TITLE_PROMPTS[lang] || ROOM_TITLE_PROMPTS.vi
}

/**
 * Get room title labels for a specific language
 * @param language - Language code ('en', 'ja', 'vi')
 * @returns Labels object with userLabel and aiLabel, default to Vietnamese if language not found
 */
export function getRoomTitleLabels(language: string): {
  userLabel: string
  aiLabel: string
} {
  const lang = language.toLowerCase() as keyof typeof ROOM_TITLE_LABELS
  return ROOM_TITLE_LABELS[lang] || ROOM_TITLE_LABELS.vi
}

/**
 * Default generation config for different AI tasks
 * These values are used when no config is found in the database
 */
export const DEFAULT_GENERATION_CONFIG = {
  /**
   * Room Title Generation - Conservative settings for short, concise titles
   */
  ROOM_TITLE: {
    temperature: 0.3,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 1000
  },
  /**
   * AI Kaiwa Conversation - Balanced settings for natural conversation
   * maxOutputTokens: 8192 để đảm bảo response đầy đủ, không bị cắt
   */
  AI_KAIWA: {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192
  },
  /**
   * Translation - Conservative settings for accurate translations
   * maxOutputTokens: 1024 để đảm bảo đủ cho các câu dài và đoạn văn bản phức tạp
   */
  TRANSLATION: {
    temperature: 0.3,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 1024
  }
} as const

/**
 * Get default generation config for a specific AI task
 * @param taskType - Type of AI task ('ROOM_TITLE' | 'AI_KAIWA' | 'TRANSLATION')
 * @returns Default generation config object
 */
export function getDefaultGenerationConfig(
  taskType: 'ROOM_TITLE' | 'AI_KAIWA' | 'TRANSLATION'
) {
  return DEFAULT_GENERATION_CONFIG[taskType]
}

/**
 * JLPT Level Instructions for AI conversation adjustment
 * These instructions are used to adjust the AI's language level based on user's JLPT level
 */
export const JLPT_LEVEL_INSTRUCTIONS = {
  /**
   * N5 - Cơ bản nhất
   */
  5: `QUAN TRỌNG: Người học đang ở trình độ N5 (cơ bản nhất). 
- Chỉ sử dụng từ vựng và ngữ pháp N5
- Dùng câu ngắn, đơn giản
- Tránh kanji phức tạp, ưu tiên hiragana/katakana
- Tốc độ nói chậm và rõ ràng
- Giải thích đơn giản nếu cần`,
  /**
   * N4 - Sơ cấp
   */
  4: `QUAN TRỌNG: Người học đang ở trình độ N4 (sơ cấp). 
- Sử dụng từ vựng và ngữ pháp N5-N4
- Dùng câu đơn giản, dễ hiểu
- Tránh kanji quá phức tạp
- Tốc độ nói vừa phải, rõ ràng
- Có thể giải thích ngắn gọn nếu cần`,
  /**
   * N3 - Trung cấp
   */
  3: `QUAN TRỌNG: Người học đang ở trình độ N3 (trung cấp). 
- Sử dụng từ vựng và ngữ pháp N5-N3
- Dùng câu tự nhiên hơn, có thể phức tạp hơn một chút
- Có thể sử dụng kanji phổ biến
- Tốc độ nói tự nhiên, vừa phải
- Có thể thêm một chút giải thích nếu cần`,
  /**
   * N2 - Trung cao cấp
   */
  2: `QUAN TRỌNG: Người học đang ở trình độ N2 (trung cao cấp). 
- Sử dụng từ vựng và ngữ pháp N5-N2
- Dùng câu tự nhiên, có thể phức tạp
- Sử dụng kanji phổ biến và một số kanji phức tạp hơn
- Tốc độ nói tự nhiên, gần như người bản xứ
- Có thể thảo luận các chủ đề phức tạp hơn`,
  /**
   * N1 - Cao cấp
   */
  1: `QUAN TRỌNG: Người học đang ở trình độ N1 (cao cấp). 
- Sử dụng từ vựng và ngữ pháp đầy đủ (N5-N1)
- Dùng câu tự nhiên, phức tạp, như người bản xứ
- Sử dụng kanji phức tạp và từ vựng cao cấp
- Tốc độ nói tự nhiên, như người bản xứ
- Có thể thảo luận các chủ đề phức tạp, trừu tượng`
} as const

/**
 * Default level instruction when user's JLPT level is not set or invalid
 */
export const DEFAULT_LEVEL_INSTRUCTION = `QUAN TRỌNG: Hãy điều chỉnh ngôn ngữ của bạn để phù hợp với trình độ trung cấp (khoảng N4-N3). Sử dụng từ vựng và ngữ pháp phù hợp với trình độ này.`

/**
 * Get JLPT level instruction for a specific level
 * @param levelJLPT - JLPT level (1-5, or null/undefined)
 * @returns Level instruction string, or default instruction if level is invalid
 */
export function getJLPTLevelInstruction(levelJLPT: number | null | undefined): string {
  if (!levelJLPT || levelJLPT < 1 || levelJLPT > 5) {
    return DEFAULT_LEVEL_INSTRUCTION
  }
  return (
    JLPT_LEVEL_INSTRUCTIONS[levelJLPT as keyof typeof JLPT_LEVEL_INSTRUCTIONS] ||
    DEFAULT_LEVEL_INSTRUCTION
  )
}

/**
 * Default system prompt for AI Kaiwa conversation
 * Used when no custom prompt is configured in the database
 */
export const DEFAULT_KAIWA_SYSTEM_PROMPT = `Bạn là một giáo viên tiếng Nhật thân thiện. QUAN TRỌNG: Bạn CHỈ được trả lời bằng tiếng Nhật, KHÔNG được dùng tiếng Việt hay bất kỳ ngôn ngữ nào khác. Hãy trả lời bằng tiếng Nhật một cách tự nhiên và dễ hiểu. Hãy giúp người học luyện tập hội thoại tiếng Nhật.`

/**
 * Build system prompt with JLPT level adjustment
 * @param basePrompt - Base system prompt from config or default
 * @param levelJLPT - User's JLPT level (1-5, or null/undefined)
 * @returns System prompt with level adjustment instructions
 */
export function buildSystemPromptWithLevel(
  basePrompt: string,
  levelJLPT: number | null | undefined
): string {
  const levelInstruction = getJLPTLevelInstruction(levelJLPT)
  return `${basePrompt}

${levelInstruction}`
}
