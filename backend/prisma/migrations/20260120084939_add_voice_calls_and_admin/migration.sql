-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('INITIATED', 'RINGING', 'ANSWERED', 'REJECTED', 'MISSED', 'ENDED', 'CANCELLED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "voice_calls" (
    "call_id" TEXT NOT NULL,
    "caller_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'INITIATED',
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "duration" INTEGER,
    "twilio_room_sid" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_calls_pkey" PRIMARY KEY ("call_id")
);

-- CreateIndex
CREATE INDEX "voice_calls_caller_id_idx" ON "voice_calls"("caller_id");

-- CreateIndex
CREATE INDEX "voice_calls_receiver_id_idx" ON "voice_calls"("receiver_id");

-- CreateIndex
CREATE INDEX "voice_calls_status_idx" ON "voice_calls"("status");

-- CreateIndex
CREATE INDEX "voice_calls_created_at_idx" ON "voice_calls"("created_at");

-- AddForeignKey
ALTER TABLE "voice_calls" ADD CONSTRAINT "voice_calls_caller_id_fkey" FOREIGN KEY ("caller_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_calls" ADD CONSTRAINT "voice_calls_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
