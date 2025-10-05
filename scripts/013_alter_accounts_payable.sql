BEGIN;

ALTER TABLE accounts_payable 
  ALTER COLUMN supplier_name DROP NOT NULL,
  ALTER COLUMN supplier_document DROP NOT NULL,
  ALTER COLUMN supplier_email DROP NOT NULL,
  ALTER COLUMN supplier_phone DROP NOT NULL;

COMMIT;
