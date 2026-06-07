-- Neon database schema for raffle state and authentication

-- Main state table
CREATE TABLE IF NOT EXISTS raffle_state (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Snapshot history
CREATE TABLE IF NOT EXISTS raffle_snapshots (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for snapshot lookups
CREATE INDEX IF NOT EXISTS raffle_snapshots_created_at_idx
  ON raffle_snapshots(created_at DESC);

CREATE INDEX IF NOT EXISTS raffle_snapshots_id_idx
  ON raffle_snapshots(id);

-- NextAuth tables
CREATE TABLE IF NOT EXISTS verification_token (
  identifier TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  token TEXT NOT NULL,
  PRIMARY KEY (identifier, token)
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  "emailVerified" TIMESTAMPTZ,
  image TEXT
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE(provider, "providerAccountId")
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "sessionToken" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS verification_token_identifier_idx
  ON verification_token(identifier);

CREATE INDEX IF NOT EXISTS accounts_userId_idx
  ON accounts("userId");

CREATE INDEX IF NOT EXISTS sessions_userId_idx
  ON sessions("userId");

CREATE INDEX IF NOT EXISTS sessions_sessionToken_idx
  ON sessions("sessionToken");

-- OTP safeguards
CREATE TABLE IF NOT EXISTS otp_failures (
  email TEXT PRIMARY KEY,
  attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_request TIMESTAMPTZ
);

-- =====================================================================
-- AI Translation stack (v2.0, Feature 3 — ported from FEED)
-- =====================================================================

-- Enabled-language catalog. Keyed by English name (matches translations.language).
-- The 8 hardcoded base languages are always enabled; others are opt-in and only
-- become client-visible once their translations are complete.
CREATE TABLE IF NOT EXISTS languages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- AI provider/model configurations. API keys are encrypted at rest
-- (AES-256-GCM, master key from ENCRYPTION_MASTER_KEY env var); per-row salt.
CREATE TABLE IF NOT EXISTS ai_configurations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'apikey', -- 'apikey' | 'prompt'
  service_type TEXT,                   -- 'OpenAI' | 'Anthropic' | 'Google'
  model TEXT,
  model_name TEXT,
  encrypted_api_key TEXT,
  salt TEXT,
  input_cost DOUBLE PRECISION DEFAULT 0,
  output_cost DOUBLE PRECISION DEFAULT 0,
  unit_price TEXT DEFAULT 'per_1m',    -- 'per_1m' | 'per_1k'
  temperature DOUBLE PRECISION,
  top_p DOUBLE PRECISION,
  thinking_level TEXT,
  max_tokens INT,
  input_token_limit INT,
  output_token_limit INT,
  daily_cost_limit DOUBLE PRECISION,
  monthly_cost_limit DOUBLE PRECISION,
  tokens_per_minute INT,
  requests_per_minute INT,
  requests_per_day INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Shared system prompts driving translation/classification.
CREATE TABLE IF NOT EXISTS system_prompts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  prompt_type TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  translation_approach TEXT,
  context_guidance TEXT,
  additional_guidance TEXT,
  temperature DOUBLE PRECISION,
  top_p DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Translation cache. One row per (original text, language, type) with a status.
CREATE TABLE IF NOT EXISTS translations (
  id SERIAL PRIMARY KEY,
  original_text TEXT NOT NULL,
  translated_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'completed' | 'failed'
  language TEXT NOT NULL,                  -- English name, matches languages.name
  type TEXT NOT NULL,                      -- 'ui_string' | 'announcement' | 'custom'
  metadata JSONB,
  prompt_tokens INT,
  completion_tokens INT,
  total_cost DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT translations_unique_combo UNIQUE (original_text, language, type)
);

CREATE INDEX IF NOT EXISTS translations_status_idx ON translations(status);
CREATE INDEX IF NOT EXISTS translations_language_idx ON translations(language);
CREATE INDEX IF NOT EXISTS translations_type_idx ON translations(type);

-- Per-operation token/cost accounting for limit enforcement + metrics.
CREATE TABLE IF NOT EXISTS usage_records (
  id SERIAL PRIMARY KEY,
  ai_configuration_id INT REFERENCES ai_configurations(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  operation_type TEXT,
  prompt_tokens INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  total_cost DOUBLE PRECISION DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT true,
  duration INT,
  translation_id INT REFERENCES translations(id) ON DELETE SET NULL,
  model_used TEXT,
  service_provider TEXT,
  language TEXT
);

CREATE INDEX IF NOT EXISTS usage_records_timestamp_idx ON usage_records(timestamp DESC);
CREATE INDEX IF NOT EXISTS usage_records_provider_idx ON usage_records(service_provider);
CREATE INDEX IF NOT EXISTS usage_records_success_idx ON usage_records(success);
