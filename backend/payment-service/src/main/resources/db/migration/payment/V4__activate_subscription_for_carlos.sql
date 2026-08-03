-- Activate subscription for test user: Carlos López Martínez
-- user_id defined in auth-service V2__insert_test_users.sql
-- ID: c3d4e5f6-a7b8-9012-cdef-123456789012 (carlos.lopez@empresa.cl)

-- Create ACTIVE ANNUAL subscription without organization (personal account)
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
    '33333333-cccc-cccc-cccc-cccccccccccc',
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    NULL,
    'ANNUAL',
    'TEST',
    'test_carlos_annual',
    'ACTIVE',
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '12 months',
    false,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    status = 'ACTIVE',
    current_period_end = NOW() + INTERVAL '12 months',
    updated_at = NOW();

-- Create a paid charge (historical) associated with the subscription
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
    '33333333-dddd-dddd-dddd-dddddddddddd',
    '33333333-cccc-cccc-cccc-cccccccccccc',
    'TEST',
    'test_payment_carlos_001',
    'CLP',
    0,
    0,
    0,
    'PAID',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
) ON CONFLICT (id) DO NOTHING;
