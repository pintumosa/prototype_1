ALTER TABLE challenges ADD COLUMN IF NOT EXISTS setter_started_at text;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS acceptor_started_at text;
