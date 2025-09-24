-- Criar tabela de contas a pagar (versão corrigida)
CREATE TABLE accounts_payable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Multi-tenant
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Dados do fornecedor
  supplier_name VARCHAR(255) NOT NULL,
  supplier_document VARCHAR(18), -- CNPJ ou CPF
  supplier_email VARCHAR(255),
  supplier_phone VARCHAR(20),
  
  -- Dados da conta
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  
  -- Datas importantes
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  
  -- Status e prioridade
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled', 'partially_paid')),
  priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Categorização
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  tags TEXT[], -- Array de tags
  
  -- Dados de pagamento
  payment_method VARCHAR(50),
  payment_amount DECIMAL(15,2) DEFAULT 0 CHECK (payment_amount >= 0),
  discount_amount DECIMAL(15,2) DEFAULT 0 CHECK (discount_amount >= 0),
  interest_amount DECIMAL(15,2) DEFAULT 0 CHECK (interest_amount >= 0),
  
  -- Documentos
  invoice_number VARCHAR(100),
  contract_number VARCHAR(100),
  
  -- Observações
  notes TEXT,
  
  -- Relacionamento com transação do fluxo de caixa
  cash_flow_transaction_id UUID REFERENCES cash_flow_transactions(id),
  
  -- Auditoria
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX idx_accounts_payable_company_id ON accounts_payable(company_id);
CREATE INDEX idx_accounts_payable_status ON accounts_payable(status);
CREATE INDEX idx_accounts_payable_due_date ON accounts_payable(due_date);
CREATE INDEX idx_accounts_payable_supplier ON accounts_payable(supplier_name);
CREATE INDEX idx_accounts_payable_category ON accounts_payable(category);
CREATE INDEX idx_accounts_payable_created_by ON accounts_payable(created_by);
CREATE INDEX idx_accounts_payable_priority ON accounts_payable(priority);

-- Índices compostos para consultas específicas
CREATE INDEX idx_accounts_payable_company_status ON accounts_payable(company_id, status);
CREATE INDEX idx_accounts_payable_company_due_date ON accounts_payable(company_id, due_date);

-- Constraint: payment_amount não pode ser maior que amount + interest_amount
ALTER TABLE accounts_payable 
ADD CONSTRAINT check_payment_amount 
CHECK (payment_amount <= (amount + interest_amount));