-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_date_idx" ON "Invoice"("date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_companyId_idx" ON "Invoice"("companyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_status_date_idx" ON "Invoice"("status", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InvoiceReminder_date_idx" ON "InvoiceReminder"("date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InvoiceReminder_completed_idx" ON "InvoiceReminder"("completed");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InvoiceReminder_invoiceId_idx" ON "InvoiceReminder"("invoiceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_date_idx" ON "Transaction"("date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_deposit_idx" ON "Transaction"("deposit");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_bankStatementId_idx" ON "Transaction"("bankStatementId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_status_date_idx" ON "Transaction"("status", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReconciliationRecord_invoiceId_idx" ON "ReconciliationRecord"("invoiceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReconciliationRecord_transactionId_idx" ON "ReconciliationRecord"("transactionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReconciliationRecord_date_idx" ON "ReconciliationRecord"("date");
