-- Adicionar coluna de categoria de pagamento à tabela nfe_invoices
ALTER TABLE nfe_invoices
ADD COLUMN IF NOT EXISTS payment_category VARCHAR(50) DEFAULT 'Compras';

COMMENT ON COLUMN nfe_invoices.payment_category IS 'Categoria da despesa para registro no fluxo de caixa';
