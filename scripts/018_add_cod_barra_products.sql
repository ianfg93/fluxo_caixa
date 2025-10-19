-- Adicionar coluna de código de barras
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS barcode VARCHAR(50);

-- Criar índice para busca rápida por código de barras
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

-- Comentário para documentação
COMMENT ON COLUMN products.barcode IS 'Código de barras do produto (EAN-13, EAN-8, UPC, etc)';