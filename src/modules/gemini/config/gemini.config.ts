import { registerAs } from '@nestjs/config'

export default registerAs('gemini', () => ({
  // Option 1: API Key (simple) - cho Pro models
  apiKey: process.env.GEMINI_API_KEY || '',

  // Option 1b: Flash API Key (riêng cho Flash models)
  flashApiKey: process.env.GEMINI_FLASH_API_KEY || '',

  // Option 2: Google Cloud Service Account (shared with Speech service)
  // Ưu tiên dùng service account nếu có (cùng credentials với Speech)
  useServiceAccount: !!(
    process.env.GOOGLE_CLOUD_CLIENT_EMAIL &&
    process.env.GOOGLE_CLOUD_PRIVATE_KEY &&
    process.env.GOOGLE_CLOUD_PROJECT_ID
  ),
  serviceAccount: {
    clientEmail: process.env.GOOGLE_CLOUD_CLIENT_EMAIL || '',
    privateKey: process.env.GOOGLE_CLOUD_PRIVATE_KEY || '',
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || ''
  },

  generationConfig: {
    temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
    topP: parseFloat(process.env.GEMINI_TOP_P || '0.95'),
    topK: parseInt(process.env.GEMINI_TOP_K || '40', 10),
    // Default 8192 để đảm bảo response đầy đủ cho AI_KAIWA (có thể override bằng env)
    maxOutputTokens: parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS || '8192', 10)
  },
  safetySettings: [
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    }
  ]
}))
