"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout"
import { BudgetService, type Budget } from "@/lib/budgets"
import { ArrowLeft, Download, Edit, Trash2, Send, CheckCircle, XCircle } from "lucide-react"

export default function BudgetDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { authState } = useAuth()
  const [budget, setBudget] = useState<Budget | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    if (!authState.isAuthenticated) {
      router.push("/")
      return
    }

    if (params.id) {
      loadBudget()
    }
  }, [authState, router, params.id])

  const loadBudget = async () => {
    setLoading(true)
    const data = await BudgetService.getBudget(params.id as string)
    setBudget(data)
    setLoading(false)
  }

  const handleDownloadPDF = async () => {
    if (!budget) return

    const pdfBlob = await BudgetService.generatePDF(budget.id)
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `orcamento-${budget.budgetNumber}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } else {
      alert("Erro ao gerar PDF")
    }
  }

  const handleStatusChange = async (newStatus: Budget['status']) => {
    if (!budget) return

    setUpdatingStatus(true)
    try {
      await BudgetService.updateStatus(budget.id, newStatus)
      await loadBudget()
      alert("Status atualizado com sucesso!")
    } catch (error) {
      console.error("Erro ao atualizar status:", error)
      alert("Erro ao atualizar status")
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Carregando...</div>
        </div>
      </AuthenticatedLayout>
    )
  }

  if (!budget) {
    return (
      <AuthenticatedLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Orçamento não encontrado</div>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push("/budgets")}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
            Voltar
          </button>
          <h1 className="text-2xl font-bold flex-1">Orçamento {budget.budgetNumber}</h1>

          <div className="flex gap-2">
            {budget.status === 'draft' && (
              <button
                onClick={() => handleStatusChange('sent')}
                disabled={updatingStatus}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Send size={20} />
                Enviar
              </button>
            )}

            {budget.status === 'sent' && (
              <>
                <button
                  onClick={() => handleStatusChange('approved')}
                  disabled={updatingStatus}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle size={20} />
                  Aprovar
                </button>
                <button
                  onClick={() => handleStatusChange('rejected')}
                  disabled={updatingStatus}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircle size={20} />
                  Rejeitar
                </button>
              </>
            )}

            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download size={20} />
              Download PDF
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Informações do Orçamento</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Número</label>
                <p className="font-medium">{budget.budgetNumber}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Status</label>
                <p className="font-medium">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    budget.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                    budget.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                    budget.status === 'approved' ? 'bg-green-100 text-green-700' :
                    budget.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {BudgetService.getStatusLabel(budget.status)}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Data de Emissão</label>
                <p className="font-medium">{new Date(budget.issueDate).toLocaleDateString('pt-BR')}</p>
              </div>
              {budget.validityDate && (
                <div>
                  <label className="text-sm text-gray-500">Validade</label>
                  <p className="font-medium">{new Date(budget.validityDate).toLocaleDateString('pt-BR')}</p>
                </div>
              )}
            </div>
          </div>

          {budget.customerName && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">Dados do Cliente</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Nome</label>
                  <p className="font-medium">{budget.customerName}</p>
                </div>
                {budget.customerEmail && (
                  <div>
                    <label className="text-sm text-gray-500">E-mail</label>
                    <p className="font-medium">{budget.customerEmail}</p>
                  </div>
                )}
                {budget.customerPhone && (
                  <div>
                    <label className="text-sm text-gray-500">Telefone</label>
                    <p className="font-medium">{budget.customerPhone}</p>
                  </div>
                )}
                {budget.customerAddress && (
                  <div className="col-span-2">
                    <label className="text-sm text-gray-500">Endereço</label>
                    <p className="font-medium">{budget.customerAddress}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Itens</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantidade</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Preço Unit.</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {budget.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {BudgetService.formatPrice(item.unitPrice)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                        {BudgetService.formatPrice(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 pt-4 border-t flex flex-col items-end space-y-2">
              <div className="flex gap-8 items-center">
                <label className="text-sm font-medium">Subtotal:</label>
                <div className="text-lg font-semibold">{BudgetService.formatPrice(budget.subtotal)}</div>
              </div>

              {budget.discount > 0 && (
                <div className="flex gap-8 items-center">
                  <label className="text-sm font-medium">Desconto:</label>
                  <div className="text-lg font-semibold text-red-600">
                    - {BudgetService.formatPrice(budget.discount)}
                  </div>
                </div>
              )}

              <div className="flex gap-8 items-center">
                <label className="text-lg font-bold">TOTAL:</label>
                <div className="text-2xl font-bold text-blue-600">{BudgetService.formatPrice(budget.total)}</div>
              </div>
            </div>
          </div>

          {budget.notes && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">Observações</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{budget.notes}</p>
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  )
}
