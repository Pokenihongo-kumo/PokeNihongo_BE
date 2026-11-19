import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from './prisma.service'
import { AiPolicyScope } from '@prisma/client'

export type AiPolicyEntity = {
  entity: string
  scope: AiPolicyScope
  fields: string[]
  filter?: Record<string, any>
  limit?: number // Số lượng records tối đa để lấy từ entity này
}

export type AiContextPolicy = {
  purpose: string
  entities: AiPolicyEntity[]
  maskingRules?: Record<string, 'mask' | 'drop' | 'none'>
}

@Injectable()
export class DataAccessService {
  private readonly logger = new Logger(DataAccessService.name)

  constructor(private readonly prisma: PrismaService) {}

  // Demo method: fetch data by policy for one user
  async getAiSafeData(
    userId: number,
    policy: AiContextPolicy
  ): Promise<Record<string, any[]>> {
    const result: Record<string, any[]> = {}
    for (const e of policy.entities || []) {
      try {
        const modelName = this.toCamel(e.entity) // example: userAnswerLog -> userAnswerLog
        const model = (this.prisma as any)[modelName]
        if (!model || typeof model.findMany !== 'function') {
          this.logger.warn(
            `Model "${modelName}" (from entity "${e.entity}") not found in Prisma Client. Skipping.`
          )
          result[e.entity] = []
          continue
        }
        const where = this.buildWhere(userId, e)
        const select = this.buildSelect(e.fields)
        // Apply limit nếu admin config
        const query: any = { where, select }
        if (e.limit && e.limit > 0) {
          query.take = e.limit
          // Thêm orderBy để lấy records mới nhất (nếu có createdAt trong fields)
          if (e.fields && e.fields.includes('createdAt')) {
            query.orderBy = { createdAt: 'desc' }
          }
        }
        const data = await model.findMany(query)
        result[e.entity] = (data || []).map((row: any) =>
          this.applyMasking(row, policy.maskingRules || {})
        )
      } catch (error) {
        this.logger.error(`Error fetching data for entity "${e.entity}":`, error)
        result[e.entity] = []
      }
    }
    return result
  }

  private buildWhere(userId: number, entity: AiPolicyEntity): any {
    // Resolve $nowMinusDays tokens in filter
    const resolvedFilter = this.resolveTimeFilters(entity.filter || {})
    const base: any = { ...resolvedFilter }

    // Map by entity to correct relational filter; not all tables have userId column
    switch (entity.entity) {
      case 'UserAnswerLog':
        return {
          ...base,
          userExerciseAttempt: { userId }
        }
      case 'UserTestAnswerLog':
        return {
          ...base,
          userTestAttempt: { userId }
        }
      case 'QuestionBank':
      case 'Answer':
      case 'Vocabulary':
        // PUBLIC entity - do not add user filter
        return base
      default:
        if (entity.scope === AiPolicyScope.SELF_ONLY) {
          return { ...base, userId }
        }
        return base
    }
  }

  /**
   * Resolve $nowMinusDays tokens to actual ISO dates
   * Example: { "$nowMinusDays": { "createdAt": 7 } } -> { "createdAt": { "gte": "2025-10-28T00:00:00.000Z" } }
   */
  private resolveTimeFilters(filter: Record<string, any>): Record<string, any> {
    const resolved: Record<string, any> = {}
    for (const [key, value] of Object.entries(filter)) {
      if (key === '$nowMinusDays' && typeof value === 'object') {
        // Handle $nowMinusDays: { "createdAt": 7 }
        for (const [field, days] of Object.entries(value)) {
          const daysNum = Number(days)
          if (!isNaN(daysNum) && daysNum > 0) {
            const date = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000)
            resolved[field] = { gte: date.toISOString() }
          }
        }
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // Recursively resolve nested objects
        resolved[key] = this.resolveTimeFilters(value)
      } else {
        resolved[key] = value
      }
    }
    return resolved
  }

  private buildSelect(fields: string[]): any {
    const select: any = {}
    for (const f of fields || []) select[f] = true
    return select
  }

  private applyMasking<T extends Record<string, any>>(
    row: T,
    rules: Record<string, 'mask' | 'drop' | 'none'>
  ): T {
    const clone: any = { ...row }
    for (const [field, rule] of Object.entries(rules || {})) {
      if (!(field in clone)) continue
      if (rule === 'drop') delete clone[field]
      else if (rule === 'mask') clone[field] = '***'
    }
    return clone
  }

  private toCamel(name: string): string {
    return name.charAt(0).toLowerCase() + name.slice(1)
  }
}
