DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConversationType') THEN
    CREATE TYPE "ConversationType" AS ENUM ('LISTING_CHAT', 'GENERAL_CHAT');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConversationStatus') THEN
    CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChatRequestStatus') THEN
    CREATE TYPE "ChatRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED');
  END IF;
END
$$;

ALTER TABLE "Conversation"
  ADD COLUMN IF NOT EXISTS "type" "ConversationType" NOT NULL DEFAULT 'GENERAL_CHAT',
  ADD COLUMN IF NOT EXISTS "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "lastMessageId" TEXT;

UPDATE "Conversation"
SET "type" = CASE
  WHEN "propertyId" IS NOT NULL THEN 'LISTING_CHAT'::"ConversationType"
  ELSE 'GENERAL_CHAT'::"ConversationType"
END
WHERE "type" = 'GENERAL_CHAT'::"ConversationType";

ALTER TABLE "ConversationParticipant"
  ADD COLUMN IF NOT EXISTS "role" TEXT,
  ADD COLUMN IF NOT EXISTS "lastReadAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "muted" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Message"
  ADD COLUMN IF NOT EXISTS "attachments" JSONB,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "ChatRequest" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "status" "ChatRequestStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChatRequest_conversationId_key" ON "ChatRequest"("conversationId");
CREATE INDEX IF NOT EXISTS "ChatRequest_recipientId_status_idx" ON "ChatRequest"("recipientId", "status");
CREATE INDEX IF NOT EXISTS "ChatRequest_requesterId_status_idx" ON "ChatRequest"("requesterId", "status");
CREATE INDEX IF NOT EXISTS "Conversation_type_idx" ON "Conversation"("type");
CREATE INDEX IF NOT EXISTS "Conversation_status_idx" ON "Conversation"("status");
CREATE INDEX IF NOT EXISTS "Conversation_lastMessageId_idx" ON "Conversation"("lastMessageId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ChatRequest_conversationId_fkey'
      AND table_name = 'ChatRequest'
  ) THEN
    ALTER TABLE "ChatRequest"
      ADD CONSTRAINT "ChatRequest_conversationId_fkey"
      FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ChatRequest_requesterId_fkey'
      AND table_name = 'ChatRequest'
  ) THEN
    ALTER TABLE "ChatRequest"
      ADD CONSTRAINT "ChatRequest_requesterId_fkey"
      FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ChatRequest_recipientId_fkey'
      AND table_name = 'ChatRequest'
  ) THEN
    ALTER TABLE "ChatRequest"
      ADD CONSTRAINT "ChatRequest_recipientId_fkey"
      FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;
