-- Fix: Update trigger to use 'exit' instead of 'expense' for cash flow transactions
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
