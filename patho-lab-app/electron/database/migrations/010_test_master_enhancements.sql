-- SQLite Migration: Test Master Enhancements
-- Adds support for sub-parameters (headers)

-- Add is_header column to test_parameters (0 = normal parameter, 1 = header parameter)
ALTER TABLE test_parameters ADD COLUMN is_header INTEGER DEFAULT 0;
