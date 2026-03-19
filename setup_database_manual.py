#!/usr/bin/env python3
"""
FrameworkGuard AI Database Setup via RPC functions
Creates required tables using RPC approach
"""

import sys
from supabase import create_client
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Supabase credentials
SUPABASE_URL = "https://rwvrwrtwihglxmhdhlez.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3dnJ3cnR3aWhnbHhtaGRobGV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkzOTIwMiwiZXhwIjoyMDg5NTE1MjAyfQ.UezWiOWd3jcpgmASYu7wzy97fEd1ViN45P8U6A3Succ"

def create_setup_function():
    """Create the RPC function that will set up our tables"""
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        
        # SQL function that creates all necessary tables
        setup_function_sql = """
        CREATE OR REPLACE FUNCTION setup_frameworkguard_tables()
        RETURNS TEXT AS $$
        BEGIN
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
            
            -- Create indices for better performance
            CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
            CREATE INDEX IF NOT EXISTS idx_customers_api_key ON customers(api_key);
            CREATE INDEX IF NOT EXISTS idx_incidents_customer_id ON incidents(customer_id);
            CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
            CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_metrics_customer_id ON metrics(customer_id);
            CREATE INDEX IF NOT EXISTS idx_metrics_created_at ON metrics(created_at DESC);
            
            RETURN 'Tables created successfully';
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        """
        
        # Execute the function creation via a manual query
        # We'll use a different approach - use curl to directly create the function
        import subprocess
        import json
        
        # Save the SQL to a temp file and execute with curl
        with open('/tmp/setup_function.sql', 'w') as f:
            f.write(setup_function_sql)
        
        # Use curl to execute the SQL via Supabase
        curl_command = [
            'curl', '-X', 'POST',
            f'{SUPABASE_URL}/rest/v1/rpc/exec_sql',
            '-H', f'Authorization: Bearer {SUPABASE_SERVICE_KEY}',
            '-H', 'Content-Type: application/json',
            '--data', json.dumps({'query': setup_function_sql})
        ]
        
        logger.info("Creating setup function via direct SQL execution...")
        # Actually, let's try a simpler approach - use the SQL editor simulation
        
        # Let me try to just execute individual table creation using raw psycopg2-style approach
        return create_tables_directly()
        
    except Exception as e:
        logger.error(f"❌ Error creating setup function: {str(e)}")
        return False

def create_tables_directly():
    """Create tables by trying to insert and letting constraints/table creation fail gracefully"""
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        
        logger.info("Attempting table creation through INSERT operations...")
        
        # Try to create a test customer - this will fail but might help us understand the exact schema needed
        try:
            test_customer = {
                'id': 'test-uuid-123',
                'email': 'test@example.com',
                'company_name': 'Test Company',
                'password_hash': 'hashed_password',
                'api_key': 'test_key_123',
            }
            
            result = supabase.table('customers').insert(test_customer).execute()
            logger.info("✅ Customers table exists or was created")
            
        except Exception as e:
            logger.info(f"Customers table issue: {str(e)}")
        
        # For now, let's report the current state and provide a manual solution
        return False
        
    except Exception as e:
        logger.error(f"❌ Error in direct table creation: {str(e)}")
        return False

def main():
    logger.info("🚀 FrameworkGuard AI Database Setup")
    logger.info("❌ CRITICAL: Supabase tables need to be created manually")
    logger.info("")
    logger.info("Please follow these steps to create the required tables:")
    logger.info("1. Go to https://app.supabase.com/project/rwvrwrtwihglxmhdhlez")
    logger.info("2. Navigate to SQL Editor")
    logger.info("3. Run the following SQL commands:")
    logger.info("")
    
    sql_commands = """
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

-- Create helpful indices
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_api_key ON customers(api_key);  
CREATE INDEX IF NOT EXISTS idx_incidents_customer_id ON incidents(customer_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_customer_id ON metrics(customer_id);
CREATE INDEX IF NOT EXISTS idx_metrics_created_at ON metrics(created_at DESC);
"""
    
    print(sql_commands)
    logger.info("")
    logger.info("4. After running the SQL, restart the backend service:")
    logger.info("   sudo supervisorctl restart backend")
    logger.info("")
    logger.info("5. Then re-run the backend test:")
    logger.info("   python /app/backend_test.py")
    
    return 1  # Return error code to indicate manual intervention needed

if __name__ == "__main__":
    sys.exit(main())