CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';

-- Garante valor válido em bases antigas
UPDATE users
SET role = 'user'
WHERE role IS NULL OR role NOT IN ('admin', 'user');

-- Conta admin solicitada
-- email: carlitodopalito@gmail.com
-- senha: v9sM0bPcnnkv288Um022C1
INSERT INTO users (name, email, password_hash, plan, is_active, role)
VALUES (
  'Carlos Danicl',
  'carlitodopalito@gmail.com',
  crypt('v9sM0bPcnnkv288Um022C1', gen_salt('bf')),
  'free',
  true,
  'admin'
)
ON CONFLICT (email) DO UPDATE
SET
  role = 'admin',
  is_active = true,
  password_hash = EXCLUDED.password_hash;

