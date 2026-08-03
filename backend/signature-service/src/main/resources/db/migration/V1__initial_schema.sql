-- =============================================================================
-- SIGNATURE SERVICE - INITIAL SCHEMA
-- =============================================================================
-- Esquema consolidado con la última versión de todas las tablas
-- Incluye datos de prueba con userId determinístico

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLA: signature_requests
-- =============================================================================
CREATE TABLE IF NOT EXISTS signature_requests (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    owner_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    document_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    document_hash VARCHAR(64),
    viewer_width INTEGER,
    signed_pdf_path VARCHAR(500),
    magic_link_expiration_days INTEGER DEFAULT 7,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT signature_requests_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_signature_requests_owner_id ON signature_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_status ON signature_requests(status);
CREATE INDEX IF NOT EXISTS idx_signature_requests_document_id ON signature_requests(document_id);

-- =============================================================================
-- TABLA: signers
-- =============================================================================
CREATE TABLE IF NOT EXISTS signers (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    signature_request_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    rut VARCHAR(20),
    rut_is_verified BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) NOT NULL,
    turn_order INTEGER NOT NULL,
    signature_image_path VARCHAR(500),
    signed_at TIMESTAMP WITH TIME ZONE,
    access_token VARCHAR(500),
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
    page INTEGER NOT NULL,
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    width DOUBLE PRECISION NOT NULL,
    height DOUBLE PRECISION NOT NULL,
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
    pdf_path VARCHAR(500) NOT NULL,
    created_by_signer_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pdf_versions_pkey PRIMARY KEY (id),
    CONSTRAINT pdf_versions_signature_request_id_fkey FOREIGN KEY (signature_request_id) REFERENCES signature_requests(id) ON DELETE CASCADE,
    CONSTRAINT pdf_versions_created_by_signer_id_fkey FOREIGN KEY (created_by_signer_id) REFERENCES signers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pdf_versions_signature_request_id ON pdf_versions(signature_request_id);
CREATE INDEX IF NOT EXISTS idx_pdf_versions_version_number ON pdf_versions(signature_request_id, version_number);

-- =============================================================================
-- TABLA: reminder_tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS reminder_tracking (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    signature_request_id UUID NOT NULL,
    signer_id UUID,
    reminder_type VARCHAR(50) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT reminder_tracking_pkey PRIMARY KEY (id),
    CONSTRAINT reminder_tracking_signature_request_id_fkey FOREIGN KEY (signature_request_id) REFERENCES signature_requests(id) ON DELETE CASCADE,
    CONSTRAINT reminder_tracking_signer_id_fkey FOREIGN KEY (signer_id) REFERENCES signers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reminder_tracking_signature_request_id ON reminder_tracking(signature_request_id);
CREATE INDEX IF NOT EXISTS idx_reminder_tracking_signer_id ON reminder_tracking(signer_id);

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
CREATE INDEX IF NOT EXISTS idx_user_signatures_user_default ON user_signatures(user_id, is_default) WHERE is_default = TRUE;

-- =============================================================================
-- TABLA: audit_logs
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    actor_id UUID,
    metadata_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

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
-- TABLA: shedlock (para scheduled tasks)
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
-- Genera un UUID determinístico a partir de un email
-- IMPORTANTE: Debe usar el MISMO algoritmo que auth-service
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

-- Firma de Felipe Ibacache
INSERT INTO user_signatures (id, user_id, signature_image_path, name, is_default, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    generate_user_id_from_email('felipe.ibacache@docusing.cl'),
    'signatures/' || generate_user_id_from_email('felipe.ibacache@docusing.cl')::TEXT || '/firma_principal.png',
    'Firma Principal',
    TRUE,
    NOW(),
    NOW()
);

-- Firma de Laura Rodríguez
INSERT INTO user_signatures (id, user_id, signature_image_path, name, is_default, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    generate_user_id_from_email('laura.rodriguez@empresa.cl'),
    'signatures/' || generate_user_id_from_email('laura.rodriguez@empresa.cl')::TEXT || '/mi_firma.png',
    'Mi Firma',
    TRUE,
    NOW(),
    NOW()
);

-- Firma de Admin
INSERT INTO user_signatures (id, user_id, signature_image_path, name, is_default, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    generate_user_id_from_email('admin@docusing.cl'),
    'signatures/' || generate_user_id_from_email('admin@docusing.cl')::TEXT || '/firma_admin.png',
    'Firma Admin',
    TRUE,
    NOW(),
    NOW()
);

-- =============================================================================
-- FIN DEL ESQUEMA SIGNATURE SERVICE
-- =============================================================================
-- 
-- Usuarios de prueba (definidos en auth-service):
-- felipe.ibacache@docusing.cl / password123
-- laura.rodriguez@empresa.cl / password123
-- admin@docusing.cl / admin123
-- test@docusing.cl / test123
--
-- Todos los userId se generan determinísticamente desde el email
-- usando el mismo algoritmo que auth-service
-- =============================================================================
