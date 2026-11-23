-- Repair: 20261123140000_feedback_status was recorded as applied on some databases before it was complete.
-- Everything here is idempotent, so it is a no-op where that migration ran in full.
ALTER TABLE "Feedback"
  ADD COLUMN IF NOT EXISTS "adminNote" TEXT,
  ADD COLUMN IF NOT EXISTS "allowContact" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "contactEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "contactName" TEXT,
  ADD COLUMN IF NOT EXISTS "contactPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'NEW';

CREATE TABLE IF NOT EXISTS "FeedbackAttachment" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeedbackAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FeedbackAttachment_feedbackId_idx" ON "FeedbackAttachment"("feedbackId");
CREATE INDEX IF NOT EXISTS "Feedback_status_createdAt_idx" ON "Feedback"("status", "createdAt");

DO $$ BEGIN
  ALTER TABLE "FeedbackAttachment" ADD CONSTRAINT "FeedbackAttachment_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
