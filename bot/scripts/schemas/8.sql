ALTER TABLE statuses ADD COLUMN button_label VARCHAR(80);
ALTER TABLE statuses ADD COLUMN button_content VARCHAR(2000);
CREATE OR REPLACE VIEW schema_version AS SELECT 8 AS version;
