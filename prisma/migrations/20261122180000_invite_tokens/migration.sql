-- AlterTable
ALTER TABLE "Invite" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "tokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Invite_tokenHash_key" ON "Invite"("tokenHash");
