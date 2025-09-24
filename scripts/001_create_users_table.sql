-- Criar tabela de usuários
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('basic', 'manager', 'master')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir usuários padrão
INSERT INTO users (email, password_hash, name, role) VALUES
('admin@empresa.com', '$2b$10$hash_admin', 'Administrador', 'master'),
('gerente@empresa.com', '$2b$10$hash_gerente', 'Gerente', 'manager'),
('usuario@empresa.com', '$2b$10$hash_usuario', 'Usuário', 'basic');
