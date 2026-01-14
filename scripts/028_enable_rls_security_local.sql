-- ============================================
-- CORREÇÃO URGENTE: HABILITAR ROW LEVEL SECURITY (RLS)
-- VERSÃO: DESENVOLVIMENTO LOCAL (SEM SUPABASE AUTH)
-- Data: 2026-01-14
-- ============================================

-- ATENÇÃO: Esta versão é para ambientes de desenvolvimento local
-- Para produção Supabase, use: 028_enable_rls_security_supabase.sql

-- ============================================
-- PARTE 1: HABILITAR RLS EM TODAS AS TABELAS
-- ============================================

ALTER TABLE user_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE open_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE open_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfe_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_withdrawals ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PARTE 2: POLÍTICAS PERMISSIVAS PARA DESENVOLVIMENTO
-- ============================================
-- Em desenvolvimento local, vamos usar políticas mais permissivas
-- já que não temos Supabase Auth para identificar usuários

-- IMPORTANTE: Estas políticas PERMITEM TUDO para facilitar desenvolvimento
-- Elas serão substituídas por políticas restritivas em produção

-- user_types: leitura pública
CREATE POLICY "dev_user_types_all" ON user_types FOR ALL USING (true);

-- users: acesso total em dev
CREATE POLICY "dev_users_all" ON users FOR ALL USING (true);

-- companies: acesso total em dev
CREATE POLICY "dev_companies_all" ON companies FOR ALL USING (true);

-- notifications: acesso total em dev
CREATE POLICY "dev_notifications_all" ON notifications FOR ALL USING (true);

-- cash_flow_transactions: acesso total em dev
CREATE POLICY "dev_cash_flow_all" ON cash_flow_transactions FOR ALL USING (true);

-- migrations: acesso total em dev
CREATE POLICY "dev_migrations_all" ON migrations FOR ALL USING (true);

-- file_uploads: acesso total em dev
CREATE POLICY "dev_file_uploads_all" ON file_uploads FOR ALL USING (true);

-- vendors: acesso total em dev
CREATE POLICY "dev_vendors_all" ON vendors FOR ALL USING (true);

-- products: acesso total em dev
CREATE POLICY "dev_products_all" ON products FOR ALL USING (true);

-- stock_movements: acesso total em dev
CREATE POLICY "dev_stock_movements_all" ON stock_movements FOR ALL USING (true);

-- accounts_payable: acesso total em dev
CREATE POLICY "dev_accounts_payable_all" ON accounts_payable FOR ALL USING (true);

-- open_orders: acesso total em dev
CREATE POLICY "dev_open_orders_all" ON open_orders FOR ALL USING (true);

-- open_order_items: acesso total em dev
CREATE POLICY "dev_open_order_items_all" ON open_order_items FOR ALL USING (true);

-- customers: acesso total em dev
CREATE POLICY "dev_customers_all" ON customers FOR ALL USING (true);

-- nfe_items: acesso total em dev
CREATE POLICY "dev_nfe_items_all" ON nfe_items FOR ALL USING (true);

-- nfe_invoices: acesso total em dev
CREATE POLICY "dev_nfe_invoices_all" ON nfe_invoices FOR ALL USING (true);

-- card_settings: acesso total em dev
CREATE POLICY "dev_card_settings_all" ON card_settings FOR ALL USING (true);

-- cash_register_sessions: acesso total em dev
CREATE POLICY "dev_cash_register_sessions_all" ON cash_register_sessions FOR ALL USING (true);

-- cash_withdrawals: acesso total em dev
CREATE POLICY "dev_cash_withdrawals_all" ON cash_withdrawals FOR ALL USING (true);

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Verificar RLS habilitado
SELECT
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- COMENTÁRIOS IMPORTANTES
-- ============================================

COMMENT ON POLICY "dev_users_all" ON users IS
'DESENVOLVIMENTO: Política permissiva. Substituir por políticas restritivas em produção com Supabase Auth.';

-- ============================================
-- FIM DO SCRIPT
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ RLS habilitado em 19 tabelas';
    RAISE NOTICE '✅ Políticas permissivas criadas para DESENVOLVIMENTO';
    RAISE NOTICE '⚠️  IMPORTANTE: Use 028_enable_rls_security_supabase.sql em PRODUÇÃO';
END $$;
