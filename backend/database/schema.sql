-- FrameworkGuard AI Database Schema for Supabase
-- Run this in Supabase SQL Editor

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  company_name TEXT,
  password_hash TEXT,
  api_key TEXT UNIQUE DEFAULT ('fg_' || replace(gen_random_uuid()::text, '-', '')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  exception_class TEXT,
  message TEXT,
  stack_trace TEXT,
  risk_score INTEGER,
  status TEXT DEFAULT 'received',
  analysis JSONB,
  heap_used_mb FLOAT,
  thread_count INTEGER,
  timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Metrics table
CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  heap_used_mb FLOAT,
  heap_max_mb FLOAT,
  heap_used_percent FLOAT GENERATED ALWAYS AS (
    CASE WHEN heap_max_mb > 0 THEN (heap_used_mb / heap_max_mb) * 100 ELSE 0 END
  ) STORED,
  thread_count INTEGER,
  gc_count BIGINT,
  jvm_uptime_ms BIGINT,
  timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_incidents_customer_id ON incidents(customer_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_customer_id ON metrics(customer_id);
CREATE INDEX IF NOT EXISTS idx_metrics_created_at ON metrics(created_at DESC);

-- Enable Row Level Security
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for incidents
CREATE POLICY "Users can view own incidents" ON incidents
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Users can update own incidents" ON incidents
  FOR UPDATE USING (customer_id = auth.uid());

CREATE POLICY "Service role can insert incidents" ON incidents
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can select all incidents" ON incidents
  FOR SELECT TO service_role USING (true);

-- RLS Policies for metrics
CREATE POLICY "Users can view own metrics" ON metrics
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Service role can insert metrics" ON metrics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can select all metrics" ON metrics
  FOR SELECT TO service_role USING (true);

-- Grant permissions
GRANT ALL ON customers TO service_role;
GRANT ALL ON incidents TO service_role;
GRANT ALL ON metrics TO service_role;
