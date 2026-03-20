-- Add soft-delete support for groups
ALTER TABLE "groups"
ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "groups_is_active_idx" ON "groups"("is_active");
