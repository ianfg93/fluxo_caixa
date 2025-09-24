-- Criar tabela de transações de fluxo de caixa (versão corrigida)
CREATE TABLE cash_flow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Multi-tenant
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Dados da transação
  type VARCHAR(10) NOT NULL CHECK (type IN ('entry', 'exit')),
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  
  -- Datas
  transaction_date DATE NOT NULL,
  due_date DATE,
  
  -- Forma de pagamento e detalhes
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  bank_account VARCHAR(100),
  
  -- Status da transação
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  
  -- Dados adicionais
  tags TEXT[], -- Array de tags para categorização
  notes TEXT,
  
  -- Relacionamento com contas a pagar/receber
  related_account_id UUID, -- Referência flexível
  
  -- Auditoria
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para performance e consultas
CREATE INDEX idx_cash_flow_company_id ON cash_flow_transactions(company_id);
CREATE INDEX idx_cash_flow_type ON cash_flow_transactions(type);
CREATE INDEX idx_cash_flow_transaction_date ON cash_flow_transactions(transaction_date);
CREATE INDEX idx_cash_flow_category ON cash_flow_transactions(category);
CREATE INDEX idx_cash_flow_status ON cash_flow_transactions(status);
CREATE INDEX idx_cash_flow_created_by ON cash_flow_transactions(created_by);
CREATE INDEX idx_cash_flow_amount ON cash_flow_transactions(amount);

-- Índice composto para relatórios por período
CREATE INDEX idx_cash_flow_company_date ON cash_flow_transactions(company_id, transaction_date);
CREATE INDEX idx_cash_flow_company_type_date ON cash_flow_transactions(company_id, type, transaction_date);