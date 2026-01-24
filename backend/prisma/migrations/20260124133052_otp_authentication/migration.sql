-- CreateEnum
CREATE TYPE "OTPPurpose" AS ENUM ('REGISTRATION', 'LOGIN');

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_country_code_fkey";

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL,
ALTER COLUMN "first_name" DROP NOT NULL,
ALTER COLUMN "last_name" DROP NOT NULL,
ALTER COLUMN "country_code" DROP NOT NULL;

-- CreateTable
CREATE TABLE "otp_tokens" (
    "otp_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "otp_code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "purpose" "OTPPurpose" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_at" TIMESTAMP(3),

    CONSTRAINT "otp_tokens_pkey" PRIMARY KEY ("otp_id")
);

-- CreateIndex
CREATE INDEX "otp_tokens_phone_number_idx" ON "otp_tokens"("phone_number");

-- CreateIndex
CREATE INDEX "otp_tokens_otp_code_idx" ON "otp_tokens"("otp_code");

-- CreateIndex
CREATE INDEX "otp_tokens_expires_at_idx" ON "otp_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "otp_tokens_purpose_idx" ON "otp_tokens"("purpose");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_tokens" ADD CONSTRAINT "otp_tokens_phone_number_fkey" FOREIGN KEY ("phone_number") REFERENCES "users"("phone_number") ON DELETE RESTRICT ON UPDATE CASCADE;
