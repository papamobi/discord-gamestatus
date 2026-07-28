CREATE OR REPLACE VIEW schema_version AS SELECT 5 AS version;

-- Per-status ordering within a channel. Higher position = further down.
-- Backfilled with id so existing statuses keep their current insert order.
ALTER TABLE statuses ADD COLUMN position INT NOT NULL DEFAULT 0;
UPDATE statuses SET position = id;
