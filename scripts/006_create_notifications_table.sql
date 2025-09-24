-- Criar tabela de notificações (versão corrigida)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Multi-tenant (NULL para notificações globais do sistema)
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Destinatário
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Conteúdo da notificação
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success', 'reminder')),
  
  -- Status
  read BOOLEAN DEFAULT false NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Prioridade
  priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Dados adicionais
  action_url VARCHAR(500), -- URL para ação relacionada
  action_label VARCHAR(50), -- Texto do botão de ação
  metadata JSONB DEFAULT '{}', -- Dados extras em JSON
  
  -- Agendamento
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_company_id ON notifications(company_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_scheduled_for ON notifications(scheduled_for);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Índices compostos para consultas comuns
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read, scheduled_for) WHERE read = false;
CREATE INDEX idx_notifications_company_unread ON notifications(company_id, read, scheduled_for) WHERE read = false;