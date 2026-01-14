-- ============================================
-- CORREÇÃO URGENTE: HABILITAR ROW LEVEL SECURITY (RLS)
-- Data: 2026-01-14
-- Descrição: Este script habilita RLS em todas as tabelas públicas
--            e cria políticas de segurança para proteger os dados
-- ============================================

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
-- PARTE 2: CRIAR FUNÇÃO AUXILIAR PARA OBTER COMPANY_ID DO USUÁRIO LOGADO
-- ============================================

CREATE OR REPLACE FUNCTION auth.user_company_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id
  FROM users
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- ============================================
-- PARTE 3: POLÍTICAS PARA USER_TYPES (Leitura pública, escrita admin)
-- ============================================

CREATE POLICY "user_types_read_all" ON user_types
  FOR SELECT
  USING (true);

CREATE POLICY "user_types_write_admin" ON user_types
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.user_type_id = 1 -- Apenas administradores
    )
  );

-- ============================================
-- PARTE 4: POLÍTICAS PARA COMPANIES
-- ============================================

-- Usuários podem ver apenas sua própria empresa
CREATE POLICY "companies_select_own" ON companies
  FOR SELECT
  USING (id = auth.user_company_id());

-- Apenas admins podem atualizar a empresa
CREATE POLICY "companies_update_admin" ON companies
  FOR UPDATE
  USING (
    id = auth.user_company_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.user_type_id = 1
    )
  );

-- ============================================
-- PARTE 5: POLÍTICAS PARA USERS
-- ============================================

-- Usuários podem ver outros usuários da mesma empresa
CREATE POLICY "users_select_same_company" ON users
  FOR SELECT
  USING (company_id = auth.user_company_id());

-- Usuários podem atualizar seu próprio perfil
CREATE POLICY "users_update_self" ON users
  FOR UPDATE
  USING (id = auth.uid());

-- Admins podem inserir novos usuários na mesma empresa
CREATE POLICY "users_insert_admin" ON users
  FOR INSERT
  WITH CHECK (
    company_id = auth.user_company_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.user_type_id = 1
    )
  );

-- Admins podem deletar usuários da mesma empresa
CREATE POLICY "users_delete_admin" ON users
  FOR DELETE
  USING (
    company_id = auth.user_company_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.user_type_id = 1
    )
  );

-- ============================================
-- PARTE 6: POLÍTICAS PARA TABELAS COM COMPANY_ID (Isolamento por empresa)
-- ============================================

-- Aplicar políticas padrão para tabelas que têm company_id
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOR table_name IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN (
      'notifications', 'cash_flow_transactions', 'file_uploads',
      'vendors', 'products', 'stock_movements', 'accounts_payable',
      'open_orders', 'customers', 'nfe_invoices', 'card_settings',
      'cash_register_sessions', 'cash_withdrawals'
    )
  LOOP
    -- SELECT: usuários veem apenas dados da própria empresa
    EXECUTE format('
      CREATE POLICY "%I_select_own_company" ON %I
        FOR SELECT
        USING (company_id = auth.user_company_id())
    ', table_name, table_name);

    -- INSERT: usuários podem inserir apenas na própria empresa
    EXECUTE format('
      CREATE POLICY "%I_insert_own_company" ON %I
        FOR INSERT
        WITH CHECK (company_id = auth.user_company_id())
    ', table_name, table_name);

    -- UPDATE: usuários podem atualizar apenas dados da própria empresa
    EXECUTE format('
      CREATE POLICY "%I_update_own_company" ON %I
        FOR UPDATE
        USING (company_id = auth.user_company_id())
    ', table_name, table_name);

    -- DELETE: usuários podem deletar apenas dados da própria empresa
    EXECUTE format('
      CREATE POLICY "%I_delete_own_company" ON %I
        FOR DELETE
        USING (company_id = auth.user_company_id())
    ', table_name, table_name);
  END LOOP;
END $$;

-- ============================================
-- PARTE 7: POLÍTICAS PARA TABELAS RELACIONADAS (via foreign key)
-- ============================================

-- OPEN_ORDER_ITEMS: acesso via open_orders
CREATE POLICY "open_order_items_select" ON open_order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM open_orders
      WHERE open_orders.id = open_order_items.open_order_id
      AND open_orders.company_id = auth.user_company_id()
    )
  );

CREATE POLICY "open_order_items_insert" ON open_order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM open_orders
      WHERE open_orders.id = open_order_items.open_order_id
      AND open_orders.company_id = auth.user_company_id()
    )
  );

CREATE POLICY "open_order_items_update" ON open_order_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM open_orders
      WHERE open_orders.id = open_order_items.open_order_id
      AND open_orders.company_id = auth.user_company_id()
    )
  );

CREATE POLICY "open_order_items_delete" ON open_order_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM open_orders
      WHERE open_orders.id = open_order_items.open_order_id
      AND open_orders.company_id = auth.user_company_id()
    )
  );

-- NFE_ITEMS: acesso via nfe_invoices
CREATE POLICY "nfe_items_select" ON nfe_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM nfe_invoices
      WHERE nfe_invoices.id = nfe_items.nfe_id
      AND nfe_invoices.company_id = auth.user_company_id()
    )
  );

CREATE POLICY "nfe_items_insert" ON nfe_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nfe_invoices
      WHERE nfe_invoices.id = nfe_items.nfe_id
      AND nfe_invoices.company_id = auth.user_company_id()
    )
  );

CREATE POLICY "nfe_items_update" ON nfe_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM nfe_invoices
      WHERE nfe_invoices.id = nfe_items.nfe_id
      AND nfe_invoices.company_id = auth.user_company_id()
    )
  );

CREATE POLICY "nfe_items_delete" ON nfe_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM nfe_invoices
      WHERE nfe_invoices.id = nfe_items.nfe_id
      AND nfe_invoices.company_id = auth.user_company_id()
    )
  );

-- ============================================
-- PARTE 8: POLÍTICA PARA MIGRATIONS (Apenas leitura admin)
-- ============================================

CREATE POLICY "migrations_read_admin" ON migrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.user_type_id = 1
    )
  );

-- ============================================
-- PARTE 9: GRANTS PARA AUTHENTICATED USERS
-- ============================================

-- Conceder permissões para usuários autenticados
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================

COMMENT ON FUNCTION auth.user_company_id() IS 'Retorna o company_id do usuário autenticado';

-- ============================================
-- FIM DO SCRIPT
-- ============================================

-- Verificar RLS habilitado
SELECT
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
