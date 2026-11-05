import { WeekDay, WeekDayType } from '@/common/constants/attendence-config.constant'
import { Prisma } from '@prisma/client'
import { randomInt } from 'crypto'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

// Prisma error predicates live in ./utils/prisma-errors; re-exported so the
// existing imports keep working while modules migrate
export {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isRestrictViolationPrismaError,
  isUniqueConstraintPrismaError
} from './utils/prisma-errors'

export const generateOTP = () => {
  return String(randomInt(100000, 1000000))
}

export const generateRandomFilename = (filename: string) => {
  const ext = path.extname(filename)
  return `${uuidv4()}${ext}`
}

export function todayUTCFromVN() {
  const now = new Date()

  // Lấy ngày hiện tại ở múi giờ VN
  const vnYear = now.getUTCFullYear()
  const vnMonth = now.getUTCMonth()
  const vnDate = now.getUTCDate()
  now.setHours(0, 0, 0, 0)
  now.setHours(now.getHours() + 7)

  // 0h VN
  return now
}

export function mapConditionMeta(meta?: { type?: number } | null) {
  if (!meta) return Prisma.JsonNull
  return meta
}

export function getWeekDay(date: Date): WeekDayType {
  const days: WeekDayType[] = [
    WeekDay.SUNDAY, // 0
    WeekDay.MONDAY, // 1
    WeekDay.TUESDAY, // 2
    WeekDay.WEDNESDAY, // 3
    WeekDay.THURSDAY, // 4
    WeekDay.FRIDAY, // 5
    WeekDay.SATURDAY // 6
  ]

  return days[date.getDay()]
}

export function todayUTCWith0000() {
  const now = new Date()

  // Lấy thành phần ngày/tháng/năm theo UTC
  const vnYear = now.getUTCFullYear()
  const vnMonth = now.getUTCMonth() // chú ý: tháng trong JS bắt đầu từ 0
  const vnDate = now.getUTCDate()

  // Tạo 1 Date mới ở mốc 00:00:00 UTC
  const dateUTC = new Date(Date.UTC(vnYear, vnMonth, vnDate, 0, 0, 0, 0))

  // 0h VN
  return dateUTC
}

export function todayUTCWith0000ByDate(inputDate: Date) {
  const now = inputDate

  // Lấy thành phần ngày/tháng/năm theo UTC
  const vnYear = now.getUTCFullYear()
  const vnMonth = now.getUTCMonth() // chú ý: tháng trong JS bắt đầu từ 0
  const vnDate = now.getUTCDate()

  // Tạo 1 Date mới ở mốc 00:00:00 UTC
  const dateUTC = new Date(Date.UTC(vnYear, vnMonth, vnDate, 0, 0, 0, 0))

  // 0h VN
  return dateUTC
}

export function addDaysUTC0000(date, days) {
  const utc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + days,
    0, // giờ = 0
    0, // phút = 0
    0, // giây = 0
    0 // mili-giây = 0
  )
  return new Date(utc)
}

export function getDisplayName(
  displayNameObj: Record<string, string> | string | null | undefined,
  lang: string = 'vi'
): string {
  if (!displayNameObj) return ''
  if (typeof displayNameObj === 'string') return displayNameObj
  return (
    displayNameObj[lang] ?? displayNameObj['en'] ?? Object.values(displayNameObj)[0] ?? ''
  )
}

export function mapTypesDisplayName(
  types: any[] | null | undefined,
  lang: string = 'vi'
): any[] {
  if (!Array.isArray(types)) return []
  return types.map((t) => ({
    ...t,
    display_name: getDisplayName(t?.display_name, lang)
  }))
}

export function addTimeUTC(date, msToAdd) {
  const utc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds() + msToAdd
  )
  return new Date(utc)
}

export function convertEloToRank(elo: number): string {
  const rankThresholds = [
    { rank: 'N5', minElo: 0, maxElo: 1000 },
    { rank: 'N4', minElo: 1001, maxElo: 2000 },
    { rank: 'N3', minElo: 2001, maxElo: 3000 }
  ]

  for (const threshold of rankThresholds) {
    if (elo >= threshold.minElo && elo <= threshold.maxElo) {
      return threshold.rank
    }
  }
  return 'Unranked'
}

// ===================== ELO / Match scoring helpers =====================

type RankInfo = {
  rank: string
  rankStart: number
  rankRange: number
  baseWin: number
  baseLoss: number
}

const RANKS: RankInfo[] = [
  { rank: 'N5', rankStart: 0, rankRange: 1000, baseWin: 50, baseLoss: 10 },
  { rank: 'N4', rankStart: 1001, rankRange: 1000, baseWin: 40, baseLoss: 15 },
  { rank: 'N3', rankStart: 2001, rankRange: 1000, baseWin: 30, baseLoss: 20 }
]

export function getRankInfoForElo(elo: number): RankInfo {
  for (const r of RANKS) {
    if (elo >= r.rankStart && elo <= r.rankStart + r.rankRange) return r
  }
  // default to lowest rank
  return RANKS[0]
}

export function calculateMdiff(
  pointsA: number,
  pointsB: number,
  scalingFactor = 500
): number {
  // M_diff = 2 / (1 + e^{(PointDifference / ScalingFactor)})
  const pointDiff = pointsA - pointsB
  const exp = Math.exp(pointDiff / scalingFactor)
  const m = 2 / (1 + exp)
  return m
}

export function calculateIRM(elo: number, gravityFactor = 0.5): number {
  // IRM = 1 - (GravityFactor * PercentComplete)
  const rank = getRankInfoForElo(elo)
  const percentComplete = Math.max(
    0,
    Math.min(1, (elo - rank.rankStart) / rank.rankRange)
  )
  const irm = 1 - gravityFactor * percentComplete
  return Math.min(1, Math.max(0, irm))
}

/**
 * Calculate elo gain for the winner and elo lost for the loser according to the specified rules.
 * Returns rounded integer values.
 */
export function calculateEloGain(
  winnerElo: number,
  loserElo: number,
  opts?: { scaling?: number; gravity?: number }
): number {
  const scaling = opts?.scaling ?? 500
  const gravity = opts?.gravity ?? 0.5

  const winnerRank = getRankInfoForElo(winnerElo)
  const baseWin = winnerRank.baseWin

  const mDiff = calculateMdiff(winnerElo, loserElo, scaling)
  const irm = calculateIRM(winnerElo, gravity)

  const raw = baseWin * mDiff * irm
  const value = Math.max(0, Math.round(raw))
  return value
}

export function calculateEloLoss(
  loserElo: number,
  winnerElo: number,
  opts?: { scaling?: number }
): number {
  const scaling = opts?.scaling ?? 500

  const loserRank = getRankInfoForElo(loserElo)
  const baseLoss = loserRank.baseLoss

  const mDiff = calculateMdiff(loserElo, winnerElo, scaling)
  const lossMod = 2 - mDiff

  const raw = baseLoss * lossMod
  const value = Math.max(0, Math.round(raw))
  return value
}
