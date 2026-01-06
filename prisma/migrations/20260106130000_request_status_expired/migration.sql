-- Add expired status to RequestStatus enum
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'expired';
