-- Migration: Allow NULL empresa_id in users table
-- Date: 2025-11-09
-- Purpose: Enable shared user accounts across companies and proper empresa deletion

ALTER TABLE users ALTER COLUMN empresa_id DROP NOT NULL;
