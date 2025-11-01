# 📧 Sistema de Notificações por Email

Sistema completo de notificações automáticas por email para contas a pagar, com envio diário às 9h da manhã.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Recursos](#recursos)
- [Configuração](#configuração)
- [Uso](#uso)
- [Testes](#testes)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O sistema envia automaticamente um relatório diário por email com informações sobre:

- ⚠️ **Contas Vencidas**: Contas com atraso no pagamento
- 🔔 **Vence Hoje**: Contas com vencimento no dia atual
- 📅 **Próximos 7 Dias**: Contas a vencer na próxima semana
- 📆 **Próximos 30 Dias**: Contas a vencer no próximo mês

### Quando é enviado?

Por padrão, **todos os dias às 9h da manhã** (horário de Brasília). Este horário pode ser customizado.

---

## ✨ Recursos

### Email HTML Responsivo
- ✅ Design profissional e responsivo
- ✅ Cores diferenciadas por tipo de alerta
- ✅ Cards com resumo visual
- ✅ Detalhamento completo de cada conta
- ✅ Funciona em desktop e mobile

### Notificações Inteligentes
- ✅ Subject dinâmico baseado na urgência
- ✅ Agrupamento por período de vencimento
- ✅ Cálculo automático de dias em atraso
- ✅ Formatação de moeda em PT-BR
- ✅ Estado vazio quando não há pendências

### Automação
- ✅ Envio automático via Cron Job
- ✅ Logs detalhados de execução
- ✅ Múltiplos destinatários
- ✅ Retry automático em caso de falha

---

## ⚙️ Configuração

### 1. Criar Conta no Mailtrap (Desenvolvimento)

1. Acesse [Mailtrap.io](https://mailtrap.io)
2. Crie uma conta gratuita
3. Acesse "Email Testing" → "Inboxes"
4. Clique em "Show Credentials"
5. Copie as credenciais SMTP

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` e configure as seguintes variáveis:

```env
# ==========================================
# EMAIL CONFIGURATION
# ==========================================

# Habilitar notificações
EMAIL_NOTIFICATIONS_ENABLED=true

# Credenciais do Mailtrap
EMAIL_HOST=sandbox.smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_SECURE=false
EMAIL_USER=seu_usuario_mailtrap
EMAIL_PASS=sua_senha_mailtrap

# ==========================================
# NOTIFICATION SETTINGS
# ==========================================

# Destinatários (separados por vírgula)
NOTIFICATION_RECIPIENTS=admin@empresa.com,financeiro@empresa.com

# Horário de envio (Cron expression)
EMAIL_CRON_SCHEDULE=0 9 * * *

# Executar imediatamente ao iniciar (para testes)
RUN_IMMEDIATELY=false
```

### 3. Onde Encontrar as Credenciais do Mailtrap

No painel do Mailtrap:

1. Vá em **Email Testing** → **Inboxes**
2. Selecione sua inbox (ou crie uma nova)
3. Clique em **Show Credentials**
4. Copie:
   - **Host**: `sandbox.smtp.mailtrap.io`
   - **Port**: `2525`
   - **Username**: seu username
   - **Password**: sua password

### 4. Configurações de Horário (Cron)

O formato da expressão cron é:

```
┌───────────── minuto (0 - 59)
│ ┌───────────── hora (0 - 23)
│ │ ┌───────────── dia do mês (1 - 31)
│ │ │ ┌───────────── mês (1 - 12)
│ │ │ │ ┌───────────── dia da semana (0 - 6) (Domingo a Sábado)
│ │ │ │ │
* * * * *
```

**Exemplos:**

| Expressão | Descrição |
|-----------|-----------|
| `0 9 * * *` | Todos os dias às 9h |
| `0 8,17 * * *` | Todos os dias às 8h e 17h |
| `0 9 * * 1-5` | Segunda a sexta às 9h |
| `0 9 1 * *` | Todo dia 1º do mês às 9h |
| `*/30 9-17 * * *` | A cada 30 minutos entre 9h e 17h |

---

## 🚀 Uso

### Iniciar o Serviço de Notificações

Para iniciar o cron job que enviará emails automaticamente:

```bash
npm run email:cron
```

Você verá uma saída como:

```
🚀 Starting Email Notifications Cron Job Service...
📅 Schedule: 0 9 * * *
📧 Recipients: admin@empresa.com, financeiro@empresa.com
✅ Cron job scheduled successfully!
   Next execution: segunda-feira, 3 de junho de 2024 às 09:00
```

O serviço ficará rodando em background. Para parar, pressione `Ctrl+C`.

### Testar o Envio Manualmente

Para testar se tudo está funcionando:

```bash
npm run email:test
```

Este comando irá:
1. ✅ Verificar as configurações
2. ✅ Testar conexão SMTP
3. ✅ Coletar dados de contas a pagar
4. ✅ Enviar email de teste

### Testar via API

Você também pode testar via endpoint HTTP:

#### Verificar Status da Configuração

```bash
GET http://localhost:3000/api/notifications/test-email
```

Resposta:
```json
{
  "configured": true,
  "connectionStatus": "connected",
  "recipientsCount": 2,
  "recipients": ["admin@empresa.com", "financeiro@empresa.com"],
  "enabled": true,
  "cronSchedule": "0 9 * * *"
}
```

#### Enviar Email de Teste

```bash
POST http://localhost:3000/api/notifications/test-email
Content-Type: application/json

{
  "recipients": ["teste@example.com"]
}
```

Ou use os destinatários configurados no .env:

```bash
POST http://localhost:3000/api/notifications/test-email
```

---

## 🧪 Testes

### 1. Teste Rápido (Script)

```bash
npm run email:test
```

### 2. Teste com Execução Imediata

Defina no `.env`:

```env
RUN_IMMEDIATELY=true
```

Depois execute:

```bash
npm run email:cron
```

O email será enviado imediatamente ao iniciar o serviço.

### 3. Verificar no Mailtrap

1. Acesse sua inbox no Mailtrap
2. Você deverá ver o email recebido
3. Clique para visualizar
4. Teste a responsividade usando os botões de preview

---

## 🔧 Troubleshooting

### Erro: "Email service not initialized"

**Solução:** Verifique se todas as variáveis EMAIL_* estão configuradas no `.env`

```bash
# Verifique:
EMAIL_HOST=sandbox.smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=seu_usuario
EMAIL_PASS=sua_senha
```

### Erro: "No recipients configured"

**Solução:** Configure a variável NOTIFICATION_RECIPIENTS

```bash
NOTIFICATION_RECIPIENTS=admin@empresa.com,financeiro@empresa.com
```

### Erro: "Failed to connect to SMTP server"

**Possíveis causas:**
1. Credenciais incorretas → Verifique username e password no Mailtrap
2. Firewall bloqueando → Verifique se a porta 2525 está aberta
3. Host incorreto → Certifique-se de usar `sandbox.smtp.mailtrap.io`

### Email não está sendo enviado automaticamente

**Verificar:**

1. O serviço está rodando?
   ```bash
   npm run email:cron
   ```

2. EMAIL_NOTIFICATIONS_ENABLED está true?
   ```env
   EMAIL_NOTIFICATIONS_ENABLED=true
   ```

3. O horário do cron está correto?
   ```env
   EMAIL_CRON_SCHEDULE=0 9 * * *
   ```

### O email está indo para spam

Para produção, configure SPF, DKIM e DMARC no seu domínio. Para desenvolvimento com Mailtrap, isso não é necessário.

---

## 🌐 Configuração para Produção

### Usando Gmail

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=true
EMAIL_USER=seuemail@gmail.com
EMAIL_PASS=sua_senha_de_app  # Não use a senha normal!
```

**Importante:** Você precisa gerar uma "Senha de App" no Gmail:
1. Acesse https://myaccount.google.com/security
2. Ative a verificação em duas etapas
3. Vá em "Senhas de app"
4. Gere uma nova senha
5. Use essa senha no EMAIL_PASS

### Usando SendGrid

```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASS=SG.sua_api_key_do_sendgrid
```

### Usando AWS SES

```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_SECURE=true
EMAIL_USER=seu_smtp_username
EMAIL_PASS=seu_smtp_password
```

---

## 📁 Estrutura de Arquivos

```
lib/
├── email-service.ts                      # Serviço de envio de email
├── email-templates.ts                    # Templates HTML dos emails
└── accounts-payable-notifications.ts     # Lógica de notificações

scripts/
├── email-notifications-cron.ts           # Cron job automático
└── test-email.ts                         # Script de teste

app/api/notifications/test-email/
└── route.ts                              # Endpoint de teste HTTP
```

---

## 🎨 Personalização do Email

Para customizar o template do email, edite:

```typescript
// lib/email-templates.ts

export class EmailTemplates {
  static accountsPayableNotification(data: AccountPayableEmailData): string {
    // Personalize o HTML aqui
  }
}
```

---

## 📊 Logs

O sistema gera logs detalhados:

```
==============================================================
🕐 Running scheduled task at: 3/6/2024 09:00:00
==============================================================

Collecting accounts payable data...
Generating email template...
Sending email notification...
Email sent successfully: <message-id>
✅ Daily report sent successfully!

Summary:
  - Overdue: 3 accounts
  - Due today: 1 accounts
  - Due in 7 days: 5 accounts
  - Due in 30 days: 12 accounts

==============================================================
```

---

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs do console
2. Teste a conexão SMTP: `npm run email:test`
3. Verifique o status via API: `GET /api/notifications/test-email`
4. Confira se todas as variáveis de ambiente estão configuradas

---

## 📝 Checklist de Configuração

- [ ] Criar conta no Mailtrap
- [ ] Copiar `.env.example` para `.env`
- [ ] Configurar EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS
- [ ] Configurar NOTIFICATION_RECIPIENTS
- [ ] Definir EMAIL_NOTIFICATIONS_ENABLED=true
- [ ] Testar com `npm run email:test`
- [ ] Verificar email no Mailtrap
- [ ] Iniciar serviço com `npm run email:cron`

---

## 🎉 Pronto!

Seu sistema de notificações por email está configurado e funcionando!

Os emails serão enviados automaticamente todos os dias às 9h com o relatório atualizado de contas a pagar.
