-- ADR D1 §2: at most one PENDING payment (open PayOS link) per invoice.
-- Older attempts stay as history (EXPIRED/FAILED/CANCELLED/PAID).

-- Existing data: keep the newest PENDING payment of each invoice, expire the rest
UPDATE "Payment" p
SET "status" = 'EXPIRED',
    "failureReason" = 'Superseded by a newer payment link'
WHERE p."status" = 'PENDING'
  AND EXISTS (
    SELECT 1 FROM "Payment" newer
    WHERE newer."invoiceId" = p."invoiceId"
      AND newer."status" = 'PENDING'
      AND newer."id" > p."id"
  );

-- Partial unique index (Prisma schema cannot express it; see schema.prisma)
CREATE UNIQUE INDEX "Payment_invoiceId_pending_key"
  ON "Payment" ("invoiceId")
  WHERE "status" = 'PENDING';
