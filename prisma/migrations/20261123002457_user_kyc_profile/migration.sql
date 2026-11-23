-- CreateTable
CREATE TABLE "UserProfile" (
    "userId" TEXT NOT NULL,
    "basics" JSONB,
    "jobPrefs" JSONB,
    "pitchPrefs" JSONB,
    "basicsDoneAt" TIMESTAMP(3),
    "jobDoneAt" TIMESTAMP(3),
    "pitchDoneAt" TIMESTAMP(3),
    "resumeName" TEXT,
    "resumePath" TEXT,
    "resumeMime" TEXT,
    "resumeText" TEXT,
    "resumeUpdatedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
