-- Adicionar suporte para múltiplas formas de pagamento e campo customer_id
-- Migration: 025

-- Adicionar coluna para armazenar múltiplos pagamentos como JSON
ALTER TABLE cash_flow_transactions
ADD COLUMN IF NOT EXISTS payment_splits JSONB;

-- Adicionar coluna para relacionar com cliente (vendas a prazo)
ALTER TABLE cash_flow_transactions
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- Adicionar coluna para armazenar valor recebido (diferente do valor total em vendas a prazo)
ALTER TABLE cash_flow_transactions
ADD COLUMN IF NOT EXISTS amount_received DECIMAL(15,2);

-- Criar índice para consultas por cliente
CREATE INDEX IF NOT EXISTS idx_cash_flow_customer_id ON cash_flow_transactions(customer_id);

-- Comentários explicativos
COMMENT ON COLUMN cash_flow_transactions.payment_splits IS 'Array JSON com múltiplas formas de pagamento: [{"paymentMethod": "dinheiro", "amount": 50.00}, {"paymentMethod": "pix", "amount": 30.00}]';
COMMENT ON COLUMN cash_flow_transactions.customer_id IS 'ID do cliente para vendas a prazo ou vinculação de transações a clientes específicos';
COMMENT ON COLUMN cash_flow_transactions.amount_received IS 'Valor efetivamente recebido (pode ser diferente do amount em vendas a prazo)';
