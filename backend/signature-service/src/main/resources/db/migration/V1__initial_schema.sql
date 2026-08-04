-- =============================================================================
-- SIGNATURE SERVICE - INITIAL SCHEMA
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLA: signature_requests
-- =============================================================================
CREATE TABLE IF NOT EXISTS signature_requests (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    document_id UUID NOT NULL,
    owner_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    status VARCHAR(32) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    document_hash VARCHAR(64),
    signed_pdf_path VARCHAR(500),
    pdf_viewer_width INTEGER,
    trace_id VARCHAR(36),
    organization_id UUID,
    is_organization_request BOOLEAN DEFAULT FALSE NOT NULL,
    magic_link_expiration_days INTEGER DEFAULT 7 NOT NULL,
    last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
    reminder_count INTEGER DEFAULT 0 NOT NULL,
    auto_reminders_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT signature_requests_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_signature_requests_document_id ON signature_requests(document_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_owner_id ON signature_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_status ON signature_requests(status);

-- =============================================================================
-- TABLA: signers
-- =============================================================================
CREATE TABLE IF NOT EXISTS signers (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    signature_request_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    order_index INTEGER DEFAULT 0 NOT NULL,
    status VARCHAR(32) NOT NULL,
    otp_code VARCHAR(16),
    otp_expires_at TIMESTAMP WITH TIME ZONE,
    otp_last_sent_at TIMESTAMP WITH TIME ZONE,
    signed_at TIMESTAMP WITH TIME ZONE,
    signature_image_path VARCHAR(500),
    signature_position_x DOUBLE PRECISION,
    signature_position_y DOUBLE PRECISION,
    signature_page INTEGER,
    signature_width DOUBLE PRECISION,
    signature_height DOUBLE PRECISION,
    rejection_reason VARCHAR(255),
    signer_ip_address VARCHAR(64),
    authentication_method VARCHAR(32),
    signer_user_agent VARCHAR(500),
    rut VARCHAR(20),
    rut_verified BOOLEAN DEFAULT FALSE NOT NULL,
    trace_id VARCHAR(36),
    access_token VARCHAR(64),
    access_token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT signers_pkey PRIMARY KEY (id),
    CONSTRAINT signers_signature_request_id_fkey FOREIGN KEY (signature_request_id) REFERENCES signature_requests(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_signers_signature_request_id ON signers(signature_request_id);
CREATE INDEX IF NOT EXISTS idx_signers_email ON signers(email);
CREATE INDEX IF NOT EXISTS idx_signers_status ON signers(status);

-- =============================================================================
-- TABLA: signature_positions
-- =============================================================================
CREATE TABLE IF NOT EXISTS signature_positions (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    signer_id UUID NOT NULL,
    page_number INTEGER NOT NULL,
    position_x DOUBLE PRECISION NOT NULL,
    position_y DOUBLE PRECISION NOT NULL,
    width DOUBLE PRECISION NOT NULL,
    height DOUBLE PRECISION NOT NULL,
    label VARCHAR(255),
    CONSTRAINT signature_positions_pkey PRIMARY KEY (id),
    CONSTRAINT signature_positions_signer_id_fkey FOREIGN KEY (signer_id) REFERENCES signers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_signature_positions_signer_id ON signature_positions(signer_id);

-- =============================================================================
-- TABLA: pdf_versions
-- =============================================================================
CREATE TABLE IF NOT EXISTS pdf_versions (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    signature_request_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    document_hash VARCHAR(64) NOT NULL,
    signed_by VARCHAR(200),
    signer_id UUID,
    signatures_count INTEGER DEFAULT 0 NOT NULL,
    total_signers INTEGER DEFAULT 0 NOT NULL,
    is_final BOOLEAN DEFAULT FALSE NOT NULL,
    has_certificate BOOLEAN DEFAULT FALSE NOT NULL,
    file_size_bytes BIGINT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pdf_versions_pkey PRIMARY KEY (id),
    CONSTRAINT pdf_versions_signature_request_id_fkey FOREIGN KEY (signature_request_id) REFERENCES signature_requests(id) ON DELETE CASCADE,
    CONSTRAINT pdf_versions_signer_id_fkey FOREIGN KEY (signer_id) REFERENCES signers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pdf_versions_signature_request_id ON pdf_versions(signature_request_id);
CREATE INDEX IF NOT EXISTS idx_pdf_versions_version_number ON pdf_versions(signature_request_id, version_number);

-- =============================================================================
-- TABLA: reminder_tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS reminder_tracking (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    signer_id UUID NOT NULL,
    reminder_count INTEGER DEFAULT 0 NOT NULL,
    last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT reminder_tracking_pkey PRIMARY KEY (id),
    CONSTRAINT reminder_tracking_signer_id_fkey FOREIGN KEY (signer_id) REFERENCES signers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reminder_tracking_signer_id ON reminder_tracking(signer_id);
CREATE INDEX IF NOT EXISTS idx_reminder_tracking_last_sent ON reminder_tracking(last_reminder_sent_at);

-- =============================================================================
-- TABLA: user_signatures
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_signatures (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    user_id UUID NOT NULL,
    signature_image_path VARCHAR(500) NOT NULL,
    name VARCHAR(100),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT user_signatures_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_user_signatures_user_id ON user_signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_user_signatures_created_at ON user_signatures(created_at);

-- =============================================================================
-- TABLA: audit_logs
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(64) NOT NULL,
    actor_id UUID,
    ip VARCHAR(64),
    user_agent VARCHAR(512),
    metadata JSONB,
    trace_id VARCHAR(36),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type_entity_id ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_trace_id ON audit_logs(trace_id);

-- =============================================================================
-- TABLA: http_integration_logs
-- =============================================================================
CREATE TABLE IF NOT EXISTS http_integration_logs (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    service_name VARCHAR(100),
    request_method VARCHAR(10),
    request_url TEXT,
    request_headers TEXT,
    request_body TEXT,
    response_status INTEGER,
    response_headers TEXT,
    response_body TEXT,
    duration_ms BIGINT,
    error_message TEXT,
    trace_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT http_integration_logs_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_http_integration_logs_service ON http_integration_logs(service_name);
CREATE INDEX IF NOT EXISTS idx_http_integration_logs_url ON http_integration_logs(request_url);
CREATE INDEX IF NOT EXISTS idx_http_integration_logs_status ON http_integration_logs(response_status);
CREATE INDEX IF NOT EXISTS idx_http_integration_logs_created_at ON http_integration_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_http_integration_logs_trace_id ON http_integration_logs(trace_id);

-- =============================================================================
-- TABLA: shedlock
-- =============================================================================
CREATE TABLE IF NOT EXISTS shedlock (
    name VARCHAR(64) NOT NULL,
    lock_until TIMESTAMP NOT NULL,
    locked_at TIMESTAMP NOT NULL,
    locked_by VARCHAR(255) NOT NULL,
    CONSTRAINT shedlock_pkey PRIMARY KEY (name)
);

-- =============================================================================
-- FUNCIÓN: generate_user_id_from_email
-- =============================================================================
CREATE OR REPLACE FUNCTION generate_user_id_from_email(email_param TEXT)
RETURNS UUID AS $$
DECLARE
    namespace_uuid UUID := '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::UUID;
    normalized_email TEXT := LOWER(TRIM(email_param));
BEGIN
    RETURN uuid_generate_v5(namespace_uuid, normalized_email);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- DATOS INICIALES: Firmas de usuario de prueba
-- =============================================================================
INSERT INTO user_signatures (id, user_id, signature_image_path, name, is_default, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    generate_user_id_from_email('felipe.ibacache@docusing.cl'),
    'signatures/' || generate_user_id_from_email('felipe.ibacache@docusing.cl')::TEXT || '/firma_principal.png',
    'Firma Principal',
    TRUE,
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

INSERT INTO user_signatures (id, user_id, signature_image_path, name, is_default, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    generate_user_id_from_email('laura.rodriguez@empresa.cl'),
    'signatures/' || generate_user_id_from_email('laura.rodriguez@empresa.cl')::TEXT || '/mi_firma.png',
    'Mi Firma',
    TRUE,
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

INSERT INTO user_signatures (id, user_id, signature_image_path, name, is_default, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    generate_user_id_from_email('admin@docusing.cl'),
    'signatures/' || generate_user_id_from_email('admin@docusing.cl')::TEXT || '/firma_admin.png',
    'Firma Admin',
    TRUE,
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;
