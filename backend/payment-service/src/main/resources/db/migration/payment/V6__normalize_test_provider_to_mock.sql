-- Normalize legacy 'TEST' provider values to valid enum 'MOCK'

UPDATE subscriptions SET provider = 'MOCK' WHERE provider = 'TEST';
UPDATE subscription_charges SET provider = 'MOCK' WHERE provider = 'TEST';
