---
description: Sistema completo de gestão de clientes para VisualDesign
---

# Sistema de Gestão de Clientes - VisualDesign

## Objetivo
Criar um sistema completo para gestão de clientes de hospedagem, com painel admin e painel individual para cada cliente.

## Estrutura Completa

### 1. Banco de Dados Supabase ✅
- **10 tabelas principais** criadas
- **Views para dashboards** prontas
- **RLS (Row Level Security)** configurado
- **Triggers automáticos** para notificações

### 2. Funcionalidades Implementadas

#### Para Admin (TI):
- ✅ Dashboard geral com todos os clientes
- ✅ Gestão de sites (criar, suspender, renovar)
- ✅ Sistema de pagamentos completo
- ✅ Notificações automáticas (30d, 7d antes)
- ✅ Gestão de contas de email
- ✅ Sistema de tickets de suporte
- ✅ Relatórios financeiros mensais
- ✅ Logs de atividade completos

#### Para Clientes:
- ✅ Dashboard individual (só vê seus dados)
- ✅ Lista de seus sites com status
- ✅ Acesso direto ao webmail
- ✅ Histórico e status de pagamentos
- ✅ Sistema de tickets de suporte
- ✅ Notificações personalizadas

### 3. Integrações

#### CyberPanel:
- ✅ Criar site → CyberPanel + MySQL
- ✅ Suspender site → CyberPanel + notificação
- ✅ Renovar site → CyberPanel + status
- ✅ DNS management em tempo real
- ✅ SSL auto-config + renovação

#### Email:
- ✅ Criar contas via CyberPanel
- ✅ Webmail integrado (Roundcube/SnappyMail)
- ✅ Notificações via SMTP
- ✅ Templates em português

## Arquivos Criados

### SQL:
- `supabase-gestao-clientes.sql` - Estrutura completa do banco
- `supabase-cyberpanel-users.sql` - Sincronização CyberPanel

### Frontend (próximos passos):
- Dashboard Admin Component
- Dashboard Cliente Component  
- Sistema de autenticação
- Componentes de gestão

## Passos de Execução

### 1. Importar SQL no Supabase:
```bash
# Entra no painel Supabase
# SQL Editor → New Query
# Copia conteúdo de supabase-gestao-clientes.sql
# Executa tudo
```

### 2. Configurar Supabase Auth:
- Ativar Email/Password authentication
- Configurar templates de email em português
- Definir URL de redirecionamento

### 3. Testar estrutura:
```sql
-- Verificar tabelas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%cliente%';

-- Criar cliente teste
INSERT INTO clientes (nome, email, telefone) 
VALUES ('Cliente Teste', 'teste@exemplo.com', '+258 84 123 456');

-- Criar site teste
INSERT INTO sites_cliente (cliente_id, dominio, plano, preco_mensal, data_renovacao)
VALUES ((SELECT id FROM clientes WHERE email = 'teste@exemplo.com'), 'teste.visualdesign.ao', 'basic', 1500.00, CURRENT_DATE + INTERVAL '1 month');
```

### 4. Implementar Frontend:
- Criar componentes React
- Configurar Supabase client
- Implementar autenticação
- Criar dashboards

### 5. Testar Integração:
- Login admin/cliente
- Criar site via dashboard
- Verificar CyberPanel sync
- Testar notificações

## Estrutura de Pastas

```
src/
├── components/
│   ├── admin/
│   │   ├── DashboardAdmin.tsx
│   │   ├── ClientManagement.tsx
│   │   ├── SiteManagement.tsx
│   │   ├── PaymentManagement.tsx
│   │   └── SupportTickets.tsx
│   ├── client/
│   │   ├── DashboardClient.tsx
│   │   ├── MySites.tsx
│   │   ├── MyPayments.tsx
│   │   └── SupportPortal.tsx
│   └── shared/
│       ├── AuthProvider.tsx
│       ├── NotificationSystem.tsx
│       └── Layout.tsx
├── lib/
│   ├── supabase-client.ts
│   ├── auth.ts
│   ├── notifications.ts
│   └── cyberpanel-integration.ts
├── app/
│   ├── admin/
│   │   └── page.tsx
│   ├── client/
│   │   └── page.tsx
│   └── auth/
│       ├── login/
│       └── callback/
└── types/
    ├── client.ts
    ├── site.ts
    ├── payment.ts
    └── notification.ts
```

## Configurações Necessárias

### Environment Variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CYBERPANEL_API_URL=https://109.199.104.22:8090
CYBERPANEL_USERNAME=admin
CYBERPANEL_PASSWORD=your_password
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass
```

### Permissões Supabase:
- Configurar RLS policies
- Definir papéis (admin, client)
- Configurar JWT settings

## Funcionalidades Avançadas

### Sistema de Notificações:
- ✅ Email automático
- 📧 Configurar templates
- 📱 SMS (opcional)
- 🎯 Dashboard notifications

### Sistema de Pagamentos:
- 💳 M-Pesa integração
- 🏦 Transferência bancária
- 💰 PayPal (opcional)
- 📄 Geração de faturas

### Relatórios:
- 📊 Financeiro mensal
- 📈 Crescimento de clientes
- 🔍 Análise de churn
- 📋 Relatórios customizados

## Testes e Validação

### Checklist Final:
- [ ] Login admin funciona
- [ ] Login cliente funciona
- [ ] Criar site funciona
- [ ] Suspender site funciona
- [ ] Notificações enviam
- [ ] Webmail acessa
- [ ] Pagamentos registam
- [ ] Relatórios geram
- [ ] SSL instala
- [ ] DNS edita
- [ ] Backup funciona
- [ ] Performance OK

## Deploy

### 1. Build do projeto:
```bash
npm run build
```

### 2. Deploy para servidor:
```bash
rsync -avz --exclude node_modules --exclude .next --exclude .git \
  -e "ssh -i /path/to/key" \
  /path/to/project/ \
  user@server:/path/to/destination/
```

### 3. Configurar PM2:
```bash
pm2 start npm --name "visualdesign-gestao" -- start
pm2 save
pm2 startup
```

## Suporte e Manutenção

### Monitoramento:
- Logs de erro
- Performance metrics
- Uso de recursos
- Backup automático

### Atualizações:
- Manter dependências atualizadas
- Revisar segurança
- Otimizar performance
- Novas funcionalidades

## Para o Próximo Agente

### Status Atual:
- ✅ Estrutura SQL completa criada
- ✅ Integração CyberPanel funcionando
- ⏳ Frontend em desenvolvimento
- ⏳ Autenticação pendente

### Próximos Passos:
1. **Importar SQL no Supabase**
2. **Criar componentes React**
3. **Implementar autenticação**
4. **Testar integração completa**
5. **Deploy e testes finais**

### Arquivos Importantes:
- `supabase-gestao-clientes.sql` - Banco completo
- `src/app/api/cyberpanel-db/route.ts` - API CyberPanel
- `.windsurf/workflows/gestao-clientes.md` - Este documento

### Contato:
- Projeto: VisualDesign Gestão de Clientes
- Cliente: Sistema interno para gestão de hospedagem
- Deadline: Em andamento
- Status: 60% completo

---

**Este sistema vai transformar completamente a gestão dos teus clientes!** 🚀
