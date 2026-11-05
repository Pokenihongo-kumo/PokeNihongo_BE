import { Prisma } from '@prisma/client'

// Classify Prisma errors by type/code. Callers map them to HTTP errors with
// their own context (which record, which constraint); never map blindly.

export function isUniqueConstraintPrismaError(
  error: unknown
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export function isNotFoundPrismaError(
  error: unknown
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
}

export function isForeignKeyConstraintPrismaError(
  error: unknown
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003'
}

// A delete blocked by an `onDelete: Restrict` relation. Postgres reports it as
// 23001, which Prisma does not map to P2003 but to an unknown request error.
export function isRestrictViolationPrismaError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientUnknownRequestError &&
    /code: "23001"|violates RESTRICT setting of foreign key/.test(error.message)
  )
}
