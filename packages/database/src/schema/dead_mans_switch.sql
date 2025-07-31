-- Dead Man's Switch Schema Extensions
-- This migration adds the necessary tables and columns for dead man's switch functionality

-- Activity tracking table (enhanced version of activity_logs)
CREATE TABLE IF NOT EXISTS activity_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  client_type VARCHAR(20) NOT NULL DEFAULT 'web',
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  signature VARCHAR(128) NOT NULL, -- HMAC for integrity verification
  created_at TIMESTAMP DEFAULT NOW()
);

-- Inactivity settings per user
CREATE TABLE IF NOT EXISTS inactivity_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  threshold_days INTEGER NOT NULL DEFAULT 90 CHECK (threshold_days >= 30 AND threshold_days <= 365),
  notification_methods TEXT[] NOT NULL DEFAULT ARRAY['email'],
  emergency_contacts JSONB DEFAULT '[]'::jsonb,
  is_paused BOOLEAN DEFAULT FALSE,
  pause_reason TEXT,
  paused_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Handover processes (enhanced version of handover_events)
CREATE TABLE IF NOT EXISTS handover_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'GRACE_PERIOD',
  initiated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  grace_period_ends TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Notification delivery tracking
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  handover_process_id UUID REFERENCES handover_processes(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  method VARCHAR(20) NOT NULL,
  recipient TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  delivered_at TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Check-in tokens for secure links
CREATE TABLE IF NOT EXISTS checkin_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Successor notifications for handover processes
CREATE TABLE IF NOT EXISTS successor_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_process_id UUID REFERENCES handover_processes(id) ON DELETE CASCADE,
  successor_id UUID REFERENCES successors(id) ON DELETE CASCADE,
  notified_at TIMESTAMP DEFAULT NOW(),
  verification_status VARCHAR(20) DEFAULT 'PENDING',
  verified_at TIMESTAMP,
  response_deadline TIMESTAMP NOT NULL,
  verification_token VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- System status tracking for downtime handling
CREATE TABLE IF NOT EXISTS system_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(20) NOT NULL DEFAULT 'OPERATIONAL',
  downtime_start TIMESTAMP,
  downtime_end TIMESTAMP,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes for activity_records
CREATE INDEX IF NOT EXISTS idx_activity_records_user_id_created_at 
  ON activity_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_records_created_at 
  ON activity_records(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_records_activity_type 
  ON activity_records(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_records_signature 
  ON activity_records(signature);

-- Performance indexes for inactivity_settings
CREATE INDEX IF NOT EXISTS idx_inactivity_settings_is_paused 
  ON inactivity_settings(is_paused);
CREATE INDEX IF NOT EXISTS idx_inactivity_settings_paused_until 
  ON inactivity_settings(paused_until) WHERE paused_until IS NOT NULL;

-- Performance indexes for handover_processes
CREATE INDEX IF NOT EXISTS idx_handover_processes_user_id 
  ON handover_processes(user_id);
CREATE INDEX IF NOT EXISTS idx_handover_processes_status 
  ON handover_processes(status);
CREATE INDEX IF NOT EXISTS idx_handover_processes_grace_period_ends 
  ON handover_processes(grace_period_ends);
CREATE INDEX IF NOT EXISTS idx_handover_processes_initiated_at 
  ON handover_processes(initiated_at);

-- Performance indexes for notification_deliveries
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user_id 
  ON notification_deliveries(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status 
  ON notification_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_handover_process_id 
  ON notification_deliveries(handover_process_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_created_at 
  ON notification_deliveries(created_at);

-- Performance indexes for checkin_tokens
CREATE INDEX IF NOT EXISTS idx_checkin_tokens_token_hash 
  ON checkin_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_checkin_tokens_expires_at 
  ON checkin_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_checkin_tokens_user_id 
  ON checkin_tokens(user_id);

-- Performance indexes for successor_notifications
CREATE INDEX IF NOT EXISTS idx_successor_notifications_handover_process_id 
  ON successor_notifications(handover_process_id);
CREATE INDEX IF NOT EXISTS idx_successor_notifications_successor_id 
  ON successor_notifications(successor_id);
CREATE INDEX IF NOT EXISTS idx_successor_notifications_verification_status 
  ON successor_notifications(verification_status);
CREATE INDEX IF NOT EXISTS idx_successor_notifications_response_deadline 
  ON successor_notifications(response_deadline);

-- Performance indexes for system_status
CREATE INDEX IF NOT EXISTS idx_system_status_status 
  ON system_status(status);
CREATE INDEX IF NOT EXISTS idx_system_status_created_at 
  ON system_status(created_at);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inactivity_settings_updated_at 
  BEFORE UPDATE ON inactivity_settings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_handover_processes_updated_at 
  BEFORE UPDATE ON handover_processes 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default inactivity settings for existing users
INSERT INTO inactivity_settings (user_id, threshold_days, notification_methods)
SELECT id, 90, ARRAY['email']
FROM users 
WHERE id NOT IN (SELECT user_id FROM inactivity_settings)
ON CONFLICT (user_id) DO NOTHING;

-- Create initial system status entry
INSERT INTO system_status (status, reason) 
VALUES ('OPERATIONAL', 'Initial system setup')
ON CONFLICT DO NOTHING;