-- Script de datos de prueba para organizaciones
-- Password para todos: Test1234!
-- Hash BCrypt de "Test1234!": $2a$10$N9qo8uLOickgx2ZMRZoMye1JxDfO7jXgwBpCF/kVFNgk6oYLLLaLS

-- Empresa 1: TechCorp
-- owner1@techcorp.cl (OWNER)
-- admin1@techcorp.cl (ADMIN)
-- member1@techcorp.cl (MEMBER)

-- Empresa 2: InnoSoft
-- owner2@innosoft.cl (OWNER)
-- admin2@innosoft.cl (ADMIN)
-- member2@innosoft.cl (MEMBER)

-- Usuarios
INSERT INTO users (id, email, full_name, password_hash, status, created_at, updated_at) VALUES
('11111111-1111-1111-1111-111111111111', 'owner1@techcorp.cl', 'Carlos Dueño TechCorp', '$2a$10$N9qo8uLOickgx2ZMRZoMye1JxDfO7jXgwBpCF/kVFNgk6oYLLLaLS', 'ACTIVE', NOW(), NOW()),
('22222222-2222-2222-2222-222222222222', 'admin1@techcorp.cl', 'Ana Admin TechCorp', '$2a$10$N9qo8uLOickgx2ZMRZoMye1JxDfO7jXgwBpCF/kVFNgk6oYLLLaLS', 'ACTIVE', NOW(), NOW()),
('33333333-3333-3333-3333-333333333333', 'member1@techcorp.cl', 'Luis Miembro TechCorp', '$2a$10$N9qo8uLOickgx2ZMRZoMye1JxDfO7jXgwBpCF/kVFNgk6oYLLLaLS', 'ACTIVE', NOW(), NOW()),
('44444444-4444-4444-4444-444444444444', 'owner2@innosoft.cl', 'María Dueña InnoSoft', '$2a$10$N9qo8uLOickgx2ZMRZoMye1JxDfO7jXgwBpCF/kVFNgk6oYLLLaLS', 'ACTIVE', NOW(), NOW()),
('55555555-5555-5555-5555-555555555555', 'admin2@innosoft.cl', 'Pedro Admin InnoSoft', '$2a$10$N9qo8uLOickgx2ZMRZoMye1JxDfO7jXgwBpCF/kVFNgk6oYLLLaLS', 'ACTIVE', NOW(), NOW()),
('66666666-6666-6666-6666-666666666666', 'member2@innosoft.cl', 'Sofia Miembro InnoSoft', '$2a$10$N9qo8uLOickgx2ZMRZoMye1JxDfO7jXgwBpCF/kVFNgk6oYLLLaLS', 'ACTIVE', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Organizaciones
INSERT INTO organizations (id, name, tax_id, status, created_at, updated_at) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TechCorp SpA', '76.123.456-7', 'ACTIVE', NOW(), NOW()),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'InnoSoft Limitada', '77.654.321-9', 'ACTIVE', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Membresías TechCorp
INSERT INTO user_organizations (id, user_id, organization_id, role, is_active, joined_at) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'OWNER', true, NOW()),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ADMIN', true, NOW()),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MEMBER', true, NOW())
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Membresías InnoSoft
INSERT INTO user_organizations (id, user_id, organization_id, role, is_active, joined_at) VALUES
('ffffffff-ffff-ffff-ffff-ffffffffffff', '44444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'OWNER', true, NOW()),
('10101010-1010-1010-1010-101010101010', '55555555-5555-5555-5555-555555555555', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ADMIN', true, NOW()),
('20202020-2020-2020-2020-202020202020', '66666666-6666-6666-6666-666666666666', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'MEMBER', true, NOW())
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Actualizar default_organization_id
UPDATE users SET default_organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333');
UPDATE users SET default_organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' WHERE id IN ('44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666');
