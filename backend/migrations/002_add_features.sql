-- ============================================================
-- Add features JSON column to categories
-- ============================================================

SET NAMES utf8mb4;

ALTER TABLE categories
    ADD COLUMN features JSON NOT NULL DEFAULT '[]' AFTER custom_fields;

-- Populate features for preset categories
UPDATE categories SET features = '["reading_status", "barcode_isbn", "series_grouping", "anilist_import"]'
    WHERE name = 'Manga';

UPDATE categories SET features = '["reading_status", "barcode_isbn"]'
    WHERE name = 'Livres';

UPDATE categories SET features = '["wear_status"]'
    WHERE name = 'Vêtements';

UPDATE categories SET features = '["deployment_status"]'
    WHERE name = 'Tech';

-- Add composite index for common item query pattern
CREATE INDEX idx_items_category_deleted ON items(category_id, deleted_at);
