import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Retorna a data atual no timezone de Brasília (America/Sao_Paulo)
 * no formato YYYY-MM-DD
 *
 * Use esta função ao invés de new Date().toISOString().split('T')[0]
 * para evitar problemas com timezone
 */
export function getTodayBrazil(): string {
  const now = new Date()

  // Converte para o timezone de Brasília
  const brazilDate = new Date(now.toLocaleString('en-US', {
    timeZone: 'America/Sao_Paulo'
  }))

  const year = brazilDate.getFullYear()
  const month = String(brazilDate.getMonth() + 1).padStart(2, '0')
  const day = String(brazilDate.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Converte uma data para o formato YYYY-MM-DD no timezone de Brasília
 *
 * @param date - Data a ser convertida
 * @returns String no formato YYYY-MM-DD
 */
export function toDateStringBrazil(date: Date): string {
  // Converte para o timezone de Brasília
  const brazilDate = new Date(date.toLocaleString('en-US', {
    timeZone: 'America/Sao_Paulo'
  }))

  const year = brazilDate.getFullYear()
  const month = String(brazilDate.getMonth() + 1).padStart(2, '0')
  const day = String(brazilDate.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Retorna a data e hora atual no timezone de Brasília
 */
export function getNowBrazil(): Date {
  const now = new Date()
  return new Date(now.toLocaleString('en-US', {
    timeZone: 'America/Sao_Paulo'
  }))
}

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo'
  }).format(dateObj)
}

export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  }).format(dateObj)
}