# Script de Limpeza de Orçamentos Antigos

Este script remove automaticamente orçamentos com mais de 30 dias que estejam nos status:
- **Rascunho** (draft)
- **Rejeitado** (rejected)
- **Expirado** (expired)

⚠️ **IMPORTANTE**: Orçamentos **Aprovados** e **Enviados** NUNCA são excluídos automaticamente!

## Como Usar

### 1. Modo Dry-Run (Apenas Visualização)

Para ver quais orçamentos seriam excluídos SEM realmente excluí-los:

```bash
node scripts/cleanup-old-budgets.js --dry-run
```

ou

```bash
node scripts/cleanup-old-budgets.js -d
```

Isso mostrará:
- Quantidade de orçamentos que seriam excluídos
- Lista detalhada com número, cliente, status e data de criação
- Data de corte (30 dias atrás)

### 2. Executar Limpeza Real

Para realmente excluir os orçamentos antigos:

```bash
node scripts/cleanup-old-budgets.js
```

O script irá:
1. Conectar ao banco de dados
2. Contar quantos orçamentos serão excluídos
3. Listar todos os orçamentos que serão removidos
4. Executar a exclusão em uma transação (segura)
5. Mostrar quantos itens e orçamentos foram excluídos

## Configuração Automática (Cron)

### Windows (Task Scheduler)

1. Abra o **Agendador de Tarefas**
2. Crie uma nova tarefa básica
3. Configure para executar diariamente (ex: 3h da manhã)
4. Ação: Iniciar um programa
5. Programa: `node.exe`
6. Argumentos: `"C:\xampp\htdocs\Abgi\Old\fluxo_caixa\scripts\cleanup-old-budgets.js"`
7. Iniciar em: `"C:\xampp\htdocs\Abgi\Old\fluxo_caixa"`

### Linux/Mac (Crontab)

Adicione ao crontab (`crontab -e`):

```bash
# Executar todos os dias às 3h da manhã
0 3 * * * cd /caminho/para/fluxo_caixa && node scripts/cleanup-old-budgets.js >> logs/cleanup.log 2>&1
```

## Regras de Exclusão

### ✅ SERÃO EXCLUÍDOS:
- Orçamentos com mais de 30 dias E status = "draft" (Rascunho)
- Orçamentos com mais de 30 dias E status = "rejected" (Rejeitado)
- Orçamentos com mais de 30 dias E status = "expired" (Expirado)

### ❌ NUNCA SERÃO EXCLUÍDOS:
- Orçamentos com status = "sent" (Enviado)
- Orçamentos com status = "approved" (Aprovado)
- Orçamentos criados há menos de 30 dias
- Qualquer orçamento independente da idade se estiver aprovado ou enviado

## Exemplo de Saída

### Dry-Run:
```
⚠️  MODO DRY-RUN: Apenas mostrando o que seria excluído

🔌 Conectado ao PostgreSQL
📊 3 orçamentos seriam excluídos:
📅 Data de corte: 25/11/2024

  - 2024-0001 | João Silva | draft | Criado: 10/10/2024
  - 2024-0005 | Maria Santos | rejected | Criado: 15/10/2024
  - 2024-0012 | Sem cliente | expired | Criado: 20/10/2024

💡 Execute sem --dry-run para realizar a exclusão
🔌 Conexão fechada
```

### Execução Real:
```
🧹 Iniciando limpeza de orçamentos antigos...
🔌 Conectado ao PostgreSQL
📊 Encontrados 3 orçamentos para exclusão
📅 Data de corte: 25/11/2024

📋 Orçamentos que serão excluídos:
  - 2024-0001 (draft) - Criado em 10/10/2024
  - 2024-0005 (rejected) - Criado em 15/10/2024
  - 2024-0012 (expired) - Criado em 20/10/2024

🗑️  Itens excluídos: 12
🗑️  Orçamentos excluídos: 3

✅ Limpeza concluída com sucesso!
🔌 Conexão fechada
```

## Segurança

- O script usa **transações** para garantir consistência
- Se houver erro, faz **rollback** automático
- Registra todos os orçamentos antes de excluir
- Modo **dry-run** permite testar sem riscos
- Nunca exclui orçamentos aprovados ou enviados

## Modificar Período

Para alterar o período de 30 dias, edite o arquivo `cleanup-old-budgets.js`:

```javascript
// Linha 36 e 154
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)  // Altere o número 30
```

Exemplos:
- 7 dias: `- 7`
- 60 dias: `- 60`
- 90 dias: `- 90`

## Logs

Para manter um histórico das limpezas, redirecione a saída:

```bash
node scripts/cleanup-old-budgets.js >> logs/cleanup-orcamentos.log 2>&1
```

Isso criará um arquivo de log com data e hora de cada execução.
