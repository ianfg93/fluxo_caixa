-- Criar tabela de uploads de arquivos (versão corrigida)
CREATE TABLE file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Multi-tenant
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Dados do arquivo
  filename VARCHAR(255) NOT NULL, -- Nome do arquivo no sistema
  original_name VARCHAR(255) NOT NULL, -- Nome original do arquivo
  file_size INTEGER NOT NULL CHECK (file_size > 0),
  mime_type VARCHAR(100) NOT NULL,
  file_path VARCHAR(500) NOT NULL, -- Caminho completo do arquivo
  
  -- Hash para verificação de integridade
  file_hash VARCHAR(64),
  
  -- Referência flexível para qualquer entidade
  reference_type VARCHAR(50) NOT NULL, -- 'cash_flow', 'accounts_payable', 'company', 'user', etc.
  reference_id UUID NOT NULL, -- ID da entidade referenciada
  
  -- Metadados adicionais
  description TEXT,
  tags TEXT[], -- Array de tags para organização
  is_public BOOLEAN DEFAULT false, -- Se pode ser acessado publicamente
  
  -- Status do arquivo
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'deleted', 'archived')),
  
  -- Auditoria
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX idx_file_uploads_company_id ON file_uploads(company_id);
CREATE INDEX idx_file_uploads_reference ON file_uploads(reference_type, reference_id);
CREATE INDEX idx_file_uploads_uploaded_by ON file_uploads(uploaded_by);
CREATE INDEX idx_file_uploads_status ON file_uploads(status);
CREATE INDEX idx_file_uploads_mime_type ON file_uploads(mime_type);
CREATE INDEX idx_file_uploads_created_at ON file_uploads(created_at);

-- Constraint: tipos de arquivo permitidos (apenas imagens e PDFs)
ALTER TABLE file_uploads ADD CONSTRAINT check_allowed_file_types 
CHECK (mime_type IN (
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml',
  'application/pdf'
));

-- Constraint: tamanho máximo de arquivo (50MB)
ALTER TABLE file_uploads ADD CONSTRAINT check_max_file_size 
CHECK (file_size <= 52428800); -- 50MB em bytes