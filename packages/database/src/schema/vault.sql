-- Encrypted vault data
CREATE TABLE IF NOT EXISTS vault_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  encrypted_data BYTEA NOT NULL,
  iv BYTEA NOT NULL,
  algorithm VARCHAR(50) NOT NULL,
  category VARCHAR(100),
  tags TEXT[],
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_vault_entries_user_id ON vault_entries(user_id);

-- Index for category lookups
CREATE INDEX IF NOT EXISTS idx_vault_entries_category ON vault_entries(category);

-- Index for tags (GIN index for array operations)
CREATE INDEX IF NOT EXISTS idx_vault_entries_tags ON vault_entries USING GIN(tags);

-- Index for created_at for sorting
CREATE INDEX IF NOT EXISTS idx_vault_entries_created_at ON vault_entries(created_at);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_vault_entries_updated_at 
  BEFORE UPDATE ON vault_entries 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 