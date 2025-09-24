-- Criar tabela de tipos de usuários
CREATE TABLE user_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(20) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  level INTEGER NOT NULL, -- 1=master, 2=administrator, 3=operational
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir tipos de usuários
INSERT INTO user_types (name, description, level, permissions) VALUES
('master', 'Usuário master do sistema - pode criar empresas', 1, '{
  "can_create_companies": true, 
  "can_manage_all_companies": true,
  "can_create_master_users": true,
  "access_level": "global"
}'),
('administrator', 'Administrador da empresa - gerencia a empresa', 2, '{
  "can_manage_company": true, 
  "can_create_users": true,
  "can_manage_company_settings": true,
  "access_level": "company"
}'),
('operational', 'Usuário operacional - opera o sistema', 3, '{
  "can_view_data": true, 
  "can_create_transactions": true,
  "can_edit_own_data": true,
  "access_level": "company"
}');

-- Índice para performance
CREATE INDEX idx_user_types_name ON user_types(name);
CREATE INDEX idx_user_types_level ON user_types(level);