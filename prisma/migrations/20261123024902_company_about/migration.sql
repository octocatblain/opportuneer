-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "about" TEXT,
ADD COLUMN     "aboutAt" TIMESTAMP(3),
ADD COLUMN     "aboutSources" JSONB;
