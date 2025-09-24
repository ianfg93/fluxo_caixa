-- Dados iniciais para teste e demonstração (versão corrigida)

-- Criar empresa de exemplo
INSERT INTO companies (
  name, 
  trade_name, 
  cnpj, 
  email, 
  phone, 
  address, 
  city, 
  state, 
  zip_code,
  subscription_plan,
  max_users,
  settings
) VALUES (
  'Empresa Exemplo Ltda',
  'Exemplo Corp',
  '12.345.678/0001-90',
  'contato@exemplo.com.br',
  '(11) 99999-9999',
  'Rua das Empresas, 123, Sala 456',
  'São Paulo',
  'SP',
  '01234-567',
  'premium',
  10,
  '{"currency": "BRL", "timezone": "America/Sao_Paulo", "date_format": "DD/MM/YYYY", "decimal_places": 2, "notifications_enabled": true}'::jsonb
);

-- Criar usuários da empresa exemplo
-- Primeiro, obter o ID da empresa
WITH empresa_exemplo AS (
  SELECT id as empresa_id FROM companies WHERE cnpj = '12.345.678/0001-90'
),
-- Criar usuário administrador
admin_user AS (
  INSERT INTO users (
    name, 
    email, 
    password_hash, 
    user_type_id, 
    company_id,
    email_verified,
    settings
  ) 
  SELECT 
    'João Silva',
    'admin@exemplo.com.br',
    '$2b$10$hash_change_this_123456', -- senha: 123456 (MUDAR EM PRODUÇÃO)
    ut.id,
    ee.empresa_id,
    true,
    '{"theme": "light", "language": "pt-BR"}'::jsonb
  FROM user_types ut, empresa_exemplo ee
  WHERE ut.name = 'administrator'
  RETURNING id as admin_id, company_id
),
-- Criar usuário operacional
operational_user AS (
  INSERT INTO users (
    name, 
    email, 
    password_hash, 
    user_type_id, 
    company_id,
    email_verified,
    settings
  ) 
  SELECT 
    'Maria Santos',
    'maria@exemplo.com.br',
    '$2b$10$hash_change_this_123456', -- senha: 123456 (MUDAR EM PRODUÇÃO)
    ut.id,
    ee.empresa_id,
    true,
    '{"theme": "dark", "language": "pt-BR"}'::jsonb
  FROM user_types ut, empresa_exemplo ee
  WHERE ut.name = 'operational'
  RETURNING id as operational_id, company_id
)
-- Inserir dados de transações
INSERT INTO cash_flow_transactions (
  company_id,
  type,
  description,
  amount,
  category,
  subcategory,
  transaction_date,
  payment_method,
  status,
  tags,
  notes,
  created_by
) 
SELECT 
  au.company_id,
  'entry',
  'Venda de produtos - Cliente ABC Ltda',
  15000.00,
  'Vendas',
  'Produtos',
  CURRENT_DATE - INTERVAL '5 days',
  'PIX',
  'completed',
  ARRAY['vendas', 'cliente-abc'],
  'Pagamento à vista com desconto de 3%',
  au.admin_id
FROM admin_user au

UNION ALL

SELECT 
  ou.company_id,
  'entry',
  'Prestação de serviços - Consultoria XYZ',
  8500.00,
  'Serviços',
  'Consultoria',
  CURRENT_DATE - INTERVAL '3 days',
  'Transferência bancária',
  'completed',
  ARRAY['servicos', 'consultoria'],
  NULL,
  ou.operational_id
FROM operational_user ou

UNION ALL

SELECT 
  au.company_id,
  'exit',
  'Pagamento de salários - Funcionários',
  25000.00,
  'Despesas',
  'Salários',
  CURRENT_DATE - INTERVAL '2 days',
  'TED',
  'completed',
  ARRAY['folha-pagamento', 'salarios'],
  'Folha de pagamento mensal',
  au.admin_id
FROM admin_user au

UNION ALL

SELECT 
  au.company_id,
  'exit',
  'Compra de equipamentos de informática',
  3200.00,
  'Despesas',
  'Equipamentos',
  CURRENT_DATE - INTERVAL '1 day',
  'Cartão de crédito',
  'completed',
  ARRAY['equipamentos', 'ti'],
  'Notebooks para equipe de desenvolvimento',
  au.admin_id
FROM admin_user au;