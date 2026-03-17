-- Migration 006: soft delete support
ALTER TABLE items ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL;
CREATE INDEX idx_items_deleted_at ON items(deleted_at);
