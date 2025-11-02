import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await ApiAuthService.authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const canEditAll = ApiAuthService.hasPermission(user, "edit_all");
    const canEditOwn = ApiAuthService.hasPermission(user, "edit_own");
    if (!canEditAll && !canEditOwn) {
      return NextResponse.json({ error: "Sem permissão para editar contas" }, { status: 403 });
    }

    const updates = await request.json();
    const { id } = params;

    // Validar vendorId (se veio)
    if (updates.vendorId !== undefined && updates.vendorId !== null) {
      const vendorCheck = await query(
        `SELECT id, name, cnpj, email, phone
           FROM vendors 
          WHERE id = $1::uuid AND company_id = $2::uuid`,
        [updates.vendorId, user.companyId]
      );
      if (vendorCheck.rows.length === 0) {
        return NextResponse.json({ error: "Fornecedor não encontrado" }, { status: 404 });
      }
    }

    // Checar existência e escopo (company) + permissão de "edit_own"
    let checkSql = `
      SELECT id, created_by, company_id
        FROM accounts_payable
       WHERE id = $1::uuid
    `;
    const checkParams: any[] = [id];

    if (user.role !== "master") {
      checkSql += ` AND company_id = $2::uuid`;
      checkParams.push(user.companyId!);
    }

    const checkResult = await query(checkSql, checkParams);
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    }

    const account = checkResult.rows[0];
    if (!canEditAll && canEditOwn && account.created_by !== user.id) {
      return NextResponse.json({ error: "Sem permissão para editar esta conta" }, { status: 403 });
    }

    // Normalizar payload (undefined -> null para campos opcionais)
    const norm = {
      description: updates.description ?? null,
      amount: updates.amount ?? null,
      issueDate: updates.issueDate ?? null,
      dueDate: updates.dueDate ?? null,
      status: updates.status ?? null,
      priority: updates.priority ?? null,
      category: updates.category ?? null,
      invoiceNumber: updates.invoiceNumber ?? null,
      notes: updates.notes ?? null,
      vendorId: updates.vendorId ?? null,
    };

    // Montar UPDATE
    let updateSql = `
      UPDATE accounts_payable
         SET description    = $1::text,
             amount         = $2::numeric,
             issue_date     = $3::date,
             due_date       = $4::date,
             status         = $5::text,
             priority       = $6::text,
             category       = $7::text,
             invoice_number = $8::text,
             notes          = $9::text,
             vendor_id      = $10::uuid,
             updated_at     = NOW()
       WHERE id = $11::uuid
    `;
    const updateParams: any[] = [
      norm.description,
      norm.amount,
      norm.issueDate ? norm.issueDate.slice(0, 10) : null,
      norm.dueDate ? norm.dueDate.slice(0, 10) : null,
      norm.status,
      norm.priority,
      norm.category,
      norm.invoiceNumber,
      norm.notes,
      norm.vendorId,
      id,
    ];

    if (user.role !== "master") {
      updateSql += ` AND company_id = $12::uuid`;
      updateParams.push(user.companyId!);
    }

    updateSql += ` RETURNING *;`;

    const result = await query(updateSql, updateParams);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Conta não encontrada para este tenant" }, { status: 404 });
    }

    // Buscar dados do vendor após atualizar
    const row = result.rows[0];
    let vendorData = null;
    
    if (row.vendor_id) {
      const vendorResult = await query(
        `SELECT name, cnpj, email, phone FROM vendors WHERE id = $1`,
        [row.vendor_id]
      );
      if (vendorResult.rows.length > 0) {
        vendorData = vendorResult.rows[0];
      }
    }

    const updatedAccount = {
      id: row.id,
      vendorId: row.vendor_id ?? null,
      vendorName: vendorData?.name ?? null,
      vendorDocument: vendorData?.cnpj ?? null,
      vendorEmail: vendorData?.email ?? null,
      vendorPhone: vendorData?.phone ?? null,
      description: row.description,
      amount: row.amount != null ? Number.parseFloat(row.amount) : null,
      issueDate: row.issue_date,
      dueDate: row.due_date,
      status: row.status,
      priority: row.priority,
      category: row.category,
      invoiceNumber: row.invoice_number,
      notes: row.notes,
      paidDate: row.payment_date ?? null,
      paidAmount: row.payment_amount != null ? Number.parseFloat(row.payment_amount) : null,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return NextResponse.json({ account: updatedAccount });
  } catch (error) {
    console.error("Error in PUT /api/accounts-payable/[id]:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const canDelete = ApiAuthService.hasPermission(user, 'delete_records') || ApiAuthService.hasPermission(user, 'delete_all')
    
    if (!canDelete) {
      return NextResponse.json({ error: "Sem permissão para deletar contas" }, { status: 403 })
    }

    const { id } = params

    let checkQuery = `
      SELECT id, company_id 
      FROM accounts_payable 
      WHERE id = $1
    `
    let checkParams = [id]

    if (user.role !== 'master') {
      checkQuery += ` AND company_id = $2`
      checkParams.push(user.companyId!)
    }

    const checkResult = await query(checkQuery, checkParams)
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 })
    }

    const result = await query(
      "DELETE FROM accounts_payable WHERE id = $1 RETURNING id",
      [id]
    )

    return NextResponse.json({ success: true, deletedId: result.rows[0].id })
  } catch (error) {
    console.error("Error in DELETE /api/accounts-payable/[id]:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}