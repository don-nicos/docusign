CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS payment_pricing_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency VARCHAR(8) NOT NULL,
    iva_rate NUMERIC(5,4) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_key VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    period_months INT NOT NULL,
    net_amount_clp INT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    plan_key VARCHAR(32) NOT NULL,
    provider VARCHAR(32) NOT NULL,
    provider_subscription_id VARCHAR(120) NULL,
    status VARCHAR(32) NOT NULL,
    started_at TIMESTAMPTZ NULL,
    current_period_end TIMESTAMPTZ NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    cancelled_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

CREATE TABLE IF NOT EXISTS subscription_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL,
    provider_payment_id VARCHAR(120) NULL,
    currency VARCHAR(8) NOT NULL,
    amount_net_clp INT NOT NULL,
    amount_tax_clp INT NOT NULL,
    amount_gross_clp INT NOT NULL,
    status VARCHAR(32) NOT NULL,
    paid_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_charges_subscription_id ON subscription_charges(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_charges_status ON subscription_charges(status);

CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(32) NOT NULL,
    topic VARCHAR(64) NULL,
    event_id VARCHAR(120) NULL,
    payload JSONB NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'RECEIVED'
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON webhook_events(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_events_received_at ON webhook_events(received_at);

CREATE TABLE IF NOT EXISTS subscription_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    days_before_expiry INT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(subscription_id, days_before_expiry)
);

INSERT INTO payment_pricing_config (currency, iva_rate)
SELECT 'CLP', 0.1900
WHERE NOT EXISTS (SELECT 1 FROM payment_pricing_config);

INSERT INTO subscription_plans (plan_key, name, period_months, net_amount_clp, active)
SELECT 'MONTHLY', 'Mensual', 1, 0, TRUE
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE plan_key = 'MONTHLY');

INSERT INTO subscription_plans (plan_key, name, period_months, net_amount_clp, active)
SELECT 'SEMIANNUAL', 'Semestral', 6, 0, TRUE
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE plan_key = 'SEMIANNUAL');

INSERT INTO subscription_plans (plan_key, name, period_months, net_amount_clp, active)
SELECT 'ANNUAL', 'Anual', 12, 0, TRUE
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE plan_key = 'ANNUAL');
