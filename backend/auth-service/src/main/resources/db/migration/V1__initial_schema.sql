-- =============================================================================
-- AUTH SERVICE - INITIAL SCHEMA
-- =============================================================================
-- Esquema consolidado con la última versión de todas las tablas
-- Incluye usuarios de prueba con userId determinístico

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- TABLA: users
-- =============================================================================
CREATE TABLE users (
    id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    rut VARCHAR(20),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    second_last_name VARCHAR(255),
    phone VARCHAR(20),
    address VARCHAR(500),
    birth_date DATE,
    default_organization_id UUID,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE UNIQUE INDEX idx_users_rut ON users(rut) WHERE rut IS NOT NULL;
CREATE INDEX idx_users_default_organization ON users(default_organization_id);

-- =============================================================================
-- TABLA: organizations
-- =============================================================================
CREATE TABLE organizations (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT organizations_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_organizations_status ON organizations(status);

-- =============================================================================
-- TABLA: user_organizations
-- =============================================================================
CREATE TABLE user_organizations (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    role VARCHAR(50) DEFAULT 'MEMBER' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT user_organizations_pkey PRIMARY KEY (id),
    CONSTRAINT user_organizations_user_id_organization_id_key UNIQUE (user_id, organization_id),
    CONSTRAINT user_organizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT user_organizations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX idx_user_organizations_organization_id ON user_organizations(organization_id);
CREATE INDEX idx_user_organizations_role ON user_organizations(role);

-- =============================================================================
-- TABLA: saved_signatures
-- =============================================================================
CREATE TABLE saved_signatures (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    user_id UUID NOT NULL,
    name VARCHAR(255),
    signature_data TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT saved_signatures_pkey PRIMARY KEY (id),
    CONSTRAINT saved_signatures_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_saved_signatures_user_id ON saved_signatures(user_id);
CREATE INDEX idx_saved_signatures_user_default ON saved_signatures(user_id, is_default) WHERE is_default = TRUE;

COMMENT ON TABLE saved_signatures IS 'Firmas digitales guardadas por los usuarios para reutilización';
COMMENT ON COLUMN saved_signatures.signature_data IS 'Imagen de la firma en formato Base64';
COMMENT ON COLUMN saved_signatures.is_default IS 'Indica si esta es la firma por defecto del usuario';

-- =============================================================================
-- TABLA: magic_link_tokens
-- =============================================================================
CREATE TABLE magic_link_tokens (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT magic_link_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT magic_link_tokens_token_key UNIQUE (token)
);

CREATE INDEX idx_magic_link_tokens_email ON magic_link_tokens(email);
CREATE INDEX idx_magic_link_tokens_token ON magic_link_tokens(token);

-- =============================================================================
-- TABLA: refresh_tokens
-- =============================================================================
CREATE TABLE refresh_tokens (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    user_id UUID NOT NULL,
    token VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT refresh_tokens_token_key UNIQUE (token),
    CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT http_integration_logs_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_http_integration_logs_service ON http_integration_logs(service_name);
CREATE INDEX IF NOT EXISTS idx_http_integration_logs_url ON http_integration_logs(request_url);
CREATE INDEX IF NOT EXISTS idx_http_integration_logs_status ON http_integration_logs(response_status);
CREATE INDEX IF NOT EXISTS idx_http_integration_logs_created_at ON http_integration_logs(created_at);

-- =============================================================================
-- FUNCIÓN: generate_user_id_from_email
-- =============================================================================
-- Genera un UUID determinístico a partir de un email
-- IMPORTANTE: Debe usar el MISMO algoritmo que signature-service
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
-- DATOS INICIALES: Usuarios de prueba
-- =============================================================================

-- Usuario 1: Felipe Ibacache (Admin/Owner)
INSERT INTO users (id, email, full_name, password_hash, first_name, last_name, phone, status, created_at, updated_at)
VALUES (
    generate_user_id_from_email('felipe.ibacache@docusing.cl'),
    'felipe.ibacache@docusing.cl',
    'Felipe Ibacache',
    crypt('password123', gen_salt('bf')),
    'Felipe',
    'Ibacache',
    '+56912345678',
    'ACTIVE',
    NOW(),
    NOW()
);

-- Usuario 2: Laura Rodríguez (Usuario normal/firmante)
INSERT INTO users (id, email, full_name, password_hash, first_name, last_name, phone, status, created_at, updated_at)
VALUES (
    generate_user_id_from_email('laura.rodriguez@empresa.cl'),
    'laura.rodriguez@empresa.cl',
    'Laura Rodríguez',
    crypt('password123', gen_salt('bf')),
    'Laura',
    'Rodríguez',
    '+56987654321',
    'ACTIVE',
    NOW(),
    NOW()
);

-- Usuario 3: Admin Docusing
INSERT INTO users (id, email, full_name, password_hash, first_name, last_name, status, created_at, updated_at)
VALUES (
    generate_user_id_from_email('admin@docusing.cl'),
    'admin@docusing.cl',
    'Admin Docusing',
    crypt('admin123', gen_salt('bf')),
    'Admin',
    'Docusing',
    'ACTIVE',
    NOW(),
    NOW()
);

-- Usuario 4: Usuario de prueba genérico
INSERT INTO users (id, email, full_name, password_hash, status, created_at, updated_at)
VALUES (
    generate_user_id_from_email('test@docusing.cl'),
    'test@docusing.cl',
    'Usuario Test',
    crypt('test123', gen_salt('bf')),
    'ACTIVE',
    NOW(),
    NOW()
);

-- =============================================================================
-- DATOS INICIALES: Organizaciones de prueba
-- =============================================================================

-- Organización 1: Docusing
INSERT INTO organizations (id, name, slug, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Docusing',
    'docusing',
    NOW(),
    NOW()
);

-- Organización 2: Empresa Demo
INSERT INTO organizations (id, name, slug, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Empresa Demo',
    'empresa-demo',
    NOW(),
    NOW()
);

-- =============================================================================
-- DATOS INICIALES: Relaciones user-organization
-- =============================================================================

-- Felipe es OWNER de Docusing
INSERT INTO user_organizations (id, user_id, organization_id, role, joined_at)
VALUES (
    gen_random_uuid(),
    generate_user_id_from_email('felipe.ibacache@docusing.cl'),
    (SELECT id FROM organizations WHERE slug = 'docusing'),
    'OWNER',
    NOW()
);

-- Admin es ADMIN de Docusing
INSERT INTO user_organizations (id, user_id, organization_id, role, joined_at)
VALUES (
    gen_random_uuid(),
    generate_user_id_from_email('admin@docusing.cl'),
    (SELECT id FROM organizations WHERE slug = 'docusing'),
    'ADMIN',
    NOW()
);

-- Laura es MEMBER de Empresa Demo
INSERT INTO user_organizations (id, user_id, organization_id, role, joined_at)
VALUES (
    gen_random_uuid(),
    generate_user_id_from_email('laura.rodriguez@empresa.cl'),
    (SELECT id FROM organizations WHERE slug = 'empresa-demo'),
    'MEMBER',
    NOW()
);

-- =============================================================================
-- DATOS INICIALES: Firmas guardadas de prueba
-- =============================================================================

-- Firma de Felipe
INSERT INTO saved_signatures (id, user_id, name, signature_data, is_default, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    generate_user_id_from_email('felipe.ibacache@docusing.cl'),
    'Firma Principal Felipe',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    TRUE,
    NOW(),
    NOW()
);

-- Firma de Laura
INSERT INTO saved_signatures (id, user_id, name, signature_data, is_default, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    generate_user_id_from_email('laura.rodriguez@empresa.cl'),
    'Mi Firma',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    TRUE,
    NOW(),
    NOW()
);

-- =============================================================================
-- FIN DEL ESQUEMA AUTH SERVICE
-- =============================================================================
-- 
-- Usuarios creados con contraseñas:
-- felipe.ibacache@docusing.cl / password123
-- laura.rodriguez@empresa.cl / password123
-- admin@docusing.cl / admin123
-- test@docusing.cl / test123
--
-- Todos los userId se generan determinísticamente desde el email
-- usando el mismo algoritmo que signature-service
-- =============================================================================
