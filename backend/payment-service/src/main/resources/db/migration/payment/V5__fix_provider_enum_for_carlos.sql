-- Fix provider enum value for Carlos subscription and charge
-- Previous migration used non-existent enum 'TEST'; valid values: MOCK, MERCADOPAGO

UPDATE subscriptions
SET provider = 'MOCK'
WHERE id = '33333333-cccc-cccc-cccc-cccccccccccc' AND provider <> 'MOCK';

UPDATE subscription_charges
SET provider = 'MOCK'
WHERE id = '33333333-dddd-dddd-dddd-dddddddddddd' AND provider <> 'MOCK';
