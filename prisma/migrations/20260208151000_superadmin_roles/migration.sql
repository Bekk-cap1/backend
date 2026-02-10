-- Align backend role enum with platform RBAC and enable SUPERADMIN.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'finance';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'support';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ops';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'superadmin';
