-- Criar tabela de sangrias (retiradas de dinheiro do caixa)
-- Migration: 027

CREATE TABLE cash_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Relacionamento com sessão de caixa
  cash_register_session_id UUID REFERENCES cash_register_sessions(id) ON DELETE SET NULL,

  -- Dados da sangria
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  withdrawal_date DATE NOT NULL,
  withdrawal_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Motivo e observações
  reason TEXT,
  notes TEXT,

  -- Auditoria
  withdrawn_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX idx_cash_withdrawals_company_id ON cash_withdrawals(company_id);
CREATE INDEX idx_cash_withdrawals_date ON cash_withdrawals(withdrawal_date);
CREATE INDEX idx_cash_withdrawals_session_id ON cash_withdrawals(cash_register_session_id);

-- Comentários
COMMENT ON TABLE cash_withdrawals IS 'Registros de sangrias (retiradas de dinheiro do caixa)';
COMMENT ON COLUMN cash_withdrawals.amount IS 'Valor retirado do caixa em dinheiro';
COMMENT ON COLUMN cash_withdrawals.reason IS 'Motivo da sangria (ex: Depósito bancário, Excesso de dinheiro)';
