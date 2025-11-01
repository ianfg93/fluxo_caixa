-- Fix: Update stock movement trigger to use 'adjustment' instead of 'purchase'
-- The stock_movements table only accepts: 'sale', 'adjustment', 'return'

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
