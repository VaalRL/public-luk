-- CreateIndex
CREATE INDEX "BankAccount_last5Digits_idx" ON "BankAccount"("last5Digits");

-- CreateIndex
CREATE INDEX "Invoice_providerId_idx" ON "Invoice"("providerId");

-- CreateIndex
CREATE INDEX "Transaction_note_idx" ON "Transaction"("note");
