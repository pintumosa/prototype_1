CREATE TABLE IF NOT EXISTS join_requests (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL,
  requester_uid TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | rejected | cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jr_read" ON join_requests;
CREATE POLICY "jr_read" ON join_requests FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "jr_insert" ON join_requests;
CREATE POLICY "jr_insert" ON join_requests FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "jr_update" ON join_requests;
CREATE POLICY "jr_update" ON join_requests FOR UPDATE TO authenticated USING (true);
