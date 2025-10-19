-- ============================================
-- TABELA DE CLIENTES
-- ============================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Dados do cliente
  name VARCHAR(255) NOT NULL,
  cpf_cnpj VARCHAR(20),
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  
  -- Status
  active BOOLEAN DEFAULT true,
  
  -- Auditoria
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX idx_customers_company_id ON customers(company_id);
CREATE INDEX idx_customers_active ON customers(active);
CREATE INDEX idx_customers_name ON customers(name);

-- ============================================
-- MODIFICAR TABELA DE TRANSAÇÕES
-- ============================================
-- Adicionar novos campos para vendas a prazo
ALTER TABLE cash_flow_transactions
ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
ADD COLUMN amount_received DECIMAL(15,2) DEFAULT NULL;

-- Índice para consultas de clientes
CREATE INDEX idx_cash_flow_customer_id ON cash_flow_transactions(customer_id);

-- Comentários para documentação
COMMENT ON COLUMN cash_flow_transactions.customer_id IS 'Cliente vinculado à transação (vendas a prazo)';
COMMENT ON COLUMN cash_flow_transactions.amount_received IS 'Valor efetivamente recebido (para vendas a prazo amount_received pode ser menor que amount)';