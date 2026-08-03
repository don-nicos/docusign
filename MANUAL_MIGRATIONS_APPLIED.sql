-- ============================================================================
-- MIGRACIONES MANUALES APLICADAS DURANTE SESIÓN DE DEBUGGING
-- Fecha: 2025-12-19
-- ============================================================================
-- IMPORTANTE: Estas migraciones fueron aplicadas manualmente para resolver
-- problemas durante el desarrollo. Se deben incorporar a Flyway para ambientes
-- productivos.
-- ============================================================================

-- ============================================================================
-- SIGNATURE SERVICE - Tablas principales
-- ============================================================================

-- Tabla: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(64) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(64) NOT NULL,
    actor_id UUID NULL,
    ip VARCHAR(64) NULL,
    user_agent VARCHAR(512) NULL,
    metadata JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Tabla: signature_requests
CREATE TABLE IF NOT EXISTS signature_requests (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL,
    owner_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'EXPIRED')),
    expires_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    document_hash VARCHAR(64) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signature_requests_document_id ON signature_requests(document_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_owner_id ON signature_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_status ON signature_requests(status);

-- Tabla: signers
CREATE TABLE IF NOT EXISTS signers (
    id UUID PRIMARY KEY,
    signature_request_id UUID NOT NULL REFERENCES signature_requests(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    order_index INT NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('PENDING', 'SIGNED', 'REJECTED')),
    otp_code VARCHAR(16) NULL,
    otp_expires_at TIMESTAMPTZ NULL,
    otp_last_sent_at TIMESTAMPTZ NULL,
    signed_at TIMESTAMPTZ NULL,
    signature_image_path VARCHAR(500) NULL,
    signature_position_x DOUBLE PRECISION NULL,
    signature_position_y DOUBLE PRECISION NULL,
    signature_page INT NULL,
    signature_width DOUBLE PRECISION NULL,
    signature_height DOUBLE PRECISION NULL,
    rejection_reason VARCHAR(255) NULL,
    signer_ip_address VARCHAR(64) NULL,
    authentication_method VARCHAR(32) NULL,
    signer_user_agent VARCHAR(500) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signers_email ON signers(email);
CREATE INDEX IF NOT EXISTS idx_signers_status ON signers(status);

-- Tabla: signature_positions
CREATE TABLE IF NOT EXISTS signature_positions (
    id UUID PRIMARY KEY,
    signer_id UUID NOT NULL REFERENCES signers(id) ON DELETE CASCADE,
    page_number INT NOT NULL,
    position_x DOUBLE PRECISION NOT NULL,
    position_y DOUBLE PRECISION NOT NULL,
    width DOUBLE PRECISION NOT NULL DEFAULT 200.0,
    height DOUBLE PRECISION NOT NULL DEFAULT 80.0,
    label VARCHAR(255) NULL
);

CREATE INDEX IF NOT EXISTS idx_signature_positions_signer_id ON signature_positions(signer_id);

-- ============================================================================
-- SIGNATURE SERVICE - Columnas adicionales
-- ============================================================================

-- Columnas adicionales para signature_requests
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMP;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS auto_reminders_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS is_organization_request BOOLEAN DEFAULT false;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS trace_id VARCHAR(36);
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS pdf_viewer_width INTEGER;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS signed_pdf_path VARCHAR(512);

CREATE INDEX IF NOT EXISTS idx_signature_requests_organization_id ON signature_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_trace_id ON signature_requests(trace_id);

-- Columnas adicionales para signers
ALTER TABLE signers ADD COLUMN IF NOT EXISTS rut VARCHAR(20);
ALTER TABLE signers ADD COLUMN IF NOT EXISTS rut_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE signers ADD COLUMN IF NOT EXISTS trace_id VARCHAR(36);

CREATE INDEX IF NOT EXISTS idx_signers_rut ON signers(rut);

-- ============================================================================
-- SIGNATURE SERVICE - Tabla de versiones de PDF
-- ============================================================================

CREATE TABLE IF NOT EXISTS pdf_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signature_request_id UUID NOT NULL REFERENCES signature_requests(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    document_hash VARCHAR(64) NOT NULL,
    signed_by VARCHAR(200),
    signer_id UUID,
    signatures_count INT NOT NULL DEFAULT 0,
    total_signers INT NOT NULL DEFAULT 0,
    is_final BOOLEAN NOT NULL DEFAULT FALSE,
    has_certificate BOOLEAN NOT NULL DEFAULT FALSE,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pdf_versions_request ON pdf_versions(signature_request_id);
CREATE INDEX IF NOT EXISTS idx_pdf_versions_number ON pdf_versions(version_number);
CREATE INDEX IF NOT EXISTS idx_pdf_versions_final ON pdf_versions(is_final);

COMMENT ON TABLE pdf_versions IS 'Historial de versiones de PDFs firmados. Cada firma genera una nueva versión.';
COMMENT ON COLUMN pdf_versions.version_number IS 'Número de versión (0=original, 1=primera firma, etc.)';
COMMENT ON COLUMN pdf_versions.document_hash IS 'Hash SHA-256 de esta versión del PDF';
COMMENT ON COLUMN pdf_versions.signed_by IS 'Nombre del firmante que generó esta versión';
COMMENT ON COLUMN pdf_versions.is_final IS 'TRUE si es la versión final con todas las firmas';
COMMENT ON COLUMN pdf_versions.has_certificate IS 'TRUE si incluye certificado de auditoría';

-- ============================================================================
-- DATA FIXES - Desbloquear documentos
-- ============================================================================

-- Desbloquear documentos que quedaron en estado LOCKED después de errores
-- UPDATE documents SET status = 'DRAFT', updated_at = NOW() 
-- WHERE status = 'LOCKED';

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
-- 1. Estas migraciones se aplicaron manualmente durante debugging
-- 2. Para ambientes nuevos, estas deben estar en scripts de Flyway
-- 3. Los scripts de Flyway existentes pueden tener conflictos de versión
-- 4. Revisar que todas las tablas estén en los scripts de migración de Flyway
-- 5. Configuraciones importantes:
--    - spring.flyway.table=flyway_schema_history_signature (para signature-service)
--    - spring.flyway.table=flyway_schema_history_document (para document-service)
--    - spring.flyway.table=flyway_schema_history_auth (para auth-service)
-- ============================================================================
