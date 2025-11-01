import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

export interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
}

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

class EmailService {
  private transporter: Transporter | null = null
  private config: EmailConfig | null = null

  /**
   * Inicializa o serviço de email com as configurações
   */
  initialize(config: EmailConfig) {
    this.config = config
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass,
      },
    })
  }

  /**
   * Verifica se o serviço está configurado
   */
  isConfigured(): boolean {
    return this.transporter !== null && this.config !== null
  }

  /**
   * Verifica a conexão com o servidor SMTP
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      throw new Error('Email service not initialized. Call initialize() first.')
    }

    try {
      await this.transporter.verify()
      return true
    } catch (error) {
      console.error('Email connection verification failed:', error)
      return false
    }
  }

  /**
   * Envia um email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter || !this.config) {
      throw new Error('Email service not initialized. Call initialize() first.')
    }

    try {
      const mailOptions = {
        from: `"Sistema Fluxo de Caixa" <${this.config.auth.user}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      }

      const info = await this.transporter.sendMail(mailOptions)
      console.log('Email sent successfully:', info.messageId)
      return true
    } catch (error) {
      console.error('Failed to send email:', error)
      return false
    }
  }

  /**
   * Remove tags HTML de uma string
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '')
  }

  /**
   * Obtém as configurações do ambiente
   */
  static getConfigFromEnv(): EmailConfig | null {
    const host = process.env.EMAIL_HOST
    const port = process.env.EMAIL_PORT
    const user = process.env.EMAIL_USER
    const pass = process.env.EMAIL_PASS

    if (!host || !port || !user || !pass) {
      console.warn('Email configuration not found in environment variables')
      return null
    }

    return {
      host,
      port: parseInt(port, 10),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user,
        pass,
      },
    }
  }
}

// Exporta uma instância única do serviço
export const emailService = new EmailService()

// Inicializa automaticamente se as variáveis de ambiente estiverem configuradas
if (typeof window === 'undefined') {
  // Apenas no servidor
  const config = EmailService.getConfigFromEnv()
  if (config) {
    emailService.initialize(config)
  }
}
