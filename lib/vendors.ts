import { ApiClient } from "./api-client"

export interface Vendor {
  id: string
  companyId: string
  cnpj: string
  name: string
  email: string | null
  address: string | null
  phone: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CNPJData {
  cnpj: string
  razao_social: string
  nome_fantasia: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  municipio: string
  uf: string
  cep: string
  email: string
  telefone: string
}

export class VendorsService {
  static async getVendors(companyId?: string): Promise<Vendor[]> {
    try {
      let url = "/api/vendors"
      
      if (companyId) {
        url += `?company=${companyId}`
      }

      const response = await ApiClient.get(url)

      if (!response.ok) {
        throw new Error("Failed to fetch vendors")
      }

      const data = await response.json()

      return data.vendors.map((v: any) => ({
        ...v,
        createdAt: new Date(v.createdAt),
        updatedAt: new Date(v.updatedAt),
      }))
    } catch (error) {
      console.error("Get vendors error:", error)
      return []
    }
  }

  static async getVendor(id: string): Promise<Vendor | null> {
    try {
      const response = await ApiClient.get(`/api/vendors/${id}`)

      if (!response.ok) {
        throw new Error("Failed to fetch vendor")
      }

      const data = await response.json()

      return {
        ...data.vendor,
        createdAt: new Date(data.vendor.createdAt),
        updatedAt: new Date(data.vendor.updatedAt),
      }
    } catch (error) {
      console.error("Get vendor error:", error)
      return null
    }
  }

  static async addVendor(
    vendor: Omit<Vendor, "id" | "createdAt" | "updatedAt" | "companyId">
  ): Promise<Vendor | null> {
    try {
      const response = await ApiClient.post("/api/vendors", vendor)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to add vendor")
      }

      const data = await response.json()

      return {
        ...data.vendor,
        createdAt: new Date(data.vendor.createdAt),
        updatedAt: new Date(data.vendor.updatedAt),
      }
    } catch (error) {
      console.error("Add vendor error:", error)
      throw error
    }
  }

  static async updateVendor(
    id: string,
    updates: Partial<Pick<Vendor, "name" | "email" | "address" | "phone">>
  ): Promise<Vendor | null> {
    try {
      const response = await ApiClient.put(`/api/vendors/${id}`, updates)

      if (!response.ok) {
        throw new Error("Failed to update vendor")
      }

      const data = await response.json()

      return {
        ...data.vendor,
        createdAt: new Date(data.vendor.createdAt),
        updatedAt: new Date(data.vendor.updatedAt),
      }
    } catch (error) {
      console.error("Update vendor error:", error)
      return null
    }
  }

  static async deleteVendor(id: string): Promise<boolean> {
    try {
      const response = await ApiClient.delete(`/api/vendors/${id}`)
      return response.ok
    } catch (error) {
      console.error("Delete vendor error:", error)
      return false
    }
  }

  static async fetchCNPJData(cnpj: string): Promise<CNPJData | null> {
    try {
      // Remove formatação do CNPJ
      const cleanCNPJ = cnpj.replace(/\D/g, "")
      
      if (cleanCNPJ.length !== 14) {
        throw new Error("CNPJ inválido")
      }

      // Usando Brasil API (gratuita e sem limite)
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`)
      
      if (!response.ok) {
        throw new Error("CNPJ não encontrado")
      }

      const data = await response.json()
      
      return {
        cnpj: cleanCNPJ,
        razao_social: data.razao_social || "",
        nome_fantasia: data.nome_fantasia || data.razao_social || "",
        logradouro: data.logradouro || "",
        numero: data.numero || "",
        complemento: data.complemento || "",
        bairro: data.bairro || "",
        municipio: data.municipio || "",
        uf: data.uf || "",
        cep: data.cep || "",
        email: data.email || "",
        telefone: data.ddd_telefone_1 || "",
      }
    } catch (error) {
      console.error("Fetch CNPJ error:", error)
      return null
    }
  }

  static formatCNPJ(cnpj: string): string {
    const cleaned = cnpj.replace(/\D/g, "")
    return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
  }
}