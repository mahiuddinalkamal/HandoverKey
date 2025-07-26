-- Successors table
CREATE TABLE IF NOT EXISTS successors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  verification_token VARCHAR(255),
  verified BOOLEAN DEFAULT false,
  handover_delay_days INTEGER DEFAULT 90,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_successors_user_id ON successors(user_id);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_successors_email ON successors(email);

-- Index for verification status
CREATE INDEX IF NOT EXISTS idx_successors_verified ON successors(verified);

-- Unique constraint to prevent duplicate successors for same user
CREATE UNIQUE INDEX IF NOT EXISTS idx_successors_user_email 
  ON successors(user_id, email); 