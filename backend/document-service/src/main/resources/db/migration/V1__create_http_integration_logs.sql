-- Create http_integration_logs table for tracking outbound HTTP calls
CREATE TABLE IF NOT EXISTS http_integration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(64) NOT NULL,
    request_method VARCHAR(16) NOT NULL,
    request_url TEXT NOT NULL,
    request_headers JSONB NULL,
    request_body TEXT NULL,
    response_status INT NULL,
    response_headers JSONB NULL,
    response_body TEXT NULL,
    duration_ms BIGINT NULL,
    error_message TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_http_integration_logs_service ON http_integration_logs(service_name);
CREATE INDEX IF NOT EXISTS idx_http_integration_logs_created_at ON http_integration_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_http_integration_logs_status ON http_integration_logs(response_status);
CREATE INDEX IF NOT EXISTS idx_http_integration_logs_url ON http_integration_logs(request_url);
