ALTER TABLE challenges ADD COLUMN IF NOT EXISTS started_at bigint;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS room_code_shared_at text;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS room_code_copied_at text;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS cancelled_by text;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS cancelled_at text;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS started_by text;
