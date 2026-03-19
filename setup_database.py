#!/usr/bin/env python3
"""
FrameworkGuard AI Supabase Database Setup
Creates required tables: customers, incidents, metrics
"""

import sys
from supabase import create_client
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Supabase credentials from .env
SUPABASE_URL = "https://rwvrwrtwihglxmhdhlez.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3dnJ3cnR3aWhnbHhtaGRobGV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkzOTIwMiwiZXhwIjoyMDg5NTE1MjAyfQ.UezWiOWd3jcpgmASYu7wzy97fEd1ViN45P8U6A3Succ"

def create_tables():
    """Create the required tables in Supabase"""
    try:
        # Initialize Supabase client with service role key
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        logger.info(f"Connected to Supabase: {SUPABASE_URL}")
        
        # SQL to create customers table
        customers_sql = """
        CREATE TABLE IF NOT EXISTS customers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            company_name VARCHAR(255) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            api_key VARCHAR(255) UNIQUE NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Create index on email for faster lookups
        CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
        
        -- Create index on api_key for faster lookups  
        CREATE INDEX IF NOT EXISTS idx_customers_api_key ON customers(api_key);
        """
        
        # SQL to create incidents table
        incidents_sql = """
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
        
        -- Create indices for better query performance
        CREATE INDEX IF NOT EXISTS idx_incidents_customer_id ON incidents(customer_id);
        CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
        CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);
        """
        
        # SQL to create metrics table
        metrics_sql = """
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
        
        -- Create indices for better query performance
        CREATE INDEX IF NOT EXISTS idx_metrics_customer_id ON metrics(customer_id);
        CREATE INDEX IF NOT EXISTS idx_metrics_created_at ON metrics(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp DESC);
        """
        
        # Execute SQL statements using RPC to run raw SQL
        logger.info("Creating customers table...")
        result = supabase.rpc('exec_sql', {'sql': customers_sql}).execute()
        logger.info("✅ Customers table created successfully")
        
        logger.info("Creating incidents table...")
        result = supabase.rpc('exec_sql', {'sql': incidents_sql}).execute()
        logger.info("✅ Incidents table created successfully")
        
        logger.info("Creating metrics table...")
        result = supabase.rpc('exec_sql', {'sql': metrics_sql}).execute()
        logger.info("✅ Metrics table created successfully")
        
        logger.info("🎉 All tables created successfully!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error creating tables: {str(e)}")
        return False

def verify_tables():
    """Verify that tables exist by attempting simple queries"""
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        
        # Test customers table
        logger.info("Verifying customers table...")
        result = supabase.table('customers').select('id').limit(1).execute()
        logger.info("✅ Customers table verified")
        
        # Test incidents table
        logger.info("Verifying incidents table...")  
        result = supabase.table('incidents').select('id').limit(1).execute()
        logger.info("✅ Incidents table verified")
        
        # Test metrics table
        logger.info("Verifying metrics table...")
        result = supabase.table('metrics').select('id').limit(1).execute()
        logger.info("✅ Metrics table verified")
        
        logger.info("🎉 All tables verified successfully!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error verifying tables: {str(e)}")
        return False

def main():
    logger.info("🚀 Starting FrameworkGuard AI Database Setup")
    
    # First try to verify if tables already exist
    logger.info("Checking if tables already exist...")
    if verify_tables():
        logger.info("✅ Tables already exist and are accessible")
        return 0
    
    logger.info("Tables don't exist or are not accessible, creating them...")
    
    # Create tables
    if create_tables():
        logger.info("✅ Table creation completed")
        
        # Verify the creation worked
        if verify_tables():
            logger.info("🎉 Database setup completed successfully!")
            return 0
        else:
            logger.error("❌ Table verification failed after creation")
            return 1
    else:
        logger.error("❌ Table creation failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())