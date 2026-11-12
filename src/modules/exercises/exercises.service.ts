import { HttpException, Injectable, Logger } from '@nestjs/common'
import { ExercisesRepo } from './exercises.repo'
import {
  CreateExercisesBodyType,
  UpdateExercisesBodyType,
  GetExercisesListQueryType,
  ExercisesType
} from './entities/exercises.entity'
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
import { LanguagesRepo } from '@/modules/languages/languages.repo'
import { TranslationRepo } from '@/modules/translation/translation.repo'
import { I18nService } from '@/i18n/i18n.service'
import { ExercisesMessage as M } from '@/i18n/message-keys'
import { toPaginationMeta } from '@/shared/utils/pagination'
import {
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/utils/prisma-errors'

// A lesson has at most one exercise of each type: VOCABULARY, GRAMMAR, KANJI
const MAX_EXERCISES_PER_LESSON = 3

@Injectable()
export class ExercisesService {
  private readonly logger = new Logger(ExercisesService.name)

  constructor(
    private readonly exercisesRepo: ExercisesRepo,
    private readonly languagesRepo: LanguagesRepo,
    private readonly translationRepo: TranslationRepo,
    private readonly i18nService: I18nService
  ) {}

  async create(data: CreateExercisesBodyType, lang: string = 'vi') {
    try {
      await this.assertRules(data)
      const exercise = await this.exercisesRepo.create({
        ...data,
        rewardId: await this.checkedRewardIds(data.rewardId)
      })
      return {
        data: exercise,
        message: this.i18nService.translate(M.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toExercisesError(error)
    }
  }

  async update(id: number, data: UpdateExercisesBodyType, lang: string = 'vi') {
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
              data.exerciseType ?? (current.exerciseType as ExercisesType['exerciseType'])
          },
          id
        )
      }
      const exercise = await this.exercisesRepo.update(id, {
        ...data,
        ...(data.rewardId && { rewardId: await this.checkedRewardIds(data.rewardId) })
      })
      return {
        data: exercise,
        message: this.i18nService.translate(M.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toExercisesError(error)
    }
  }

  async delete(id: number, lang: string = 'vi') {
    try {
      await this.exercisesRepo.delete(id)
      return { message: this.i18nService.translate(M.DELETE_SUCCESS, lang) }
    } catch (error) {
      throw this.toExercisesError(error)
    }
  }

  // Used by user-exercise-attempt: the exercise's own fields
  async findById(id: number): Promise<ExercisesType> {
    const exercise = await this.exercisesRepo.findById(id)
    if (!exercise) throw new ExercisesNotFoundException()
    return {
      id: exercise.id,
      createdAt: exercise.createdAt,
      updatedAt: exercise.updatedAt,
      lessonId: exercise.lessonId,
      exerciseType: exercise.exerciseType as ExercisesType['exerciseType'],
      isBlocked: exercise.isBlocked,
      testSetId: exercise.testSetId ?? null,
      rewardId: exercise.rewardId ?? []
    }
  }

  // Used by lesson-content and user-exercise-attempt
  async findByLessonId(lessonId: number): Promise<ExercisesType[]> {
    const exercises = await this.exercisesRepo.findByLessonId(lessonId)
    return exercises.map((e) => ({
      ...e,
      exerciseType: e.exerciseType as ExercisesType['exerciseType'],
      testSetId: e.testSetId ?? null,
      rewardId: e.rewardId ?? []
    }))
  }

  async getExercisesList(query: GetExercisesListQueryType, lang: string = 'vi') {
    const { items, total } = await this.exercisesRepo.findMany(query)
    return {
      statusCode: 200,
      data: {
        results: items,
        pagination: toPaginationMeta(query.currentPage, query.pageSize, total)
      },
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang)
    }
  }

  // With the test set's questions and their answers
  async getExercisesById(id: number, lang: string = 'vi') {
    const exercise = await this.exercisesRepo.findById(id)
    if (!exercise) throw new ExercisesNotFoundException()
    return { data: exercise, message: this.i18nService.translate(M.GET_SUCCESS, lang) }
  }

  // Also used by user-exercise-attempt (reads data.testSet)
  async getExercisesByIdHaveQuestionBanks(id: number, lang: string = 'vi') {
    const exercise = await this.exercisesRepo.findByIdHaveQuestionBank(id)
    if (!exercise) throw new ExercisesNotFoundException()
    return {
      statusCode: 200,
      data: exercise,
      message: this.i18nService.translate(M.GET_SUCCESS, lang)
    }
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
    return {
      data: exercises.map((e) => ({
        ...e,
        rewards: rewardsOf(e.rewardId),
        rewardLesson
      })),
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang)
    }
  }

  //#region helpers
  // The lesson and test set exist; their levels match; the lesson has room and
  // no exercise of this type; the test set is of the exercise's type
  private async assertRules(
    target: {
      lessonId: number
      testSetId?: number | null
      exerciseType: ExercisesType['exerciseType']
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
      (await this.languagesRepo.getIdByCode(lang)) ??
      (lang !== 'vi' ? await this.languagesRepo.getIdByCode('vi') : null)
    const keys = [...new Set(records.map((r) => r.nameKey))]
    const names = new Map<string, string>()
    if (languageId && keys.length > 0) {
      for (const t of await this.translationRepo.findByKeysAndLanguage(
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
}
