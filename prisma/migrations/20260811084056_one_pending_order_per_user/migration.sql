-- This is an empty migration.
CREATE UNIQUE INDEX "one_pending_order_per_user"
  ON "Order" ("userId")
  WHERE status = 'PENDING';
