-- Criar tabelas para sistema de orçamentos
-- Migration: 028

-- Tabela de modelos de orçamento
CREATE TABLE budget_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Dados do modelo
  name VARCHAR(255) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,

  -- Logo (armazenada como base64 ou URL)
  logo_url TEXT,
  logo_position VARCHAR(50) DEFAULT 'top-left' CHECK (logo_position IN ('top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right')),

  -- Conteúdo do template (HTML/texto formatado)
  header_text TEXT,
  footer_text TEXT,

  -- Configurações de estilo (JSON)
  styles JSONB DEFAULT '{"primaryColor": "#000000", "fontSize": "12px", "fontFamily": "Arial"}',

  -- Status
  active BOOLEAN DEFAULT TRUE,

  -- Auditoria
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tabela de orçamentos
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Relacionamento com modelo
  template_id UUID NOT NULL REFERENCES budget_templates(id),

  -- Informações do orçamento
  budget_number VARCHAR(50) UNIQUE NOT NULL,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_address TEXT,

  -- Datas
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  validity_date DATE,

  -- Valores
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- Observações
  notes TEXT,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired')),

  -- Auditoria
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tabela de itens do orçamento
CREATE TABLE budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relacionamento com orçamento
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,

  -- Referência a produto (opcional - pode ser item livre)
  product_id UUID REFERENCES products(id),

  -- Dados do item
  item_type VARCHAR(20) NOT NULL DEFAULT 'product' CHECK (item_type IN ('product', 'custom')),
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(15,2) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(15,2) NOT NULL CHECK (total_price >= 0),

  -- Ordem de exibição
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX idx_budget_templates_company_id ON budget_templates(company_id);
CREATE INDEX idx_budget_templates_active ON budget_templates(active);
CREATE INDEX idx_budgets_company_id ON budgets(company_id);
CREATE INDEX idx_budgets_template_id ON budgets(template_id);
CREATE INDEX idx_budgets_status ON budgets(status);
CREATE INDEX idx_budgets_created_by ON budgets(created_by);
CREATE INDEX idx_budgets_issue_date ON budgets(issue_date);
CREATE INDEX idx_budget_items_budget_id ON budget_items(budget_id);
CREATE INDEX idx_budget_items_product_id ON budget_items(product_id);

-- Constraint: Apenas um template padrão por empresa
CREATE UNIQUE INDEX idx_one_default_template_per_company
  ON budget_templates(company_id)
  WHERE is_default = TRUE AND active = TRUE;

-- Função para gerar número sequencial de orçamento
CREATE OR REPLACE FUNCTION generate_budget_number(p_company_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_year INTEGER;
  v_count INTEGER;
  v_number VARCHAR(50);
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);

  SELECT COUNT(*) + 1 INTO v_count
  FROM budgets
  WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM issue_date) = v_year;

  v_number := v_year || '-' || LPAD(v_count::TEXT, 4, '0');

  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_budget_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_budget_templates_updated_at
  BEFORE UPDATE ON budget_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_updated_at();

CREATE TRIGGER trigger_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_updated_at();

CREATE TRIGGER trigger_budget_items_updated_at
  BEFORE UPDATE ON budget_items
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_updated_at();

-- Comentários
COMMENT ON TABLE budget_templates IS 'Modelos de orçamento configuráveis';
COMMENT ON TABLE budgets IS 'Orçamentos criados';
COMMENT ON TABLE budget_items IS 'Itens de cada orçamento';
COMMENT ON COLUMN budget_templates.logo_position IS 'Posição da logo no template';
COMMENT ON COLUMN budget_templates.styles IS 'Configurações de estilo em JSON';
COMMENT ON COLUMN budgets.budget_number IS 'Número sequencial do orçamento (ANO-0001)';
COMMENT ON COLUMN budget_items.item_type IS 'Tipo: product (do estoque) ou custom (texto livre)';
