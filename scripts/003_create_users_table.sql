-- Criar tabela de usuários (versão corrigida)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  
  -- Relacionamentos
  user_type_id INTEGER NOT NULL REFERENCES user_types(id),
  company_id UUID REFERENCES companies(id),
  
  -- Status e configurações
  active BOOLEAN DEFAULT true NOT NULL,
  email_verified BOOLEAN DEFAULT false NOT NULL,
  last_login TIMESTAMP WITH TIME ZONE,
  
  -- Configurações pessoais
  settings JSONB DEFAULT '{}',
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_user_type_id ON users(user_type_id);
CREATE INDEX idx_users_active ON users(active);

-- Inserir usuário master padrão
INSERT INTO users (email, password_hash, name, user_type_id) VALUES
('ian_ferreira93@hotmail.com', '123456', 'Master System', 
 (SELECT id FROM user_types WHERE name = 'master'));