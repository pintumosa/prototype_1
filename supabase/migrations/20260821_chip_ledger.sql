-- Chip ledger: records every chip movement per user
CREATE TABLE IF NOT EXISTS chip_ledger (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uid         text NOT NULL,
  type        text NOT NULL,   -- 'deposit' | 'withdraw' | 'game_win' | 'game_loss' | 'game_entry' | 'refund' | 'bonus' | 'admin'
  amount      numeric NOT NULL, -- always positive
  direction   text NOT NULL,   -- 'credit' | 'debit'
  ref_id      text,            -- deposit id / challenge id / result id
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chip_ledger_uid_idx ON chip_ledger(uid);
CREATE INDEX IF NOT EXISTS chip_ledger_created_idx ON chip_ledger(created_at DESC);

ALTER TABLE chip_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chip_ledger_read_own" ON chip_ledger FOR SELECT TO authenticated USING (uid = auth.uid()::text);

-- Auto-insert ledger entry when a deposit is approved
CREATE OR REPLACE FUNCTION fn_chip_ledger_deposit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.status = 'approved' OR NEW.status = 'success')
     AND (OLD.status IS DISTINCT FROM 'approved' AND OLD.status IS DISTINCT FROM 'success') THEN
    INSERT INTO chip_ledger(uid, type, amount, direction, ref_id, note)
    VALUES (NEW.uid, 'deposit', NEW.amount, 'credit', NEW.id::text, 'Deposit via ' || COALESCE(NEW.method,'UPI'));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_chip_ledger_deposit ON deposits;
CREATE TRIGGER trg_chip_ledger_deposit
  AFTER UPDATE ON deposits FOR EACH ROW EXECUTE FUNCTION fn_chip_ledger_deposit();

-- Auto-insert ledger entry when a withdrawal is approved
CREATE OR REPLACE FUNCTION fn_chip_ledger_withdraw()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.status = 'approved')
     AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO chip_ledger(uid, type, amount, direction, ref_id, note)
    VALUES (NEW.uid, 'withdraw', NEW.amount, 'debit', NEW.id::text, 'Withdrawal via ' || COALESCE(NEW.method,'UPI'));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_chip_ledger_withdraw ON withdraws;
CREATE TRIGGER trg_chip_ledger_withdraw
  AFTER UPDATE ON withdraws FOR EACH ROW EXECUTE FUNCTION fn_chip_ledger_withdraw();
