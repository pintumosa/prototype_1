-- Allow users to read their own deposits and withdraws
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdraws ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deposits_read_own" ON deposits;
CREATE POLICY "deposits_read_own" ON deposits FOR SELECT TO authenticated USING (uid = auth.uid()::text);

DROP POLICY IF EXISTS "withdraws_read_own" ON withdraws;
CREATE POLICY "withdraws_read_own" ON withdraws FOR SELECT TO authenticated USING (uid = auth.uid()::text);
