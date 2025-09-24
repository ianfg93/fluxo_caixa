-- Script para apagar todas as tabelas e recomeçar do zero
-- ATENÇÃO: Este script apaga TODOS os dados!

-- Dropar todas as tabelas na ordem correta (dependências)
DROP TABLE IF EXISTS file_uploads CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS accounts_payable CASCADE;
DROP TABLE IF EXISTS cash_flow_transactions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS user_types CASCADE;
DROP TABLE IF EXISTS migrations CASCADE;

-- Dropar funções
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS create_overdue_notifications() CASCADE;
DROP FUNCTION IF EXISTS user_can_access_company(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_accessible_companies(UUID) CASCADE;

-- Dropar triggers (já são removidos com CASCADE acima)

-- Limpar possíveis sequências órfãs
DROP SEQUENCE IF EXISTS user_types_id_seq CASCADE;

RESET ALL;

-- Confirmar que está limpo
SELECT 'Database limpo com sucesso!' as status;