-- Criar tabela de fluxo de caixa
CREATE TABLE cash_flow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(10) NOT NULL CHECK (type IN ('entry', 'exit')),
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_cash_flow_type ON cash_flow_transactions(type);
CREATE INDEX idx_cash_flow_date ON cash_flow_transactions(date);
CREATE INDEX idx_cash_flow_category ON cash_flow_transactions(category);
CREATE INDEX idx_cash_flow_created_by ON cash_flow_transactions(created_by);
