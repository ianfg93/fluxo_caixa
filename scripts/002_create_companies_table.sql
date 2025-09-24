-- Criar tabela de empresas
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  trade_name VARCHAR(255),
  cnpj VARCHAR(18) UNIQUE,
  cpf VARCHAR(14), -- Para MEI ou pessoa física
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  active BOOLEAN DEFAULT true NOT NULL,
  
  -- Dados de assinatura/plano
  subscription_plan VARCHAR(50) DEFAULT 'basic' NOT NULL,
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  max_users INTEGER DEFAULT 5 NOT NULL,
  max_transactions_per_month INTEGER DEFAULT 1000 NOT NULL,
  
  -- Configurações da empresa
  settings JSONB DEFAULT '{}',
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para performance e busca
CREATE INDEX idx_companies_cnpj ON companies(cnpj) WHERE cnpj IS NOT NULL;
CREATE INDEX idx_companies_cpf ON companies(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX idx_companies_active ON companies(active);
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_subscription ON companies(subscription_plan, subscription_expires_at);

-- Constraint para garantir que tenha CNPJ ou CPF
ALTER TABLE companies ADD CONSTRAINT check_cnpj_or_cpf 
CHECK (cnpj IS NOT NULL OR cpf IS NOT NULL);