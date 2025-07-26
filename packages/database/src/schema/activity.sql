-- Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

-- Index for action lookups
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

-- Index for success status
CREATE INDEX IF NOT EXISTS idx_activity_logs_success ON activity_logs(success);

-- Index for created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- Index for IP address for security analysis
CREATE INDEX IF NOT EXISTS idx_activity_logs_ip_address ON activity_logs(ip_address); 