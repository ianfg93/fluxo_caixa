# 🚀 Início Rápido - Notificações por Email

Configure as notificações de email em 5 minutos!

## 📝 Passo a Passo

### 1️⃣ Criar Conta no Mailtrap (Gratuito)

1. Acesse: https://mailtrap.io
2. Clique em "Sign Up" e crie uma conta gratuita
3. Confirme seu email
4. Acesse "Email Testing" → "Inboxes"
5. Você verá uma inbox criada automaticamente

### 2️⃣ Pegar as Credenciais SMTP

Na página da inbox:

1. Clique em **"Show Credentials"**
2. Selecione a integração **"Nodemailer"**
3. Você verá algo assim:

```javascript
host: 'sandbox.smtp.mailtrap.io',
port: 2525,
auth: {
  user: 'a1b2c3d4e5f6g7',    // ← Copie este
  pass: 'h8i9j0k1l2m3n4'     // ← Copie este
}
```

### 3️⃣ Configurar o Sistema

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Edite o arquivo `.env` e adicione suas credenciais:

```env
# ==========================================
# EMAIL CONFIGURATION
# ==========================================
EMAIL_NOTIFICATIONS_ENABLED=true
EMAIL_HOST=sandbox.smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_SECURE=false
EMAIL_USER=a1b2c3d4e5f6g7          # ← Cole aqui o seu user
EMAIL_PASS=h8i9j0k1l2m3n4          # ← Cole aqui o seu pass

# ==========================================
# NOTIFICATION SETTINGS
# ==========================================
NOTIFICATION_RECIPIENTS=seu@email.com    # ← Seu email aqui
EMAIL_CRON_SCHEDULE=0 9 * * *
RUN_IMMEDIATELY=false
```

### 4️⃣ Testar o Sistema

Execute o teste:

```bash
npm run email:test
```

Você verá:

```
🧪 Testing Email Notification System
============================================================

📋 Step 1: Checking Configuration...
   Host: sandbox.smtp.mailtrap.io
   Port: 2525
   User: a1b2c3d4e5f6g7
   Pass: h8i9****
✅ Configuration looks good!

🔌 Step 2: Testing SMTP Connection...
✅ SMTP connection successful!

📧 Step 3: Getting Recipients...
   Recipients: seu@email.com
   Total: 1

💰 Step 4: Collecting Accounts Payable Data...
   Overdue: 3 accounts (R$ 15.450,00)
   Due Today: 1 accounts (R$ 2.300,00)
   Due in 7 Days: 5 accounts (R$ 8.900,00)
   Due in 30 Days: 12 accounts (R$ 45.670,00)

📨 Step 5: Sending Test Email...
✅ TEST SUCCESSFUL!
   Email sent to: seu@email.com

============================================================
✅ All tests passed!
============================================================
```

### 5️⃣ Ver o Email no Mailtrap

1. Volte para o Mailtrap (https://mailtrap.io)
2. Acesse sua inbox
3. Você verá o email recebido! 🎉
4. Clique para visualizar o conteúdo

### 6️⃣ Iniciar o Serviço Automático

Para ativar o envio automático diário às 9h:

```bash
npm run email:cron
```

Você verá:

```
🚀 Starting Email Notifications Cron Job Service...
📅 Schedule: 0 9 * * *
📧 Recipients: seu@email.com
✅ Cron job scheduled successfully!
   Next execution: terça-feira, 4 de junho de 2024 às 09:00

💡 The service is now running in the background...
   Press Ctrl+C to stop
```

**Pronto!** O sistema agora enviará emails automaticamente todos os dias às 9h! 🎊

---

## 🧪 Testar Agora Mesmo

Para testar imediatamente sem esperar até às 9h:

1. No arquivo `.env`, mude:
   ```env
   RUN_IMMEDIATELY=true
   ```

2. Execute:
   ```bash
   npm run email:cron
   ```

3. O email será enviado imediatamente!

4. Não esqueça de mudar de volta para `false` depois:
   ```env
   RUN_IMMEDIATELY=false
   ```

---

## 📱 Testar via API (Opcional)

Você também pode enviar emails pela interface web:

1. Inicie o servidor Next.js:
   ```bash
   npm run dev
   ```

2. Abra seu navegador ou Postman

3. Faça uma requisição POST:
   ```
   POST http://localhost:3000/api/notifications/test-email
   Content-Type: application/json

   {
     "recipients": ["teste@example.com"]
   }
   ```

4. Ou deixe vazio para usar os destinatários configurados:
   ```
   POST http://localhost:3000/api/notifications/test-email
   ```

---

## ✅ Checklist Completo

- [ ] Criar conta no Mailtrap
- [ ] Pegar credenciais SMTP (user e pass)
- [ ] Copiar `.env.example` para `.env`
- [ ] Configurar EMAIL_USER e EMAIL_PASS
- [ ] Configurar NOTIFICATION_RECIPIENTS com seu email
- [ ] Definir EMAIL_NOTIFICATIONS_ENABLED=true
- [ ] Executar `npm run email:test`
- [ ] Verificar email no Mailtrap
- [ ] Iniciar serviço com `npm run email:cron`

---

## 🎯 O que o Email Contém?

O relatório diário inclui:

- **Cards de Resumo**: Totais de cada categoria
- **Contas Vencidas**: Com quantos dias de atraso
- **Vence Hoje**: Alertas importantes
- **Próximos 7 Dias**: Para planejamento
- **Próximos 30 Dias**: Visão completa

Tudo formatado, colorido e responsivo! 📊

---

## 🆘 Problemas?

### Email não aparece no Mailtrap?

1. Verifique se o teste passou com sucesso
2. Atualize a página do Mailtrap
3. Verifique se você está na inbox correta
4. Procure por "Email Testing" → "Inboxes"

### Erro de conexão?

1. Verifique se copiou o user e pass corretamente
2. Certifique-se de não ter espaços extras
3. Confirme que o host é `sandbox.smtp.mailtrap.io`
4. Confirme que a porta é `2525`

### Precisa de mais ajuda?

Consulte a documentação completa em `EMAIL_NOTIFICATIONS.md`

---

## 🎉 Tudo Funcionando!

Parabéns! Seu sistema de notificações está configurado! 🚀

Agora você receberá um relatório completo todos os dias às 9h com todas as contas a pagar.

**Dica:** Quando for para produção, você pode trocar o Mailtrap por Gmail, SendGrid ou outro serviço de email real. As instruções estão em `EMAIL_NOTIFICATIONS.md`.
