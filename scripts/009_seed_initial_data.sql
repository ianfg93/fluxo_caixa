WITH new_company AS (
  INSERT INTO companies (
    name, trade_name, cnpj, email, phone, address, city, state, zip_code,
    subscription_plan, max_users, settings
  ) VALUES (
    'Ian Gonçalves',
    'Empresa',
    '',
    'ian_ferreira93@hotmail.com',
    '(32) 99923-4357',
    'Rua Muzambinho. 244',
    'Belo Horizonte',
    'MG',
    '30310-280',
    'premium',
    10,
    '{"currency": "BRL", "timezone": "America/Sao_Paulo", "date_format": "DD/MM/YYYY", "decimal_places": 2, "notifications_enabled": true}'::jsonb
  )
  RETURNING id
)
INSERT INTO users (email, password_hash, name, user_type_id, company_id) 
SELECT 
  'ian_ferreira93@hotmail.com',
  crypt('123456', gen_salt('bf')), -- bcrypt gerado no Postgres
  'Master System',
  (SELECT id FROM user_types WHERE name = 'master'),
  new_company.id
FROM new_company;
