-- Migration: Create card_settings table for card receivables configuration
-- This stores the global settings for credit/debit card rates and settlement terms
-- The receivables themselves are calculated from cash_flow_transactions table

-- Drop card_receivables table if it exists (not needed anymore)
DROP TABLE IF EXISTS card_receivables;

-- Table for global card settings (rates and settlement terms)
CREATE TABLE IF NOT EXISTS card_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  debit_rate DECIMAL(5,2) NOT NULL DEFAULT 0, -- Taxa de Débito em %
  debit_days INTEGER NOT NULL DEFAULT 1, -- Prazo de Débito (D+X)
  credit_rate DECIMAL(5,2) NOT NULL DEFAULT 0, -- Taxa de Crédito em %
  credit_days INTEGER NOT NULL DEFAULT 30, -- Prazo de Crédito (D+X)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id)
);

-- Insert default settings for existing companies
INSERT INTO card_settings (company_id, debit_rate, debit_days, credit_rate, credit_days)
SELECT id, 0, 1, 0, 30
FROM companies
ON CONFLICT (company_id) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE card_settings IS 'Global settings for card transaction rates and settlement terms per company. Used to calculate receivables from cash_flow_transactions.';
COMMENT ON COLUMN card_settings.debit_rate IS 'Debit card transaction fee percentage';
COMMENT ON COLUMN card_settings.debit_days IS 'Days until debit card settlement (D+X)';
COMMENT ON COLUMN card_settings.credit_rate IS 'Credit card transaction fee percentage';
COMMENT ON COLUMN card_settings.credit_days IS 'Days until credit card settlement (D+X)';
