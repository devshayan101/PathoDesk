-- SQLite Migration: Parameter Grouping
-- Adds parent_id for grouping sub-parameters under a header

ALTER TABLE test_parameters ADD COLUMN parent_id INTEGER REFERENCES test_parameters(id);
