import { ExercisesMessage as M } from '@/i18n/message-keys'
import { LanguagesService } from '@/modules/languages/languages.service'
import { TranslationService } from '@/modules/translation/translation.service'
import { toPaginationMeta } from '@/shared/utils/pagination'
import {
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/utils/prisma-errors'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import {
  ExerciseRuleViolationException,
  ExerciseTypePerLessonExistsException,
  ExercisesNotFoundException,
  InvalidExercisesDataException,
  LessonNotFoundException,
  RewardNotFoundException,
  TestSetAlreadyHasExerciseException,
  TestSetNotFoundException
} from './dto/exercises.error'
import {
  CreateExercisesBody,
  GetExercisesListQuery,
  UpdateExercisesBody
} from './dto/exercises.zod-dto'
import { Exercises } from './entities/exercises.entity'
import { ExercisesRepo } from './exercises.repo'

// A lesson has at most one exercise of each type: VOCABULARY, GRAMMAR, KANJI
const MAX_EXERCISES_PER_LESSON = 3

@Injectable()
export class ExercisesService {
  private readonly logger = new Logger(ExercisesService.name)

  constructor(
    private readonly exercisesRepo: ExercisesRepo,
    private readonly languagesService: LanguagesService,
    private readonly translationService: TranslationService
  ) {}

  async create(data: CreateExercisesBody) {
    try {
      await this.assertRules(data)
      const exercise = await this.exercisesRepo.create({
        ...data,
        rewardId: await this.checkedRewardIds(data.rewardId)
      })
      return exercise
    } catch (error) {
      throw this.toExercisesError(error)
    }
  }

  async update(id: number, data: UpdateExercisesBody) {
    try {
      const current = await this.exercisesRepo.findById(id)
      if (!current) throw new ExercisesNotFoundException()
      // Moving to another lesson/test set or changing the type: same rules as create
      if (data.lessonId || data.testSetId || data.exerciseType) {
        await this.assertRules(
          {
            lessonId: data.lessonId ?? current.lessonId,
            testSetId: data.testSetId ?? current.testSetId,
            exerciseType:
              data.exerciseType ?? (current.exerciseType as Exercises['exerciseType'])
          },
          id
        )
      }
      const exercise = await this.exercisesRepo.update(id, {
        ...data,
        ...(data.rewardId && { rewardId: await this.checkedRewardIds(data.rewardId) })
      })
      return exercise
    } catch (error) {
      throw this.toExercisesError(error)
    }
  }

  async delete(id: number) {
    try {
      await this.exercisesRepo.delete(id)
      return
    } catch (error) {
      throw this.toExercisesError(error)
    }
  }

  // Used by user-exercise-attempt: the exercise's own fields
  async findById(id: number): Promise<Exercises> {
    const exercise = await this.exercisesRepo.findById(id)
    if (!exercise) throw new ExercisesNotFoundException()
    return {
      id: exercise.id,
      createdAt: exercise.createdAt,
      updatedAt: exercise.updatedAt,
      lessonId: exercise.lessonId,
      exerciseType: exercise.exerciseType as Exercises['exerciseType'],
      isBlocked: exercise.isBlocked,
      testSetId: exercise.testSetId ?? null,
      rewardId: exercise.rewardId ?? []
    }
  }

  // Used by lesson-content and user-exercise-attempt
  async findByLessonId(lessonId: number): Promise<Exercises[]> {
    const exercises = await this.exercisesRepo.findByLessonId(lessonId)
    return exercises.map((e) => ({
      ...e,
      exerciseType: e.exerciseType as Exercises['exerciseType'],
      testSetId: e.testSetId ?? null,
      rewardId: e.rewardId ?? []
    }))
  }

  async getExercisesList(query: GetExercisesListQuery) {
    const { items, total } = await this.exercisesRepo.findMany(query)
    return {
      results: items,
      pagination: toPaginationMeta(query.currentPage, query.pageSize, total)
    }
  }

  // With the test set's questions and their answers
  async getExercisesById(id: number) {
    const exercise = await this.exercisesRepo.findById(id)
    if (!exercise) throw new ExercisesNotFoundException()
    return exercise
  }

  // Also used by user-exercise-attempt (reads data.testSet)
  async getExercisesByIdHaveQuestionBanks(id: number) {
    const exercise = await this.exercisesRepo.findByIdHaveQuestionBank(id)
    if (!exercise) throw new ExercisesNotFoundException()
    return exercise
  }

  // Each exercise with its rewards, plus the lesson's rewards (names in `lang`)
  async getExercisesByLessonId(lessonId: number, lang: string = 'vi') {
    const lessonRewardIds = await this.exercisesRepo.getLessonRewardIds(lessonId)
    if (!lessonRewardIds) throw new LessonNotFoundException()
    const exercises = await this.exercisesRepo.findByLessonId(lessonId)
    const rewards = await this.rewardSummaries(
      [...exercises.flatMap((e) => e.rewardId), ...lessonRewardIds],
      lang
    )
    const rewardsOf = (ids: number[]) => ids.flatMap((id) => rewards.get(id) ?? [])
    const rewardLesson = rewardsOf(lessonRewardIds)
    return exercises.map((e) => ({
      ...e,
      rewards: rewardsOf(e.rewardId),
      rewardLesson
    }))
  }

  //#region helpers
  // The lesson and test set exist; their levels match; the lesson has room and
  // no exercise of this type; the test set is of the exercise's type
  private async assertRules(
    target: {
      lessonId: number
      testSetId?: number | null
      exerciseType: Exercises['exerciseType']
    },
    exceptId?: number
  ) {
    const { lesson, testSet, otherTypes } = await this.exercisesRepo.ruleContext(
      target.lessonId,
      target.testSetId,
      exceptId
    )
    if (!lesson) throw new LessonNotFoundException()
    if (target.testSetId && !testSet) throw new TestSetNotFoundException()

    // 0 counts as no level
    const lessonLevel = lesson.levelJlpt || null
    const testSetLevel = testSet?.levelN || null
    if (lessonLevel && testSetLevel && lessonLevel !== testSetLevel) {
      throw new ExerciseRuleViolationException(M.LEVEL_INCOMPATIBLE, {
        lessonLevel,
        testSetLevel
      })
    }
    if (otherTypes.length >= MAX_EXERCISES_PER_LESSON) {
      throw new ExerciseRuleViolationException(M.LIMIT_PER_LESSON)
    }
    if (otherTypes.includes(target.exerciseType)) {
      throw new ExerciseTypePerLessonExistsException()
    }
    if (testSet?.testType && String(testSet.testType) !== String(target.exerciseType)) {
      throw new ExerciseRuleViolationException(M.TEST_SET_TYPE_MISMATCH)
    }
  }

  // Each reward must exist; repeats are dropped
  private async checkedRewardIds(rewardIds: number[] = []) {
    const unique = [...new Set(rewardIds)]
    if (
      unique.length > 0 &&
      (await this.exercisesRepo.countRewards(unique)) !== unique.length
    ) {
      throw new RewardNotFoundException()
    }
    return unique
  }

  // Reward id -> summary, its name translated (falls back to vi, then the key)
  private async rewardSummaries(rewardIds: number[], lang: string) {
    const records = await this.exercisesRepo.getRewardsByIds(rewardIds)
    const languageId =
      (await this.languagesService.getIdByCode(lang)) ??
      (lang !== 'vi' ? await this.languagesService.getIdByCode('vi') : null)
    const keys = [...new Set(records.map((r) => r.nameKey))]
    const names = new Map<string, string>()
    if (languageId && keys.length > 0) {
      for (const t of await this.translationService.findByKeysAndLanguage(
        keys,
        languageId
      )) {
        names.set(t.key, t.value)
      }
    }
    return new Map(
      records.map((r) => [
        r.id,
        {
          id: r.id,
          name: names.get(r.nameKey) ?? r.nameKey,
          rewardType: r.rewardType,
          rewardItem: r.rewardItem,
          rewardTarget: r.rewardTarget
        }
      ])
    )
  }

  private toExercisesError(error: unknown): HttpException {
    if (error instanceof HttpException) return error
    this.logger.error(
      'Exercises request failed',
      error instanceof Error ? error.stack : error
    )
    // testSetId is unique: the test set already belongs to another exercise
    if (isUniqueConstraintPrismaError(error))
      return new TestSetAlreadyHasExerciseException()
    if (isNotFoundPrismaError(error)) return new ExercisesNotFoundException()
    return new InvalidExercisesDataException()
  }
  //#endregion

  // ---- For other modules (module-boundary plan B8) ----
  // Same arguments and results as the repo methods.

  getLessonLevelJlpt(...args: Parameters<ExercisesRepo['getLessonLevelJlpt']>) {
    return this.exercisesRepo.getLessonLevelJlpt(...args)
  }
}
