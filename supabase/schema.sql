-- ============================================
-- Supabase Database Schema for Salesforce RCA Configuration Tool
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Connections Table
-- ============================================
CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    instance_url VARCHAR(500) NOT NULL,
    org_id VARCHAR(18),
    org_type VARCHAR(50) CHECK (org_type IN ('production', 'sandbox', 'developer')),
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    connected_app_consumer_key VARCHAR(255),
    connected_app_consumer_secret_encrypted TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'error')),
    last_connected TIMESTAMP WITH TIME ZONE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX idx_connections_user_id ON connections(user_id);

-- ============================================
-- Pipeline Configurations Table
-- ============================================
CREATE TABLE IF NOT EXISTS pipeline_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) DEFAULT '1.0',
    is_default BOOLEAN DEFAULT FALSE,
    config JSONB NOT NULL, -- Stores the full pipeline configuration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pipeline_configs_user_id ON pipeline_configs(user_id);

-- ============================================
-- Deployments Table
-- ============================================
CREATE TABLE IF NOT EXISTS deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    pipeline_config_id UUID REFERENCES pipeline_configs(id),
    template_file_name VARCHAR(500) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'rolled_back', 'validation_only')),
    mode VARCHAR(50) DEFAULT 'full' CHECK (mode IN ('full', 'incremental', 'validation_only')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    summary JSONB DEFAULT '{}',
    error_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_deployments_user_id ON deployments(user_id);
CREATE INDEX idx_deployments_connection_id ON deployments(connection_id);
CREATE INDEX idx_deployments_status ON deployments(status);

-- ============================================
-- Deployment Details Table
-- ============================================
CREATE TABLE IF NOT EXISTS deployment_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deployment_id UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
    step_id VARCHAR(100) NOT NULL,
    step_order INTEGER NOT NULL,
    object_type VARCHAR(100) NOT NULL,
    object_name VARCHAR(255),
    object_identifier VARCHAR(255), -- Code or unique identifier from Excel
    salesforce_id VARCHAR(18), -- Created Salesforce ID
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'success', 'failed', 'skipped')),
    error_message TEXT,
    error_code VARCHAR(100),
    request_payload JSONB,
    response_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_deployment_details_deployment_id ON deployment_details(deployment_id);
CREATE INDEX idx_deployment_details_step_id ON deployment_details(step_id);
CREATE INDEX idx_deployment_details_status ON deployment_details(status);

-- ============================================
-- Deployment Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS deployment_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deployment_id UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    level VARCHAR(20) DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warning', 'error')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_deployment_logs_deployment_id ON deployment_logs(deployment_id);
CREATE INDEX idx_deployment_logs_level ON deployment_logs(level);

-- ============================================
-- ID Mappings Table (for tracking created IDs during deployment)
-- ============================================
CREATE TABLE IF NOT EXISTS deployment_id_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deployment_id UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
    step_id VARCHAR(100) NOT NULL,
    lookup_field VARCHAR(100) NOT NULL,
    lookup_value VARCHAR(500) NOT NULL,
    salesforce_id VARCHAR(18) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(deployment_id, step_id, lookup_value)
);

CREATE INDEX idx_id_mappings_deployment_id ON deployment_id_mappings(deployment_id);
CREATE INDEX idx_id_mappings_lookup ON deployment_id_mappings(deployment_id, step_id, lookup_value);

-- ============================================
-- User Settings Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    api_version VARCHAR(10) DEFAULT '59.0',
    batch_size INTEGER DEFAULT 200,
    max_retries INTEGER DEFAULT 3,
    session_timeout INTEGER DEFAULT 1800, -- seconds
    logging_level VARCHAR(20) DEFAULT 'info',
    auto_refresh_tokens BOOLEAN DEFAULT TRUE,
    deployment_mode VARCHAR(50) DEFAULT 'continue_on_errors',
    theme VARCHAR(20) DEFAULT 'light',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_id_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Connections policies
CREATE POLICY "Users can view own connections" ON connections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own connections" ON connections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections" ON connections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections" ON connections
    FOR DELETE USING (auth.uid() = user_id);

-- Pipeline configs policies
CREATE POLICY "Users can view own pipeline configs" ON pipeline_configs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own pipeline configs" ON pipeline_configs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pipeline configs" ON pipeline_configs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pipeline configs" ON pipeline_configs
    FOR DELETE USING (auth.uid() = user_id);

-- Deployments policies
CREATE POLICY "Users can view own deployments" ON deployments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own deployments" ON deployments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deployments" ON deployments
    FOR UPDATE USING (auth.uid() = user_id);

-- Deployment details policies (via deployment ownership)
CREATE POLICY "Users can view own deployment details" ON deployment_details
    FOR SELECT USING (
        deployment_id IN (SELECT id FROM deployments WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create own deployment details" ON deployment_details
    FOR INSERT WITH CHECK (
        deployment_id IN (SELECT id FROM deployments WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update own deployment details" ON deployment_details
    FOR UPDATE USING (
        deployment_id IN (SELECT id FROM deployments WHERE user_id = auth.uid())
    );

-- Deployment logs policies
CREATE POLICY "Users can view own deployment logs" ON deployment_logs
    FOR SELECT USING (
        deployment_id IN (SELECT id FROM deployments WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create own deployment logs" ON deployment_logs
    FOR INSERT WITH CHECK (
        deployment_id IN (SELECT id FROM deployments WHERE user_id = auth.uid())
    );

-- ID mappings policies
CREATE POLICY "Users can view own id mappings" ON deployment_id_mappings
    FOR SELECT USING (
        deployment_id IN (SELECT id FROM deployments WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create own id mappings" ON deployment_id_mappings
    FOR INSERT WITH CHECK (
        deployment_id IN (SELECT id FROM deployments WHERE user_id = auth.uid())
    );

-- User settings policies
CREATE POLICY "Users can view own settings" ON user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own settings" ON user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- Functions & Triggers
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_connections_updated_at
    BEFORE UPDATE ON connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipeline_configs_updated_at
    BEFORE UPDATE ON pipeline_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to ensure only one default connection per user
CREATE OR REPLACE FUNCTION ensure_single_default_connection()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = TRUE THEN
        UPDATE connections
        SET is_default = FALSE
        WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_connection_trigger
    BEFORE INSERT OR UPDATE ON connections
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_connection();

-- Function to create default settings for new users
CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger should be created in Supabase dashboard
-- CREATE TRIGGER create_default_settings_on_signup
--     AFTER INSERT ON auth.users
--     FOR EACH ROW
--     EXECUTE FUNCTION create_default_user_settings();
