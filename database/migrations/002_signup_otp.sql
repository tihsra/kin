CREATE TABLE signup_challenges (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  expires_at timestamptz NOT NULL,
  resend_after timestamptz NOT NULL,
  send_count integer NOT NULL DEFAULT 1 CHECK (send_count BETWEEN 1 AND 5),
  delivery_window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX signup_challenge_expiry ON signup_challenges(expires_at);
DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE verified_at IS NULL);
DELETE FROM account_tokens WHERE purpose = 'verify';
