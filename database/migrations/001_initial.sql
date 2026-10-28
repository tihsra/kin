CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 80),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  phone text,
  verified_at timestamptz,
  suspended_at timestamptz,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_token text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE account_tokens (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('verify', 'reset')),
  expires_at timestamptz NOT NULL
);
CREATE TABLE donor_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  blood_group text NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  city text NOT NULL,
  location geography(Point, 4326) NOT NULL,
  radius_km integer NOT NULL DEFAULT 15 CHECK (radius_km BETWEEN 1 AND 500),
  available boolean NOT NULL DEFAULT true,
  available_until timestamptz,
  email_invitations boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX donor_location ON donor_profiles USING gist(location);
CREATE TABLE requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id),
  hospital text NOT NULL,
  destination text NOT NULL,
  city text NOT NULL,
  location geography(Point, 4326) NOT NULL,
  blood_group text NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  component text NOT NULL CHECK (component IN ('Whole blood', 'Red cells', 'Platelets', 'Plasma')),
  quantity text,
  target integer NOT NULL CHECK (target BETWEEN 1 AND 20),
  deadline timestamptz NOT NULL,
  instructions text NOT NULL DEFAULT '',
  checked_instructions boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'covered', 'fulfilled', 'cancelled', 'expired')),
  next_outreach_at timestamptz,
  outreach_exhausted boolean NOT NULL DEFAULT false,
  last_retry_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
CREATE INDEX request_location ON requests USING gist(location);
CREATE INDEX request_status_deadline ON requests(status, deadline);
CREATE INDEX request_owner ON requests(owner_id);
CREATE TABLE offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  donor_id uuid NOT NULL REFERENCES users(id),
  arrival_start timestamptz NOT NULL,
  arrival_end timestamptz NOT NULL CHECK (arrival_end > arrival_start),
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'withdrawn', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(request_id, donor_id)
);
CREATE INDEX offer_donor ON offers(donor_id);
CREATE TABLE commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL UNIQUE REFERENCES offers(id),
  donor_id uuid NOT NULL REFERENCES users(id),
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'closed')),
  donor_shared_phone text,
  owner_shared_phone text,
  donor_shared boolean NOT NULL DEFAULT false,
  owner_shared boolean NOT NULL DEFAULT false,
  cancelled_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
CREATE UNIQUE INDEX one_active_commitment ON commitments(donor_id) WHERE status = 'confirmed';
CREATE INDEX commitment_request ON commitments(request_id, status);
CREATE TABLE invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  donor_id uuid NOT NULL REFERENCES users(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'declined', 'expired', 'withdrawn')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(request_id, donor_id)
);
CREATE INDEX invitation_frequency ON invitations(donor_id, created_at);
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id uuid REFERENCES requests(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notification_user ON notifications(user_id, created_at DESC);
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('outreach', 'email')),
  payload jsonb NOT NULL,
  dedupe_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'failed')),
  run_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  locked_at timestamptz,
  lock_token uuid,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX job_schedule ON jobs(status, run_at);
CREATE TABLE activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id),
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_request ON activity(request_id, created_at);
CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES users(id),
  target_id uuid NOT NULL REFERENCES users(id),
  request_id uuid NOT NULL REFERENCES requests(id),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  resolved_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE rate_limits (
  key text PRIMARY KEY,
  hits integer NOT NULL,
  resets_at timestamptz NOT NULL
);
CREATE TABLE local_mail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
