-- AlterTable
ALTER TABLE "groups" ADD COLUMN "last_message_at" TIMESTAMP(3), ADD COLUMN "last_message_preview" TEXT;

-- CreateTable
CREATE TABLE "group_messages" (
    "message_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "message_type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_messages_pkey" PRIMARY KEY ("message_id")
);

-- CreateIndex
CREATE INDEX "group_messages_group_id_idx" ON "group_messages"("group_id");

-- CreateIndex
CREATE INDEX "group_messages_sender_id_idx" ON "group_messages"("sender_id");

-- CreateIndex
CREATE INDEX "group_messages_created_at_idx" ON "group_messages"("created_at");

-- CreateIndex
CREATE INDEX "groups_last_message_at_idx" ON "groups"("last_message_at");

-- AddForeignKey
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
