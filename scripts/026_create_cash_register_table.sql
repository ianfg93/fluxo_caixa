-- Criar tabela de abertura/fechamento de caixa
-- Migration: 026

CREATE TABLE cash_register_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Dados da sessão
  opening_date DATE NOT NULL,
  opening_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  opening_amount DECIMAL(15,2) NOT NULL CHECK (opening_amount >= 0),

  -- Fechamento (nullable enquanto caixa está aberto)
  closing_time TIMESTAMP WITH TIME ZONE,
  closing_amount DECIMAL(15,2),
  expected_amount DECIMAL(15,2),
  difference DECIMAL(15,2),

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),

  -- Notas
  opening_notes TEXT,
  closing_notes TEXT,

  -- Auditoria
  opened_by UUID NOT NULL REFERENCES users(id),
  closed_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX idx_cash_register_company_id ON cash_register_sessions(company_id);
CREATE INDEX idx_cash_register_opening_date ON cash_register_sessions(opening_date);
CREATE INDEX idx_cash_register_status ON cash_register_sessions(status);
CREATE INDEX idx_cash_register_opened_by ON cash_register_sessions(opened_by);

-- Índice composto para encontrar caixa aberto do dia
CREATE INDEX idx_cash_register_company_date_status ON cash_register_sessions(company_id, opening_date, status);

-- Constraint: Apenas um caixa aberto por empresa por dia
CREATE UNIQUE INDEX idx_one_open_register_per_company_day
  ON cash_register_sessions(company_id, opening_date)
  WHERE status = 'open';

-- Comentários
COMMENT ON TABLE cash_register_sessions IS 'Registros de abertura e fechamento de caixa';
COMMENT ON COLUMN cash_register_sessions.opening_amount IS 'Valor inicial em dinheiro no caixa';
COMMENT ON COLUMN cash_register_sessions.expected_amount IS 'Valor esperado no fechamento (abertura + movimentações)';
COMMENT ON COLUMN cash_register_sessions.closing_amount IS 'Valor real contado no fechamento';
COMMENT ON COLUMN cash_register_sessions.difference IS 'Diferença entre esperado e real (sobra/falta)';
