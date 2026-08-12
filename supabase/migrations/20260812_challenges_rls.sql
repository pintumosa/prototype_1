-- Allow all authenticated users to read all challenges (lobby visibility)
DROP POLICY IF EXISTS "challenges_read_all_authenticated" ON challenges;
CREATE POLICY "challenges_read_all_authenticated"
ON challenges FOR SELECT
TO authenticated
USING (true);
