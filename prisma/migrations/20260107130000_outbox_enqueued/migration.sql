-- Add ENQUEUED status for safer outbox lifecycle
ALTER TYPE "OutboxStatus" ADD VALUE IF NOT EXISTS 'ENQUEUED';
