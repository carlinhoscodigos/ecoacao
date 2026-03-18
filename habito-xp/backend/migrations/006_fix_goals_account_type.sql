-- Metas passam a poder ser vinculadas a um "tipo de conta"
-- e o progresso (current_amount/status) passa a ser sincronizado a partir dos
-- saldos atuais das contas daquele tipo.

ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS account_type VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_goals_user_account_type
  ON goals(user_id, account_type);

