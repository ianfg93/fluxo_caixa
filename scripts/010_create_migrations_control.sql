-- Criar sistema de controle de migrations
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) UNIQUE NOT NULL,
    checksum VARCHAR(64), -- Para verificar se arquivo foi alterado
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    execution_time_ms INTEGER -- Tempo de execução em milissegundos
);

-- Índices para performance
CREATE INDEX idx_migrations_filename ON migrations(filename);
CREATE INDEX idx_migrations_executed_at ON migrations(executed_at);

-- Inserir as migrations já executadas
INSERT INTO migrations (filename, executed_at) VALUES
('000_drop_all_tables.sql', NOW() - INTERVAL '10 minutes'),
('001_create_user_types_table.sql', NOW() - INTERVAL '9 minutes'),
('002_create_companies_table.sql', NOW() - INTERVAL '8 minutes'),
('003_create_users_table.sql', NOW() - INTERVAL '7 minutes'),
('004_create_cash_flow_table.sql', NOW() - INTERVAL '6 minutes'),
('005_create_accounts_payable_table.sql', NOW() - INTERVAL '5 minutes'),
('006_create_notifications_table.sql', NOW() - INTERVAL '4 minutes'),
('007_create_file_uploads_table.sql', NOW() - INTERVAL '3 minutes'),
('008_create_functions_and_triggers.sql', NOW() - INTERVAL '2 minutes'),
('009_seed_initial_data.sql', NOW() - INTERVAL '1 minute'),
('010_create_migrations_control.sql', NOW())
ON CONFLICT (filename) DO NOTHING;

-- Verificar estrutura criada
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;