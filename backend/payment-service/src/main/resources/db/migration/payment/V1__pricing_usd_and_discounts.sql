ALTER TABLE payment_pricing_config
    ADD COLUMN IF NOT EXISTS usd_to_clp_rate INT NOT NULL DEFAULT 950,
    ADD COLUMN IF NOT EXISTS monthly_base_usd NUMERIC(10,2) NOT NULL DEFAULT 2.00;

ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS discount_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0000;

UPDATE payment_pricing_config
SET usd_to_clp_rate = 950,
    monthly_base_usd = 2.00;

UPDATE subscription_plans
SET discount_rate = 0.0000
WHERE plan_key = 'MONTHLY';

UPDATE subscription_plans
SET discount_rate = 0.1000
WHERE plan_key = 'SEMIANNUAL';

UPDATE subscription_plans
SET discount_rate = 0.2000
WHERE plan_key = 'ANNUAL';

UPDATE subscription_plans
SET net_amount_clp = ROUND((2.00 * 950 * period_months * (1 - discount_rate)))::INT
WHERE plan_key IN ('MONTHLY', 'SEMIANNUAL', 'ANNUAL');
