# 📊 Sistema de Pesquisa de Satisfação NPS — Petruz

Plataforma integrada para gestão, automação e envio de pesquisas de satisfação (**NPS**) via **WhatsApp (Zenvia)** e **E-mail**, sincronizada com pedidos e notas fiscais do **SAP Business One** e gerenciada em tempo real com **Supabase**.

---

## 🚀 Tecnologias Utilizadas

- **Frontend & SSR Framework**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/), [TanStack Start](https://tanstack.com/start) & [TanStack Router](https://tanstack.com/router)
- **State Management & Data Fetching**: [TanStack Query (React Query)](https://tanstack.com/query)
- **Estilização & UI**: [Tailwind CSS v4](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), [Lucide Icons](https://lucide.dev/), [Sonner](https://sonner.emilkowal.ski/)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL com Row Level Security)
- **Integrações Externas**:
  - **SAP Business One**: Service Layer (Sincronização de vendas e faturamentos)
  - **Zenvia API**: Envio e recepção de webhooks de mensagens WhatsApp
  - **SMTP / E-mail**: Notificações e fallback de pesquisas

---

## 📁 Estrutura do Projeto

```text
├── public/                 # Arquivos estáticos (ícones, logos, assets)
├── src/
│   ├── components/         # Componentes compartilhados e componentes de UI (shadcn/ui)
│   ├── core/               # Módulos centrais (configurações de ambiente, tratamento de erros, tipos base e utilitários)
│   ├── features/           # Funcionalidades organizadas por domínio:
│   │   ├── auth/           # Autenticação e perfil de usuários
│   │   ├── dashboard/      # Métricas, KPIs e gráficos NPS
│   │   ├── sales/          # Consulta e filtros de vendas SAP
│   │   ├── schedules/      # Agendamentos e regras de disparo
│   │   ├── settings/       # Configurações de conexões, SMTP e subgrupos
│   │   ├── surveys/        # Gestão e acompanhamento das pesquisas
│   │   ├── templates/      # Templates de mensagens WhatsApp/E-mail
│   │   └── users/          # Gestão de acessos e operadores
│   ├── hooks/              # Custom hooks React
│   ├── integrations/       # Clientes de integração (SAP, Supabase, Zenvia, E-mail)
│   ├── lib/                # Utilitários de interface (ex: cn)
│   ├── routes/             # Rotas e páginas da aplicação (TanStack Router)
│   ├── server/             # Serviços em segundo plano (scheduler, rotinas cron)
│   ├── router.tsx          # Configuração do router
│   ├── server.ts           # Ponto de entrada do servidor SSR e cron runner
│   └── styles.css          # Folha de estilos global
├── supabase/
│   └── migrations/         # Migrations SQL versionadas do banco de dados
├── .env.example            # Modelo documentado de variáveis de ambiente
├── .gitignore              # Regras de exclusão do Git
├── package.json            # Dependências e scripts do projeto
├── tsconfig.json           # Configuração do compilador TypeScript
└── vite.config.ts          # Configuração do Vite e plugins
```

---

## ⚙️ Pré-requisitos

- **Node.js**: Versão 18 ou superior (recomendado Node 20 LTS)
- **NPM**: Versão 9 ou superior
- Instância configurada no **Supabase**
- Acesso à API do **SAP Business One Service Layer** (opcional para desenvolvimento com mock/fallback)
- Token e canal cadastrado na **Zenvia**

---

## 🛠️ Instalação e Execução

### 1. Clonar o repositório
```bash
git clone https://github.com/mizaelcpetruz-cmd/PesquisadeSatisfacao.git
cd PesquisadeSatisfacao
```

### 2. Instalar as dependências
```bash
npm install
```

### 3. Configurar as variáveis de ambiente
Copie o arquivo `.env.example` para `.env` e preencha com as credenciais do seu ambiente:
```bash
cp .env.example .env
```

### 4. Executar em modo de desenvolvimento
```bash
npm run dev
```
O servidor de desenvolvimento estará disponível em `http://localhost:3000` (ou porta configurada).

---

## 📦 Scripts Disponíveis

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor de desenvolvimento com Hot Reload |
| `npm run build` | Gera o build otimizado para produção (client & SSR) |
| `npm run preview` | Executa a prévia local do build de produção |
| `npm run typecheck` | Executa a verificação estática de tipos com o TypeScript (`tsc --noEmit`) |
| `npm run lint` | Executa o linter ESLint |
| `npm run format` | Formata o código com Prettier |

---

## 🔒 Segurança

- **Credenciais**: Arquivos sensíveis (`.env`, `*.key`, `*.pem`, `Dados.txt`) estão devidamente ignorados no `.gitignore` e **nunca** devem ser commitados no repositório.
- **Variáveis Privadas vs Públicas**: Apenas variáveis com o prefixo `VITE_` são expostas ao frontend. Variáveis confidenciais (chaves secretas, senhas SMTP, tokens de API) são de uso exclusivo do servidor SSR.

---

## 📄 Licença

Propriedade exclusiva de **Petruz Frutas**. Todos os direitos reservados.
