-- Criar tabela de Notas Fiscais de Entrada (NF-e)
CREATE TABLE IF NOT EXISTS nfe_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Dados do fornecedor
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,

  -- Dados da NF-e
  nfe_number VARCHAR(20) NOT NULL,
  nfe_series VARCHAR(5) NOT NULL,
  nfe_access_key VARCHAR(44) UNIQUE, -- Chave de acesso da NF-e (44 dígitos)
  nfe_protocol VARCHAR(20), -- Protocolo de autorização

  -- Datas importantes
  issue_date DATE NOT NULL,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Valores da nota
  total_products DECIMAL(15,2) NOT NULL CHECK (total_products >= 0),
  total_tax DECIMAL(15,2) DEFAULT 0 CHECK (total_tax >= 0),
  freight_value DECIMAL(15,2) DEFAULT 0 CHECK (freight_value >= 0),
  insurance_value DECIMAL(15,2) DEFAULT 0 CHECK (insurance_value >= 0),
  discount_value DECIMAL(15,2) DEFAULT 0 CHECK (discount_value >= 0),
  other_expenses DECIMAL(15,2) DEFAULT 0 CHECK (other_expenses >= 0),
  total_invoice DECIMAL(15,2) NOT NULL CHECK (total_invoice >= 0),

  -- Informações de pagamento
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partially_paid', 'overdue')),
  payment_method VARCHAR(50), -- Boleto, Transferência, Cartão, Dinheiro, PIX, etc.
  payment_terms VARCHAR(100), -- Exemplo: "30/60/90 dias", "À vista", etc.
  installments INTEGER DEFAULT 1 CHECK (installments > 0),

  -- Primeira parcela (para integração com contas a pagar)
  first_due_date DATE,

  -- Informações fiscais
  icms_value DECIMAL(15,2) DEFAULT 0,
  ipi_value DECIMAL(15,2) DEFAULT 0,
  pis_value DECIMAL(15,2) DEFAULT 0,
  cofins_value DECIMAL(15,2) DEFAULT 0,

  -- Dados adicionais
  operation_type VARCHAR(50) NOT NULL DEFAULT 'purchase', -- purchase, return, transfer, etc.
  cfop VARCHAR(10), -- Código Fiscal de Operações e Prestações
  notes TEXT,

  -- Controle de estoque
  stock_updated BOOLEAN DEFAULT FALSE,
  stock_updated_at TIMESTAMP WITH TIME ZONE,
  stock_updated_by UUID REFERENCES users(id),

  -- Relacionamento com contas a pagar
  accounts_payable_created BOOLEAN DEFAULT FALSE,

  -- Status da nota
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'returned')),
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID REFERENCES users(id),

  -- Arquivo XML da NF-e
  xml_file_id UUID REFERENCES file_uploads(id) ON DELETE SET NULL,
  pdf_file_id UUID REFERENCES file_uploads(id) ON DELETE SET NULL,

  -- Auditoria
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Constraint: Número da nota único por empresa
  UNIQUE(company_id, nfe_number, nfe_series)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_nfe_invoices_company_id ON nfe_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_nfe_invoices_vendor_id ON nfe_invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_nfe_invoices_nfe_number ON nfe_invoices(nfe_number);
CREATE INDEX IF NOT EXISTS idx_nfe_invoices_issue_date ON nfe_invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_nfe_invoices_payment_status ON nfe_invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_nfe_invoices_status ON nfe_invoices(status);
CREATE INDEX IF NOT EXISTS idx_nfe_invoices_created_by ON nfe_invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_nfe_invoices_company_status ON nfe_invoices(company_id, status);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_nfe_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS nfe_invoices_updated_at ON nfe_invoices;
CREATE TRIGGER nfe_invoices_updated_at
BEFORE UPDATE ON nfe_invoices
FOR EACH ROW
EXECUTE FUNCTION update_nfe_invoices_updated_at();

-- Criar tabela de itens da NF-e
CREATE TABLE IF NOT EXISTS nfe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relacionamento com a NF-e
  nfe_invoice_id UUID NOT NULL REFERENCES nfe_invoices(id) ON DELETE CASCADE,

  -- Dados do produto
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,

  -- Informações do item na nota
  item_number INTEGER NOT NULL, -- Número sequencial do item na nota
  product_code VARCHAR(50), -- Código do produto na NF-e (pode ser diferente do cadastro)
  product_description VARCHAR(255) NOT NULL,

  -- Unidade de medida
  unit VARCHAR(10) NOT NULL DEFAULT 'UN', -- UN, KG, M, CX, etc.

  -- Quantidades
  quantity DECIMAL(15,4) NOT NULL CHECK (quantity > 0),

  -- Valores
  unit_price DECIMAL(15,2) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(15,2) NOT NULL CHECK (total_price >= 0),
  discount DECIMAL(15,2) DEFAULT 0 CHECK (discount >= 0),

  -- Impostos
  icms_percentage DECIMAL(5,2) DEFAULT 0,
  icms_value DECIMAL(15,2) DEFAULT 0,
  ipi_percentage DECIMAL(5,2) DEFAULT 0,
  ipi_value DECIMAL(15,2) DEFAULT 0,

  -- NCM (Nomenclatura Comum do Mercosul)
  ncm VARCHAR(10),

  -- CEST (Código Especificador da Substituição Tributária)
  cest VARCHAR(10),

  -- CFOP do item
  cfop VARCHAR(10),

  -- Observações do item
  notes TEXT,

  -- Controle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Constraint: Item único por nota
  UNIQUE(nfe_invoice_id, item_number)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_nfe_items_nfe_invoice_id ON nfe_items(nfe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_nfe_items_product_id ON nfe_items(product_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_nfe_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS nfe_items_updated_at ON nfe_items;
CREATE TRIGGER nfe_items_updated_at
BEFORE UPDATE ON nfe_items
FOR EACH ROW
EXECUTE FUNCTION update_nfe_items_updated_at();

-- Função para atualizar estoque automaticamente ao cadastrar NF-e
CREATE OR REPLACE FUNCTION update_stock_from_nfe()
RETURNS TRIGGER AS $$
DECLARE
  v_item RECORD;
  v_current_quantity INTEGER;
BEGIN
  -- Apenas atualiza estoque se for uma NF-e de compra ativa e ainda não foi processada
  IF NEW.operation_type = 'purchase' AND NEW.status = 'active' AND NEW.stock_updated = FALSE THEN

    -- Atualizar quantidade de cada produto
    FOR v_item IN
      SELECT product_id, quantity
      FROM nfe_items
      WHERE nfe_invoice_id = NEW.id
    LOOP
      -- Buscar quantidade atual
      SELECT quantity INTO v_current_quantity
      FROM products
      WHERE id = v_item.product_id;

      -- Atualizar estoque (adicionar quantidade)
      UPDATE products
      SET quantity = quantity + v_item.quantity::INTEGER
      WHERE id = v_item.product_id;

      -- Registrar movimento de estoque
      INSERT INTO stock_movements (
        product_id,
        quantity,
        type,
        notes,
        created_by
      ) VALUES (
        v_item.product_id,
        v_item.quantity::INTEGER,
        'adjustment',
        'Entrada via NF-e: ' || NEW.nfe_number || '/' || NEW.nfe_series,
        NEW.created_by
      );
    END LOOP;

    -- Marcar como estoque atualizado
    NEW.stock_updated = TRUE;
    NEW.stock_updated_at = NOW();
    NEW.stock_updated_by = NEW.created_by;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stock_from_nfe ON nfe_invoices;
CREATE TRIGGER trigger_update_stock_from_nfe
BEFORE INSERT ON nfe_invoices
FOR EACH ROW
EXECUTE FUNCTION update_stock_from_nfe();

-- Função para criar contas a pagar automaticamente
CREATE OR REPLACE FUNCTION create_accounts_payable_from_nfe()
RETURNS TRIGGER AS $$
DECLARE
  v_installment_value DECIMAL(15,2);
  v_due_date DATE;
  v_i INTEGER;
BEGIN
  -- Apenas cria contas a pagar se for uma NF-e de compra ativa, não foi paga à vista e ainda não foi processada
  IF NEW.operation_type = 'purchase'
     AND NEW.status = 'active'
     AND NEW.payment_status = 'pending'
     AND NEW.accounts_payable_created = FALSE
     AND NEW.first_due_date IS NOT NULL THEN

    -- Calcular valor de cada parcela
    v_installment_value = NEW.total_invoice / NEW.installments;

    -- Criar uma conta a pagar para cada parcela
    FOR v_i IN 1..NEW.installments LOOP
      -- Calcular data de vencimento de cada parcela
      -- Assumindo que cada parcela vence 30 dias após a anterior
      v_due_date = NEW.first_due_date + ((v_i - 1) * 30);

      INSERT INTO accounts_payable (
        company_id,
        vendor_id,
        description,
        amount,
        issue_date,
        due_date,
        status,
        category,
        invoice_number,
        notes,
        created_by
      ) VALUES (
        NEW.company_id,
        NEW.vendor_id,
        'NF-e ' || NEW.nfe_number || '/' || NEW.nfe_series ||
          CASE
            WHEN NEW.installments > 1 THEN ' - Parcela ' || v_i || '/' || NEW.installments
            ELSE ''
          END,
        v_installment_value,
        NEW.issue_date,
        v_due_date,
        'pending',
        'Compra de Mercadorias',
        NEW.nfe_number || '/' || NEW.nfe_series,
        'Gerado automaticamente via NF-e. ' || COALESCE(NEW.notes, ''),
        NEW.created_by
      );
    END LOOP;

    -- Marcar como contas a pagar criadas
    NEW.accounts_payable_created = TRUE;
  END IF;

  -- Se foi marcado como pago no cadastro, criar lançamento no fluxo de caixa
  IF NEW.payment_status = 'paid' AND NEW.operation_type = 'purchase' THEN
    INSERT INTO cash_flow_transactions (
      company_id,
      type,
      category,
      subcategory,
      amount,
      description,
      transaction_date,
      payment_method,
      created_by
    ) VALUES (
      NEW.company_id,
      'exit',
      'Compras',
      'Mercadorias',
      NEW.total_invoice,
      'NF-e ' || NEW.nfe_number || '/' || NEW.nfe_series || ' - ' ||
        (SELECT name FROM vendors WHERE id = NEW.vendor_id),
      NEW.receipt_date,
      COALESCE(NEW.payment_method, 'Não especificado'),
      NEW.created_by
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_accounts_payable_from_nfe ON nfe_invoices;
CREATE TRIGGER trigger_create_accounts_payable_from_nfe
BEFORE INSERT ON nfe_invoices
FOR EACH ROW
EXECUTE FUNCTION create_accounts_payable_from_nfe();

-- Adicionar coluna para referenciar NF-e em stock_movements
ALTER TABLE stock_movements
ADD COLUMN IF NOT EXISTS nfe_invoice_id UUID REFERENCES nfe_invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stock_movements_nfe_invoice_id ON stock_movements(nfe_invoice_id);

-- Adicionar coluna para referenciar NF-e em accounts_payable
ALTER TABLE accounts_payable
ADD COLUMN IF NOT EXISTS nfe_invoice_id UUID REFERENCES nfe_invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_accounts_payable_nfe_invoice_id ON accounts_payable(nfe_invoice_id);
