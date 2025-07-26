-- Handover events
CREATE TABLE IF NOT EXISTS handover_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  triggered_at TIMESTAMP,
  completed_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_handover_events_user_id ON handover_events(user_id);

-- Index for event_type lookups
CREATE INDEX IF NOT EXISTS idx_handover_events_event_type ON handover_events(event_type);

-- Index for status lookups
CREATE INDEX IF NOT EXISTS idx_handover_events_status ON handover_events(status);

-- Index for triggered_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_handover_events_triggered_at ON handover_events(triggered_at);

-- Index for created_at for sorting
CREATE INDEX IF NOT EXISTS idx_handover_events_created_at ON handover_events(created_at);

-- Composite index for user and status
CREATE INDEX IF NOT EXISTS idx_handover_events_user_status 
  ON handover_events(user_id, status); 