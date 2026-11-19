CREATE TYPE "AccountType" AS ENUM ('DRIVER', 'SPECTATOR', 'ORGANIZER');
CREATE TYPE "MembershipPlan" AS ENUM ('ATTENDEE', 'ORGANIZER');
CREATE TYPE "TranslationStatus" AS ENUM ('NONE', 'AUTO', 'EDITED', 'STALE', 'FAILED');
ALTER TYPE "Discipline" ADD VALUE 'GYMKHANA';
ALTER TYPE "Discipline" ADD VALUE 'PVC_DRIFT';
ALTER TYPE "Discipline" ADD VALUE 'SHOW';
ALTER TYPE "Discipline" ADD VALUE 'OTHER';
ALTER TYPE "EventStatus" ADD VALUE 'DRAFT';
ALTER TYPE "EventStatus" ADD VALUE 'ORGANIZER';
ALTER TABLE "User"
  ADD COLUMN "accountType" "AccountType",
  ADD COLUMN "onboarded" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'en';
-- Do not infer Driver or Spectator identity. Existing users select on next account visit.
-- Their paid attendee entitlements remain intact before and after that selection.
ALTER TABLE "Billing" ADD COLUMN "plan" "MembershipPlan" NOT NULL DEFAULT 'ATTENDEE';
ALTER TABLE "SavedSearch" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "Event"
  ADD COLUMN "ownerId" TEXT,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "descriptionOriginal" TEXT,
  ADD COLUMN "descriptionLanguage" TEXT,
  ADD COLUMN "descriptionTranslation" TEXT,
  ADD COLUMN "translationStatus" "TranslationStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "translationEdited" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Event" SET "publishedAt" = "createdAt" WHERE "status" = 'VERIFIED';
ALTER TABLE "Event" ADD CONSTRAINT "Event_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Event_ownerId_idx" ON "Event"("ownerId");
ALTER TABLE "Event" ADD CONSTRAINT "Event_descriptionLanguage_check" CHECK ("descriptionLanguage" IS NULL OR "descriptionLanguage" IN ('en', 'ja'));
ALTER TABLE "Event" ADD CONSTRAINT "Event_provenance_check" CHECK (
  ("ownerId" IS NULL AND "status" IN ('DEMO', 'VERIFIED')) OR
  ("ownerId" IS NOT NULL AND "status"::text IN ('DRAFT', 'ORGANIZER') AND "verifiedAt" IS NULL)
);
