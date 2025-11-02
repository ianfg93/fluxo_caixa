"use client"

import { useState, useEffect } from "react"
import { CardReceivablesService, type CardSettings } from "@/lib/card-receivables"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings } from "lucide-react"

interface SettingsFormProps {
  onSettingsUpdated?: () => void
}

export function SettingsForm({ onSettingsUpdated }: SettingsFormProps) {
  const [settings, setSettings] = useState<CardSettings | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    debitRate: 0,
    debitDays: 1,
    creditRate: 0,
    creditDays: 30,
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setIsLoadingSettings(true)
      const data = await CardReceivablesService.getCardSettings()
      if (data) {
        setSettings(data)
        setFormData({
          debitRate: data.debitRate,
          debitDays: data.debitDays,
          creditRate: data.creditRate,
          creditDays: data.creditDays,
        })
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoadingSettings(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      await CardReceivablesService.updateCardSettings(formData)
      setSuccessMessage("Configurações salvas com sucesso!")
      onSettingsUpdated?.()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingSettings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações Globais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando configurações...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configurações Globais
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="debitRate">Taxa de Débito (%)</Label>
              <Input
                id="debitRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.debitRate}
                onChange={(e) =>
                  setFormData({ ...formData, debitRate: parseFloat(e.target.value) || 0 })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="debitDays">Prazo de Débito (Dias D+X)</Label>
              <Input
                id="debitDays"
                type="number"
                min="0"
                value={formData.debitDays}
                onChange={(e) =>
                  setFormData({ ...formData, debitDays: parseInt(e.target.value) || 0 })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditRate">Taxa de Crédito (%)</Label>
              <Input
                id="creditRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.creditRate}
                onChange={(e) =>
                  setFormData({ ...formData, creditRate: parseFloat(e.target.value) || 0 })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditDays">Prazo de Crédito (Dias D+X)</Label>
              <Input
                id="creditDays"
                type="number"
                min="0"
                value={formData.creditDays}
                onChange={(e) =>
                  setFormData({ ...formData, creditDays: parseInt(e.target.value) || 0 })
                }
                required
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="text-sm text-green-600 bg-green-50 p-3 rounded">
              {successMessage}
            </div>
          )}

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
