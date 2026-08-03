-- Crear suscripciones activas para las organizaciones de prueba
-- Esto permite que los tests E2E funcionen correctamente

-- IDs de organizaciones (deben coincidir con V10 de auth-service)
-- TechCorp SpA: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
-- InnoSoft Limitada: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb

-- IDs de usuarios OWNER (deben coincidir con V10 de auth-service)
-- owner1@techcorp.cl: 11111111-1111-1111-1111-111111111111
-- owner2@innosoft.cl: 44444444-4444-4444-4444-444444444444

-- Suscripción ANUAL activa para TechCorp SpA
INSERT INTO subscriptions (
    id,
    user_id,
    organization_id,
    plan_key,
    provider,
    provider_subscription_id,
    status,
    started_at,
    current_period_end,
    cancel_at_period_end,
    created_at,
    updated_at
) VALUES (
    '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'ANNUAL',
    'TEST',
    'test_techcorp_annual',
    'ACTIVE',
    NOW() - INTERVAL '1 month',
    NOW() + INTERVAL '11 months',
    false,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    status = 'ACTIVE',
    current_period_end = NOW() + INTERVAL '11 months',
    updated_at = NOW();

-- Suscripción ANUAL activa para InnoSoft Limitada
INSERT INTO subscriptions (
    id,
    user_id,
    organization_id,
    plan_key,
    provider,
    provider_subscription_id,
    status,
    started_at,
    current_period_end,
    cancel_at_period_end,
    created_at,
    updated_at
) VALUES (
    '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '44444444-4444-4444-4444-444444444444',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'ANNUAL',
    'TEST',
    'test_innosoft_annual',
    'ACTIVE',
    NOW() - INTERVAL '1 month',
    NOW() + INTERVAL '11 months',
    false,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    status = 'ACTIVE',
    current_period_end = NOW() + INTERVAL '11 months',
    updated_at = NOW();

-- Crear cargos pagados para las suscripciones (para historial completo)
INSERT INTO subscription_charges (
    id,
    subscription_id,
    provider,
    provider_payment_id,
    currency,
    amount_net_clp,
    amount_tax_clp,
    amount_gross_clp,
    status,
    paid_at,
    created_at
) VALUES (
    '11111111-cccc-cccc-cccc-cccccccccccc',
    '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'TEST',
    'test_payment_techcorp_001',
    'CLP',
    0,
    0,
    0,
    'PAID',
    NOW() - INTERVAL '1 month',
    NOW() - INTERVAL '1 month'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO subscription_charges (
    id,
    subscription_id,
    provider,
    provider_payment_id,
    currency,
    amount_net_clp,
    amount_tax_clp,
    amount_gross_clp,
    status,
    paid_at,
    created_at
) VALUES (
    '22222222-dddd-dddd-dddd-dddddddddddd',
    '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'TEST',
    'test_payment_innosoft_001',
    'CLP',
    0,
    0,
    0,
    'PAID',
    NOW() - INTERVAL '1 month',
    NOW() - INTERVAL '1 month'
) ON CONFLICT (id) DO NOTHING;
