-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE');

-- CreateEnum
CREATE TYPE "AlternativeLetter" AS ENUM ('A', 'B', 'C', 'D', 'E');

-- CreateTable
CREATE TABLE "draft_questions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "statement" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alternatives" (
    "draftQuestionId" TEXT NOT NULL,
    "letter" "AlternativeLetter" NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,

    CONSTRAINT "alternatives_pkey" PRIMARY KEY ("draftQuestionId","letter")
);

-- CreateIndex
CREATE INDEX "draft_questions_organizationId_idx" ON "draft_questions"("organizationId");

-- AddForeignKey
ALTER TABLE "alternatives" ADD CONSTRAINT "alternatives_draftQuestionId_fkey" FOREIGN KEY ("draftQuestionId") REFERENCES "draft_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
