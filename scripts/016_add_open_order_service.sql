-- Tabela de comandas/vendas abertas
CREATE TABLE open_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Multi-tenant
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Identificação da comanda
  order_number VARCHAR(50) NOT NULL, -- Ex: "Mesa 1", "Comanda #001", "Cliente João"
  
  -- Status
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  
  -- Totais (calculados)
  subtotal DECIMAL(15,2) DEFAULT 0 CHECK (subtotal >= 0),
  extra_amount DECIMAL(15,2) DEFAULT 0 CHECK (extra_amount >= 0),
  total_amount DECIMAL(15,2) DEFAULT 0 CHECK (total_amount >= 0),
  
  -- Observações
  notes TEXT,
  
  -- Auditoria
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by UUID REFERENCES users(id)
);

-- Tabela de itens das comandas
CREATE TABLE open_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamento
  order_id UUID NOT NULL REFERENCES open_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  
  -- Dados do item
  product_name VARCHAR(255) NOT NULL, -- Guarda o nome para histórico
  product_price DECIMAL(15,2) NOT NULL CHECK (product_price > 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  subtotal DECIMAL(15,2) NOT NULL CHECK (subtotal > 0),
  
  -- Auditoria
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX idx_open_orders_company_id ON open_orders(company_id);
CREATE INDEX idx_open_orders_status ON open_orders(status);
CREATE INDEX idx_open_orders_created_by ON open_orders(created_by);
CREATE INDEX idx_open_order_items_order_id ON open_order_items(order_id);
CREATE INDEX idx_open_order_items_product_id ON open_order_items(product_id);

-- Constraint única: não pode ter duas comandas abertas com o mesmo número na mesma empresa
CREATE UNIQUE INDEX idx_open_orders_unique_number ON open_orders(company_id, order_number) 
WHERE status = 'open';