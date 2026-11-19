// Common sort order enum - can be used across all modules
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

// Vocabulary specific sort fields
export enum VocabularySortField {
  ID = 'id',
  LEVEL_N = 'levelN',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt'
}

// Kanji specific sort fields
export enum KanjiSortField {
  ID = 'id',
  CHARACTER = 'character',
  MEANING_KEY = 'meaningKey',
  STROKE_COUNT = 'strokeCount',
  JLPT_LEVEL = 'jlptLevel',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt'
}

// Lesson specific sort fields
export enum LessonSortField {
  ID = 'id',
  SLUG = 'slug',
  TITLE_KEY = 'titleKey',
  LEVEL_JLPT = 'levelJlpt',
  ESTIMATED_TIME_MINUTES = 'estimatedTimeMinutes',
  LESSON_ORDER = 'lessonOrder',
  IS_PUBLISHED = 'isPublished',
  PUBLISHED_AT = 'publishedAt',
  VERSION = 'version',
  LESSON_CATEGORY_ID = 'lessonCategoryId',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt'
}

// Grammar specific sort fields
export enum GrammarSortField {
  ID = 'id',
  STRUCTURE = 'structure',
  LEVEL = 'level',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt'
}

// Question specific sort fields
export enum QuestionSortField {
  ID = 'id',
  QUESTION_JP = 'questionJp',
  QUESTION_ORDER = 'questionOrder',
  QUESTION_KEY = 'questionKey',
  EXERCISES_ID = 'exercisesId',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt'
}

// Answer specific sort fields
export enum AnswerSortField {
  ID = 'id',
  ANSWER_JP = 'answerJp',
  ANSWER_KEY = 'answerKey',
  IS_CORRECT = 'isCorrect',
  QUESTION_ID = 'questionId',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt'
}

// Exercises specific sort fields
export enum ExercisesSortField {
  ID = 'id',
  EXERCISE_TYPE = 'exerciseType',
  IS_BLOCKED = 'isBlocked',
  PRICE = 'price',
  LESSON_ID = 'lessonId',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt'
}

// Translation specific sort fields
export enum TranslationSortField {
  ID = 'id',
  LANGUAGE_ID = 'languageId',
  KEY = 'key',
  VALUE = 'value',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt'
}

// Grammar Usage specific sort fields
export enum GrammarUsageSortField {
  ID = 'id',
  GRAMMAR_ID = 'grammarId',
  EXAMPLE_SENTENCE_JP = 'exampleSentenceJp',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt'
}

// Kanji Reading specific sort fields
export enum KanjiReadingSortField {
  ID = 'id',
  KANJI_ID = 'kanjiId',
  READING_TYPE = 'readingType',
  READING = 'reading',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt'
}

// Lesson Content specific sort fields
export enum LessonContentSortField {
  ID = 'id',
  LESSON_ID = 'lessonId',
  CONTENT_TYPE = 'contentType',
  CONTENT_ORDER = 'contentOrder',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt'
}

// Keep VocabularySortOrder for backward compatibility
export enum VocabularySortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

// QuestionType enum
export enum QuestionType {
  VOCABULARY = 'VOCABULARY', // Từ vựng
  GRAMMAR = 'GRAMMAR', // Ngữ pháp
  KANJI = 'KANJI', // Kanji
  LISTENING = 'LISTENING', // Nghe hiểu
  READING = 'READING', // Đọc hiểu
  WRITING = 'WRITING', // Viết
  SPEAKING = 'SPEAKING', // Nói
  CONVERSATION = 'CONVERSATION', // Hội thoại
  GENERAL = 'GENERAL' // Tổng hợp
}

// QuestionBankStatus enum
export enum QuestionBankStatusEnum {
  DRAFT = 'DRAFT', // Bản nháp
  ACTIVE = 'ACTIVE', // Đang hoạt động
  INACTIVE = 'INACTIVE' // Không hoạt động
}
