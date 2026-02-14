-- AlterTable
ALTER TABLE "message_attachments" ALTER COLUMN "message_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "group_message_attachments" (
    "attachment_id" TEXT NOT NULL,
    "group_message_id" TEXT,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_message_attachments_pkey" PRIMARY KEY ("attachment_id")
);

-- CreateIndex
CREATE INDEX "group_message_attachments_group_message_id_idx" ON "group_message_attachments"("group_message_id");

-- AddForeignKey
ALTER TABLE "group_message_attachments" ADD CONSTRAINT "group_message_attachments_group_message_id_fkey" FOREIGN KEY ("group_message_id") REFERENCES "group_messages"("message_id") ON DELETE CASCADE ON UPDATE CASCADE;
