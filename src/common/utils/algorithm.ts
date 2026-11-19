/**
 * Tính điểm số dựa trên số câu đúng và tổng số câu
 * @param answeredCorrect - Số câu trả lời đúng
 * @param totalQuestions - Tổng số câu hỏi
 * @returns Điểm số từ 0-100 (làm tròn)
 */
export function calculateScore(answeredCorrect: number, totalQuestions: number): number {
  if (totalQuestions <= 0) {
    return 0
  }
  return Math.round((answeredCorrect / totalQuestions) * 100)
}
