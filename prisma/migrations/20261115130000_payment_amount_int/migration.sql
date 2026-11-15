-- ADR D1 §4: money in whole VND. Payment.amount was Float while Invoice
-- amounts are Int; PayOS amounts are compared with Number(payment.amount).
-- Before deploying, check that nothing is lost:
--   SELECT count(*) FROM "Payment" WHERE "amount" <> round("amount");
-- Any fractional value is rounded to the nearest VND here.
ALTER TABLE "Payment"
  ALTER COLUMN "amount" DROP DEFAULT,
  ALTER COLUMN "amount" TYPE INTEGER USING round("amount")::integer,
  ALTER COLUMN "amount" SET DEFAULT 0;
