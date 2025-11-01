-- Desabilitar triggers de NF-e
-- A lógica agora está na API para melhor controle e evitar duplicação

-- Remover trigger de atualização de estoque automática
DROP TRIGGER IF EXISTS trigger_update_stock_from_nfe ON nfe_invoices;

-- Remover trigger de criação de contas a pagar automática
DROP TRIGGER IF EXISTS trigger_create_accounts_payable_from_nfe ON nfe_invoices;

-- Manter as funções caso sejam úteis no futuro, mas os triggers não serão executados
COMMENT ON FUNCTION update_stock_from_nfe() IS 'Função desabilitada - lógica movida para API';
COMMENT ON FUNCTION create_accounts_payable_from_nfe() IS 'Função desabilitada - lógica movida para API';
