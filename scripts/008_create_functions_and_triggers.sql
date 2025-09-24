-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Triggers para atualizar updated_at nas tabelas que têm esse campo
CREATE TRIGGER update_companies_updated_at 
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cash_flow_updated_at 
    BEFORE UPDATE ON cash_flow_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_payable_updated_at 
    BEFORE UPDATE ON accounts_payable
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar status de contas em atraso
CREATE OR REPLACE FUNCTION update_overdue_accounts()
RETURNS void AS $$
BEGIN
    UPDATE accounts_payable 
    SET status = 'overdue'
    WHERE status = 'pending' 
    AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Função para criar notificações automáticas de contas em atraso
CREATE OR REPLACE FUNCTION create_overdue_notifications()
RETURNS void AS $$
BEGIN
    -- Primeiro atualiza status das contas em atraso
    PERFORM update_overdue_accounts();
    
    -- Criar notificações por empresa para administradores
    INSERT INTO notifications (title, message, type, user_id, company_id, priority, action_url)
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
    FROM accounts_payable ap
    INNER JOIN users u ON u.company_id = ap.company_id 
    WHERE ap.status = 'overdue'
    AND u.user_type_id IN (
        SELECT id FROM user_types WHERE name IN ('administrator', 'master')
    )
    AND u.active = true
    -- Não criar notificação duplicada no mesmo dia
    AND NOT EXISTS (
        SELECT 1 FROM notifications n 
        WHERE n.message LIKE '%' || ap.description || '%'
        AND n.user_id = u.id
        AND n.created_at::date = CURRENT_DATE
    );
END;
$$ LANGUAGE plpgsql;

-- Função para verificar se usuário pode acessar dados de uma empresa
CREATE OR REPLACE FUNCTION user_can_access_company(user_uuid UUID, target_company_id UUID)
RETURNS boolean AS $$
DECLARE
    user_type_name VARCHAR(20);
    user_company_id UUID;
BEGIN
    SELECT ut.name, u.company_id 
    INTO user_type_name, user_company_id
    FROM users u 
    INNER JOIN user_types ut ON u.user_type_id = ut.id
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
$$ LANGUAGE plpgsql;

-- Função para obter empresas que um usuário pode acessar
CREATE OR REPLACE FUNCTION get_user_accessible_companies(user_uuid UUID)
RETURNS TABLE(company_id UUID, company_name VARCHAR(255), user_role VARCHAR(20)) AS $$
DECLARE
    user_type_name VARCHAR(20);
    user_company_id UUID;
BEGIN
    SELECT ut.name, u.company_id 
    INTO user_type_name, user_company_id
    FROM users u 
    INNER JOIN user_types ut ON u.user_type_id = ut.id
    WHERE u.id = user_uuid AND u.active = true;
    
    -- Master pode ver todas as empresas ativas
    IF user_type_name = 'master' THEN
        RETURN QUERY
        SELECT c.id, c.name, user_type_name::VARCHAR(20)
        FROM companies c
        WHERE c.active = true
        ORDER BY c.name;
    ELSE
        -- Outros usuários veem apenas sua empresa
        RETURN QUERY
        SELECT c.id, c.name, user_type_name::VARCHAR(20)
        FROM companies c
        WHERE c.id = user_company_id AND c.active = true;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Função para obter estatísticas de uma empresa
CREATE OR REPLACE FUNCTION get_company_stats(target_company_id UUID)
RETURNS JSONB AS $$
DECLARE
    stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_users', (
            SELECT COUNT(*) FROM users 
            WHERE company_id = target_company_id AND active = true
        ),
        'total_transactions', (
            SELECT COUNT(*) FROM cash_flow_transactions 
            WHERE company_id = target_company_id
        ),
        'pending_accounts', (
            SELECT COUNT(*) FROM accounts_payable 
            WHERE company_id = target_company_id AND status = 'pending'
        ),
        'overdue_accounts', (
            SELECT COUNT(*) FROM accounts_payable 
            WHERE company_id = target_company_id AND status = 'overdue'
        ),
        'total_files', (
            SELECT COUNT(*) FROM file_uploads 
            WHERE company_id = target_company_id AND status = 'active'
        )
    ) INTO stats;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- Trigger para marcar notificação como lida quando read_at é definido
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_read_trigger
    BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_notification_read_status();