CREATE TABLE IF NOT EXISTS conflicts (
  id text PRIMARY KEY,
  challenge_id text,
  game_id text,
  setter_uid text,
  setter_name text,
  setter_phone text,
  acceptor_uid text,
  acceptor_name text,
  acceptor_phone text,
  game_type text,
  amount numeric,
  room_code text,
  setter_started_at text,
  acceptor_started_at text,
  setter_proof_url text,
  acceptor_proof_url text,
  status text DEFAULT 'pending',
  resolved_by text,
  resolved_at text,
  refund_to text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conflicts_admin_all" ON conflicts FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);
CREATE POLICY "conflicts_player_insert" ON conflicts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "conflicts_player_update_proof" ON conflicts FOR UPDATE TO authenticated
  USING (setter_uid = auth.uid()::text OR acceptor_uid = auth.uid()::text);
CREATE POLICY "conflicts_player_read" ON conflicts FOR SELECT TO authenticated
  USING (setter_uid = auth.uid()::text OR acceptor_uid = auth.uid()::text);
