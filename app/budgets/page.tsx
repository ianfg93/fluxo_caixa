"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout"
import { BudgetService, type Budget } from "@/lib/budgets"
import { Plus, FileText, Download, Eye, Trash2 } from "lucide-react"

export default function BudgetsPage() {
  const router = useRouter()
  const { authState } = useAuth()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("")

  useEffect(() => {
    if (!authState.isAuthenticated) {
      router.push("/")
      return
    }

    loadBudgets()
  }, [authState, router, statusFilter])

  const loadBudgets = async () => {
    setLoading(true)
    try {
      const filters = statusFilter ? { status: statusFilter } : undefined
      console.log('Carregando orçamentos com filtros:', filters)
      const data = await BudgetService.getBudgets(undefined, filters)
      console.log('Orçamentos carregados:', data)
      setBudgets(data)
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async (id: string, budgetNumber: string) => {
    try {
      console.log('Gerando PDF para orçamento:', id)
      const pdfBlob = await BudgetService.generatePDF(id)
      console.log('PDF gerado:', pdfBlob)

      if (pdfBlob) {
        const url = URL.createObjectURL(pdfBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `orcamento-${budgetNumber}.pdf`
        link.click()
        URL.revokeObjectURL(url)
        console.log('PDF baixado com sucesso')
      } else {
        console.error('PDF blob é nulo')
        alert('Erro ao gerar PDF')
      }
    } catch (error) {
      console.error('Erro ao baixar PDF:', error)
      alert('Erro ao baixar PDF')
    }
  }

  const handleDeleteBudget = async (id: string, budgetNumber: string) => {
    if (!confirm(`Tem certeza que deseja excluir o orçamento ${budgetNumber}?`)) {
      return
    }

    try {
      const success = await BudgetService.deleteBudget(id)
      if (success) {
        alert('Orçamento excluído com sucesso')
        loadBudgets()
      } else {
        alert('Erro ao excluir orçamento')
      }
    } catch (error) {
      console.error('Erro ao excluir orçamento:', error)
      alert('Erro ao excluir orçamento')
    }
  }

  const getStatusBadgeClass = (status: Budget['status']) => {
    const classes: Record<Budget['status'], string> = {
      draft: 'bg-gray-100 text-gray-700',
      sent: 'bg-blue-100 text-blue-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      expired: 'bg-orange-100 text-orange-700',
    }
    return classes[status] || classes.draft
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

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Orçamentos</h1>
          <div className="flex gap-2">
            {(authState.user?.role === 'master' || authState.user?.role === 'administrator') && (
              <button
                onClick={() => router.push("/budgets/templates")}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <FileText size={20} />
                Templates
              </button>
            )}
            <button
              onClick={() => router.push("/budgets/new")}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={20} />
              Novo Orçamento
            </button>
          </div>
        </div>

        <div className="mb-6 flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">Todos os Status</option>
            <option value="draft">Rascunho</option>
            <option value="sent">Enviado</option>
            <option value="approved">Aprovado</option>
            <option value="rejected">Rejeitado</option>
            <option value="expired">Expirado</option>
          </select>
        </div>

        {budgets.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">Nenhum orçamento encontrado</p>
            <button
              onClick={() => router.push("/budgets/new")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Criar Primeiro Orçamento
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Número
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {budgets.map((budget) => (
                  <tr key={budget.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {budget.budgetNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {budget.customerName || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(budget.issueDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {BudgetService.formatPrice(budget.total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(budget.status)}`}>
                        {BudgetService.getStatusLabel(budget.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => router.push(`/budgets/${budget.id}`)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalhes"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(budget.id, budget.budgetNumber)}
                          className="text-green-600 hover:text-green-900"
                          title="Download PDF"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteBudget(budget.id, budget.budgetNumber)}
                          className="text-red-600 hover:text-red-900"
                          title="Excluir orçamento"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  )
}
