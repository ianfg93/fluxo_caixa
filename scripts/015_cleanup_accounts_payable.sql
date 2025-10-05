-- Migration: Limpeza da tabela accounts_payable após criação da tabela vendors
-- Remove colunas redundantes que agora estão na tabela vendors

-- 1. Remover constraint que usa interest_amount
ALTER TABLE accounts_payable 
DROP CONSTRAINT IF EXISTS check_payment_amount;

-- 2. Remover índice relacionado a supplier_name
DROP INDEX IF EXISTS idx_accounts_payable_supplier;

-- 3. Remover colunas de dados do fornecedor (agora na tabela vendors)
ALTER TABLE accounts_payable
DROP COLUMN IF EXISTS supplier_name,
DROP COLUMN IF EXISTS supplier_document,
DROP COLUMN IF EXISTS supplier_email,
DROP COLUMN IF EXISTS supplier_phone;

-- 4. Remover colunas financeiras não utilizadas
ALTER TABLE accounts_payable
DROP COLUMN IF EXISTS discount_amount,
DROP COLUMN IF EXISTS interest_amount;

-- 5. Remover colunas de organização não utilizadas
ALTER TABLE accounts_payable
DROP COLUMN IF EXISTS subcategory,
DROP COLUMN IF EXISTS tags,
DROP COLUMN IF EXISTS contract_number;

-- 6. Recriar constraint simplificada (payment_amount não pode ser maior que amount)
ALTER TABLE accounts_payable 
ADD CONSTRAINT check_payment_amount 
CHECK (payment_amount <= amount);

-- Comentário explicativo
COMMENT ON TABLE accounts_payable IS 'Contas a pagar - dados do fornecedor agora estão na tabela vendors via vendor_id';