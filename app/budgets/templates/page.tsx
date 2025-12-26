"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout"
import { BudgetTemplateService, type BudgetTemplate } from "@/lib/budget-templates"
import { Plus, Edit, Trash2, Star, Upload, X, Image as ImageIcon } from "lucide-react"

export default function BudgetTemplatesPage() {
  const router = useRouter()
  const { authState } = useAuth()
  const [templates, setTemplates] = useState<BudgetTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<BudgetTemplate | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>("")
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    isDefault: false,
    logoUrl: "",
    logoPosition: "top-center" as BudgetTemplate['logoPosition'],
    headerText: "",
    footerText: "",
    active: true,
    styles: {
      primaryColor: "#2563eb",
      fontSize: "12px",
      fontFamily: "Arial",
    },
  })

  useEffect(() => {
    console.log('AuthState:', authState)
    console.log('User role:', authState.user?.role)

    if (!authState.isAuthenticated) {
      console.log('Usuário não autenticado, redirecionando...')
      router.push("/")
      return
    }

    if (authState.user?.role !== 'master' && authState.user?.role !== 'administrator') {
      console.log('Usuário sem permissão, redirecionando para dashboard...')
      router.push("/dashboard")
      return
    }

    console.log('Usuário autorizado, carregando templates...')
    loadTemplates()
  }, [authState, router])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      console.log('Carregando templates...')
      const data = await BudgetTemplateService.getTemplates()
      console.log('Templates carregados:', data)
      setTemplates(data)
    } catch (error) {
      console.error('Erro ao carregar templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      // Criar preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
        setFormData({ ...formData, logoUrl: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview("")
    setFormData({ ...formData, logoUrl: "" })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Se há um arquivo de logo para fazer upload
      if (logoFile && !formData.logoUrl.startsWith('data:')) {
        setUploadingLogo(true)
        const logoUrl = await BudgetTemplateService.uploadLogo(logoFile)
        if (logoUrl) {
          formData.logoUrl = logoUrl
        }
        setUploadingLogo(false)
      }

      if (editingTemplate) {
        const updated = await BudgetTemplateService.updateTemplate(editingTemplate.id, formData)
        if (updated) {
          await loadTemplates()
          resetForm()
        }
      } else {
        const created = await BudgetTemplateService.createTemplate(formData)
        if (created) {
          await loadTemplates()
          resetForm()
        }
      }
    } catch (error) {
      console.error('Erro ao salvar template:', error)
      alert('Erro ao salvar template')
      setUploadingLogo(false)
    }
  }

  const handleEdit = (template: BudgetTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      isDefault: template.isDefault,
      logoUrl: template.logoUrl || "",
      logoPosition: template.logoPosition,
      headerText: template.headerText || "",
      footerText: template.footerText || "",
      active: template.active,
      styles: template.styles,
    })
    if (template.logoUrl) {
      setLogoPreview(template.logoUrl)
    }
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este template?")) return

    const success = await BudgetTemplateService.deleteTemplate(id)
    if (success) {
      await loadTemplates()
    } else {
      alert("Erro ao deletar template. Verifique se não há orçamentos usando este template.")
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      isDefault: false,
      logoUrl: "",
      logoPosition: "top-center",
      headerText: "",
      footerText: "",
      active: true,
      styles: {
        primaryColor: "#2563eb",
        fontSize: "12px",
        fontFamily: "Arial",
      },
    })
    setLogoFile(null)
    setLogoPreview("")
    setEditingTemplate(null)
    setShowForm(false)
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
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Modelos de Orçamento</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Novo Template
          </button>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingTemplate ? "Editar Template" : "Novo Template"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Informações Básicas */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-medium mb-3">Informações Básicas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Nome do Template</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Template Corporativo"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isDefault" className="text-sm font-medium">
                      Marcar como template padrão
                    </label>
                  </div>
                </div>
              </div>

              {/* Logo */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-medium mb-3">Logo da Empresa</h3>
                <div className="space-y-4">
                  {logoPreview ? (
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-40 h-40 object-contain border rounded-lg bg-gray-50"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-2">Logo carregada com sucesso</p>
                        <label className="cursor-pointer">
                          <span className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                            <Upload size={16} />
                            Alterar Logo
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <ImageIcon className="w-10 h-10 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Clique para fazer upload</span> ou arraste a logo
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG ou GIF (MAX. 2MB)</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </label>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2">Posição da Logo no PDF</label>
                    <select
                      value={formData.logoPosition}
                      onChange={(e) => setFormData({ ...formData, logoPosition: e.target.value as BudgetTemplate['logoPosition'] })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="top-left">Superior Esquerda</option>
                      <option value="top-center">Superior Centro</option>
                      <option value="top-right">Superior Direita</option>
                      <option value="bottom-left">Inferior Esquerda</option>
                      <option value="bottom-center">Inferior Centro</option>
                      <option value="bottom-right">Inferior Direita</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Textos Personalizados */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-medium mb-3">Textos Personalizados</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Texto do Cabeçalho</label>
                    <textarea
                      value={formData.headerText}
                      onChange={(e) => setFormData({ ...formData, headerText: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Texto que aparecerá no topo do orçamento..."
                    />
                    <p className="text-xs text-gray-500 mt-1">Este texto aparecerá logo após o número do orçamento</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Texto do Rodapé</label>
                    <textarea
                      value={formData.footerText}
                      onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Texto que aparecerá no rodapé do orçamento..."
                    />
                    <p className="text-xs text-gray-500 mt-1">Este texto aparecerá no final do PDF</p>
                  </div>
                </div>
              </div>

              {/* Personalização de Cores */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-medium mb-3">Cores e Estilo</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Cor Principal</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={formData.styles.primaryColor}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            styles: { ...formData.styles, primaryColor: e.target.value },
                          })
                        }
                        className="w-16 h-10 rounded border cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.styles.primaryColor}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            styles: { ...formData.styles, primaryColor: e.target.value },
                          })
                        }
                        className="flex-1 px-3 py-2 border rounded-lg"
                        placeholder="#2563eb"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Cor usada nos títulos e destaques</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Tamanho da Fonte</label>
                    <select
                      value={formData.styles.fontSize}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          styles: { ...formData.styles, fontSize: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="10px">Pequena (10px)</option>
                      <option value="12px">Normal (12px)</option>
                      <option value="14px">Grande (14px)</option>
                      <option value="16px">Muito Grande (16px)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Fonte</label>
                    <select
                      value={formData.styles.fontFamily}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          styles: { ...formData.styles, fontFamily: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="Arial">Arial</option>
                      <option value="Helvetica">Helvetica</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Courier">Courier</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={uploadingLogo}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {uploadingLogo ? 'Enviando logo...' : (editingTemplate ? "Atualizar" : "Criar Template")}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Templates */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow border"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  {template.name}
                  {template.isDefault && (
                    <Star size={18} className="text-yellow-500 fill-yellow-500" />
                  )}
                </h3>
              </div>

              {template.logoUrl && (
                <div className="mb-3">
                  <img
                    src={template.logoUrl}
                    alt="Logo"
                    className="h-16 object-contain"
                  />
                </div>
              )}

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: template.styles.primaryColor }}
                  />
                  <span className="text-sm text-gray-600">Cor: {template.styles.primaryColor}</span>
                </div>
                <p className="text-sm text-gray-600">Posição da logo: {template.logoPosition}</p>
              </div>

              {template.headerText && (
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  <strong>Cabeçalho:</strong> {template.headerText}
                </p>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleEdit(template)}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                >
                  <Edit size={14} />
                  Editar
                </button>
                {!template.isDefault && (
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                  >
                    <Trash2 size={14} />
                    Deletar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {templates.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 mb-4">Nenhum template encontrado.</p>
            <p className="text-sm text-gray-400">Crie seu primeiro template para começar!</p>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  )
}
