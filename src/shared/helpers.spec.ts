import { Prisma } from '@prisma/client'
import {
  isForeignKeyConstraintPrismaError,
  isRestrictViolationPrismaError
} from './helpers'

describe('isRestrictViolationPrismaError', () => {
  const restrict = new Prisma.PrismaClientUnknownRequestError(
    'ConnectorError(... PostgresError { code: "23001", message: "update or delete on table \\"Reward\\" violates RESTRICT setting of foreign key constraint ..." })',
    { clientVersion: 'test' }
  )

  it('recognises a delete blocked by an onDelete: Restrict relation', () => {
    expect(isRestrictViolationPrismaError(restrict)).toBe(true)
    // Prisma does not report it as P2003
    expect(isForeignKeyConstraintPrismaError(restrict)).toBe(false)
  })

  it('ignores other errors', () => {
    const other = new Prisma.PrismaClientUnknownRequestError('connection reset', {
      clientVersion: 'test'
    })
    expect(isRestrictViolationPrismaError(other)).toBe(false)
    expect(isRestrictViolationPrismaError(new Error('violates RESTRICT setting'))).toBe(
      false
    )
  })
})
