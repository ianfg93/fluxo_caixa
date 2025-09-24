-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cash_flow_updated_at BEFORE UPDATE ON cash_flow_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_payable_updated_at BEFORE UPDATE ON accounts_payable
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para criar notificações automáticas
CREATE OR REPLACE FUNCTION create_overdue_notifications()
RETURNS void AS $$
BEGIN
    INSERT INTO notifications (title, message, type, user_id)
    SELECT 
        'Conta em Atraso',
        'A conta "' || description || '" do fornecedor ' || supplier_name || ' está em atraso.',
        'warning',
        u.id
    FROM accounts_payable ap
    CROSS JOIN users u
    WHERE ap.status = 'pending' 
    AND ap.due_date < CURRENT_DATE
    AND u.role IN ('manager', 'master')
    AND NOT EXISTS (
        SELECT 1 FROM notifications n 
        WHERE n.message LIKE '%' || ap.description || '%' 
        AND n.created_at::date = CURRENT_DATE
    );
END;
$$ LANGUAGE plpgsql;
