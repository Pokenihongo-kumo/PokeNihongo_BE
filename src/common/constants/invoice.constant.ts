export const InvoiceStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED'
} as const

export type InvoiceStatusType = (typeof InvoiceStatus)[keyof typeof InvoiceStatus]

export const PAYMENT_METHOD = {
  BANK_TRANSFER: 'BANK_TRANSFER'
} as const

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  REFUNDED: 'REFUNDED'
} as const
