-- Adicionar coluna de valor/preço aos produtos
ALTER TABLE products
ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0);

-- Adicionar índice para consultas de preço
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

-- Comentário explicativo
COMMENT ON COLUMN products.price IS 'Preço unitário do produto em reais';