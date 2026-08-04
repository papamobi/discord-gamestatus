ALTER TABLE statuses ADD COLUMN first_offline_at TIMESTAMPTZ;
CREATE OR REPLACE VIEW schema_version AS SELECT 7 AS version;
