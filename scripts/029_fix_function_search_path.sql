-- ============================================
-- CORREÇÃO: FUNCTION SEARCH PATH MUTABLE
-- Data: 2026-01-14
-- Descrição: Corrige vulnerabilidade de search_path em funções
--            Adiciona SET search_path = '' em todas as funções
--            para prevenir SQL injection via schema manipulation
-- ============================================

-- Referência: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- ============================================
-- PARTE 1: FUNÇÕES DE UPDATE TIMESTAMP
-- ============================================

-- 1. update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- 2. update_products_updated_at
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- 3. update_vendors_updated_at
CREATE OR REPLACE FUNCTION update_vendors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- 4. update_nfe_invoices_updated_at
CREATE OR REPLACE FUNCTION update_nfe_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- 5. update_nfe_items_updated_at
CREATE OR REPLACE FUNCTION update_nfe_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- 6. update_notification_read_status
CREATE OR REPLACE FUNCTION update_notification_read_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Se read_at foi definido e read ainda é false, marcar como true
    IF NEW.read_at IS NOT NULL AND NEW.read = false THEN
        NEW.read = true;
    END IF;

    -- Se read foi marcado como true e read_at é null, definir read_at
    IF NEW.read = true AND OLD.read = false AND NEW.read_at IS NULL THEN
        NEW.read_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- ============================================
-- PARTE 2: FUNÇÕES DE BUSINESS LOGIC
-- ============================================

-- 7. update_overdue_accounts
CREATE OR REPLACE FUNCTION update_overdue_accounts()
RETURNS void AS $$
BEGIN
    UPDATE public.accounts_payable
    SET status = 'overdue'
    WHERE status = 'pending'
    AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- 8. create_overdue_notifications
CREATE OR REPLACE FUNCTION create_overdue_notifications()
RETURNS void AS $$
BEGIN
    -- Primeiro atualiza status das contas em atraso
    PERFORM public.update_overdue_accounts();

    -- Criar notificações por empresa para administradores
    INSERT INTO public.notifications (title, message, type, user_id, company_id, priority, action_url)
    SELECT
        'Conta em Atraso',
        'A conta "' || ap.description || '" do fornecedor ' || ap.supplier_name ||
        ' está em atraso desde ' || ap.due_date::text || '. Valor: R$ ' || ap.amount::text,
        'warning',
        u.id,
        ap.company_id,
        CASE
            WHEN ap.priority = 'urgent' THEN 'urgent'
            WHEN ap.priority = 'high' THEN 'high'
            ELSE 'normal'
        END,
        '/accounts-payable/' || ap.id::text
    FROM public.accounts_payable ap
    INNER JOIN public.users u ON u.company_id = ap.company_id
    WHERE ap.status = 'overdue'
    AND u.user_type_id IN (
        SELECT id FROM public.user_types WHERE name IN ('administrator', 'master')
    )
    AND u.active = true
    -- Não criar notificação duplicada no mesmo dia
    AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.message LIKE '%' || ap.description || '%'
        AND n.user_id = u.id
        AND n.created_at::date = CURRENT_DATE
    );
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- 9. user_can_access_company
CREATE OR REPLACE FUNCTION user_can_access_company(user_uuid UUID, target_company_id UUID)
RETURNS boolean AS $$
DECLARE
    user_type_name VARCHAR(20);
    user_company_id UUID;
BEGIN
    SELECT ut.name, u.company_id
    INTO user_type_name, user_company_id
    FROM public.users u
    INNER JOIN public.user_types ut ON u.user_type_id = ut.id
    WHERE u.id = user_uuid AND u.active = true;

    -- Se não encontrou o usuário
    IF user_type_name IS NULL THEN
        RETURN false;
    END IF;

    -- Master pode acessar qualquer empresa
    IF user_type_name = 'master' THEN
        RETURN true;
    END IF;

    -- Outros usuários só podem acessar sua própria empresa
    RETURN user_company_id = target_company_id;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- 10. get_user_accessible_companies
CREATE OR REPLACE FUNCTION get_user_accessible_companies(user_uuid UUID)
RETURNS TABLE(company_id UUID, company_name VARCHAR(255), user_role VARCHAR(20)) AS $$
DECLARE
    user_type_name VARCHAR(20);
    user_company_id UUID;
BEGIN
    SELECT ut.name, u.company_id
    INTO user_type_name, user_company_id
    FROM public.users u
    INNER JOIN public.user_types ut ON u.user_type_id = ut.id
    WHERE u.id = user_uuid AND u.active = true;

    -- Master pode ver todas as empresas ativas
    IF user_type_name = 'master' THEN
        RETURN QUERY
        SELECT c.id, c.name, user_type_name::VARCHAR(20)
        FROM public.companies c
        WHERE c.active = true
        ORDER BY c.name;
    ELSE
        -- Outros usuários veem apenas sua empresa
        RETURN QUERY
        SELECT c.id, c.name, user_type_name::VARCHAR(20)
        FROM public.companies c
        WHERE c.id = user_company_id AND c.active = true;
    END IF;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- 11. get_company_stats
CREATE OR REPLACE FUNCTION get_company_stats(target_company_id UUID)
RETURNS JSONB AS $$
DECLARE
    stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_users', (
            SELECT COUNT(*) FROM public.users
            WHERE company_id = target_company_id AND active = true
        ),
        'total_transactions', (
            SELECT COUNT(*) FROM public.cash_flow_transactions
            WHERE company_id = target_company_id
        ),
        'pending_accounts', (
            SELECT COUNT(*) FROM public.accounts_payable
            WHERE company_id = target_company_id AND status = 'pending'
        ),
        'overdue_accounts', (
            SELECT COUNT(*) FROM public.accounts_payable
            WHERE company_id = target_company_id AND status = 'overdue'
        ),
        'total_files', (
            SELECT COUNT(*) FROM public.file_uploads
            WHERE company_id = target_company_id AND status = 'active'
        )
    ) INTO stats;

    RETURN stats;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- ============================================
-- PARTE 3: FUNÇÕES DE NFE (VERSÃO MAIS RECENTE)
-- ============================================

-- 12. update_stock_from_nfe (da migration 021)
CREATE OR REPLACE FUNCTION update_stock_from_nfe()
RETURNS TRIGGER AS $$
BEGIN
    -- Só atualiza estoque se for nota de entrada (tipo 1)
    IF NEW.tipo = 1 AND NEW.status = 'approved' THEN
        -- Atualizar estoque para cada item da nota
        UPDATE public.products p
        SET
            stock_quantity = stock_quantity + ni.quantity,
            updated_at = NOW()
        FROM public.nfe_items ni
        WHERE
            ni.nfe_id = NEW.id
            AND (
                p.cod_barra = ni.product_code
                OR p.name ILIKE '%' || ni.product_name || '%'
            )
            AND p.company_id = NEW.company_id;

        -- Registrar movimentação de estoque
        INSERT INTO public.stock_movements (
            product_id,
            company_id,
            quantity,
            type,
            reference_type,
            reference_id,
            notes,
            created_at
        )
        SELECT
            p.id,
            NEW.company_id,
            ni.quantity,
            'IN',  -- Entrada de estoque
            'nfe',
            NEW.id,
            'Entrada via NFe ' || NEW.nfe_number || ' - ' || ni.product_name,
            NOW()
        FROM public.nfe_items ni
        LEFT JOIN public.products p ON (
            p.cod_barra = ni.product_code
            OR p.name ILIKE '%' || ni.product_name || '%'
        )
        WHERE
            ni.nfe_id = NEW.id
            AND p.company_id = NEW.company_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- 13. create_accounts_payable_from_nfe (da migration 020)
CREATE OR REPLACE FUNCTION create_accounts_payable_from_nfe()
RETURNS TRIGGER AS $$
DECLARE
    installment_value NUMERIC;
    due_date DATE;
    payment_category_value TEXT;
BEGIN
    -- Só cria conta a pagar se for nota de entrada e aprovada
    IF NEW.tipo = 1 AND NEW.status = 'approved' AND NEW.total_value > 0 THEN
        -- Obter categoria de pagamento da NFe ou usar padrão
        payment_category_value := COALESCE(NEW.payment_category, 'operational_expenses');

        -- Se tem parcelas definidas
        IF NEW.installments > 0 THEN
            installment_value := NEW.total_value / NEW.installments;

            -- Criar uma conta a pagar para cada parcela
            FOR i IN 1..NEW.installments LOOP
                due_date := NEW.issue_date + (i * 30); -- 30 dias entre parcelas

                INSERT INTO public.accounts_payable (
                    company_id,
                    supplier_name,
                    description,
                    amount,
                    due_date,
                    status,
                    category,
                    payment_method,
                    reference_type,
                    reference_id,
                    notes,
                    priority,
                    created_at,
                    updated_at
                ) VALUES (
                    NEW.company_id,
                    NEW.supplier_name,
                    'NFe ' || NEW.nfe_number || ' - Parcela ' || i || '/' || NEW.installments,
                    installment_value,
                    due_date,
                    'pending',
                    payment_category_value,
                    NEW.payment_method,
                    'nfe',
                    NEW.id,
                    'Gerado automaticamente da NFe ' || NEW.nfe_number,
                    'normal',
                    NOW(),
                    NOW()
                );
            END LOOP;
        ELSE
            -- Sem parcelas, criar uma única conta com vencimento em 30 dias
            INSERT INTO public.accounts_payable (
                company_id,
                supplier_name,
                description,
                amount,
                due_date,
                status,
                category,
                payment_method,
                reference_type,
                reference_id,
                notes,
                priority,
                created_at,
                updated_at
            ) VALUES (
                NEW.company_id,
                NEW.supplier_name,
                'NFe ' || NEW.nfe_number,
                NEW.total_value,
                NEW.issue_date + 30,
                'pending',
                payment_category_value,
                NEW.payment_method,
                'nfe',
                NEW.id,
                'Gerado automaticamente da NFe ' || NEW.nfe_number,
                'normal',
                NOW(),
                NOW()
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

-- Listar todas as funções e seus search_path
SELECT
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    CASE
        WHEN p.proconfig IS NULL THEN 'NOT SET (VULNERABLE)'
        WHEN array_to_string(p.proconfig, ',') LIKE '%search_path%' THEN 'PROTECTED'
        ELSE 'NOT SET (VULNERABLE)'
    END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'update_updated_at_column',
    'update_products_updated_at',
    'update_vendors_updated_at',
    'update_nfe_invoices_updated_at',
    'update_nfe_items_updated_at',
    'update_notification_read_status',
    'update_overdue_accounts',
    'create_overdue_notifications',
    'user_can_access_company',
    'get_user_accessible_companies',
    'get_company_stats',
    'update_stock_from_nfe',
    'create_accounts_payable_from_nfe'
)
ORDER BY p.proname;
