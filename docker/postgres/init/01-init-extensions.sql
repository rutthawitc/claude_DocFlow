-- DocFlow Development Database Initialization
-- This script runs automatically when the database container starts for the first time

-- Create extensions commonly used in development
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Create additional schemas for development
CREATE SCHEMA IF NOT EXISTS development;
CREATE SCHEMA IF NOT EXISTS testing;

-- Set default search path
ALTER DATABASE docflow_db SET search_path = public, development;

-- Create a development user (optional)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'docflow_dev') THEN
        CREATE ROLE docflow_dev WITH LOGIN PASSWORD 'dev123';
        GRANT CONNECT ON DATABASE docflow_db TO docflow_dev;
        GRANT USAGE ON SCHEMA public TO docflow_dev;
        GRANT USAGE ON SCHEMA development TO docflow_dev;
        GRANT CREATE ON SCHEMA development TO docflow_dev;
    END IF;
END
$$;