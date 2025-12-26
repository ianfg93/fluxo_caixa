-- Adicionar customer_id à tabela budgets
-- Migration: 029

-- Adicionar coluna customer_id (nullable para não quebrar orçamentos existentes)
ALTER TABLE budgets
ADD COLUMN customer_id UUID REFERENCES customers(id);

-- Criar índice para performance
CREATE INDEX idx_budgets_customer_id ON budgets(customer_id);

-- Comentário
COMMENT ON COLUMN budgets.customer_id IS 'Referência ao cliente cadastrado (quando selecionado do banco)';
