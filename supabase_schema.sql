-- FrameworkGuard AI Database Schema
-- Run this SQL in Supabase SQL Editor

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create incidents table  
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    exception_class VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    stack_trace TEXT NOT NULL,
    heap_used_mb DECIMAL NOT NULL,
    thread_count INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    risk_score INTEGER,
    analysis JSONB,
    status VARCHAR(50) DEFAULT 'received',
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create metrics table
CREATE TABLE IF NOT EXISTS metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    heap_used_mb DECIMAL NOT NULL,
    heap_max_mb DECIMAL NOT NULL,
    thread_count INTEGER NOT NULL,
    gc_count INTEGER NOT NULL,
    jvm_uptime_ms BIGINT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create helpful indices for better performance
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_api_key ON customers(api_key);  
CREATE INDEX IF NOT EXISTS idx_incidents_customer_id ON incidents(customer_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_customer_id ON metrics(customer_id);
CREATE INDEX IF NOT EXISTS idx_metrics_created_at ON metrics(created_at DESC);