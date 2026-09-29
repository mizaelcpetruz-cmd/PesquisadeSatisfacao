# Pesquisa de Satisfação SAP B1 → WhatsApp (Zenvia)

## Visão geral

Aplicação web com login, que consulta faturas de saída (OINV, NFe modelo 55, fechadas) no SAP B1 via Service Layer, exibe os clientes/contatos, e dispara pesquisa de satisfação via Zenvia WhatsApp. Respostas (notas) chegam por webhook e ficam registradas para acompanhamento.

## Backend (Lovable Cloud)

Será habilitado para armazenar:

- **Usuários e roles** (admin/operador) — login obrigatório.
- **Configurações** (secrets server-side): URL/usuário/senha/CompanyDB do Service Layer; token e número remetente da Zenvia.
- **Tabela `message_templates`**: modelos editáveis da mensagem, com variáveis `{{nome}}`, `{{numero_nf}}`, `{{data}}`, `{{vendedor}}`, `{{link_resposta}}`.
- **Tabela `surveys`**: 1 registro por envio (DocEntry da OINV, CardCode, contato, telefone, template usado, status `pending|sent|failed|answered`, score, comentário, timestamps).
- **Tabela `survey_responses`**: histórico de mensagens recebidas no webhook.
- **Tabela `schedules`**: jobs automáticos (diário/semanal/mensal, horário, filtros).

## Telas

1. **Login** (`/auth`) — email/senha.
2. **Dashboard** (`/`) — KPIs: enviadas hoje, respondidas, NPS médio, taxa de resposta.
3. **Vendas** (`/vendas`) — filtros por dia/mês/ano + intervalo, lista OINV fechadas modelo 55 com cliente, contato, telefone, total. Seleção múltipla → "Enviar pesquisa".
4. **Pesquisas** (`/pesquisas`) — histórico de envios, status, score, comentário do cliente.
5. **Templates** (`/templates`) — CRUD de modelos de mensagem, preview com variáveis.
6. **Agendamentos** (`/agendamentos`) — configurar disparo automático (ex: todo dia 09h, faturas fechadas ontem).
7. **Configurações** (`/config`) — formulário para salvar credenciais SAP e Zenvia (gravadas como secrets via server functions).

## Integração SAP B1 Service Layer

Server functions autenticadas (`requireSupabaseAuth`):

- `sapLogin()` — POST `/Login` com `CompanyDB/UserName/Password`, guarda cookie `B1SESSION` em cache de memória do worker com TTL.
- `listClosedInvoices({ from, to })` — GET em `/Invoices` com `$filter=DocumentStatus eq 'bost_Close' and DocDate ge ... and DocDate le ...` e `$expand=DocumentLines` ou `BusinessPartners`. Filtra `Series`/`U_*` ou checa NFe modelo 55 (campo varia por implementação — confirmaremos no primeiro teste; default: documentos com `JournalMemo` ou `Series` ligada à série 55, e `DocumentStatus='bost_Close'`).
- `getBusinessPartnerContacts(cardCode)` — GET `/BusinessPartners('CARDCODE')?$select=CardCode,CardName,Phone1,Cellular,EmailAddress,ContactEmployees`.

Todas as chamadas saem do servidor (CORS/HTTPS resolvidos) e nunca expõem credenciais ao browser.

## Integração Zenvia WhatsApp

- `sendWhatsAppSurvey(surveyId)` — POST `https://api.zenvia.com/v2/channels/whatsapp/messages` com header `X-API-TOKEN`, body com template renderizado e `from`/`to`. Status salvo em `surveys`.
- **Webhook público** `POST /api/public/zenvia/webhook` — recebe mensagens recebidas, faz match pelo telefone do cliente, extrai nota (0–10) e comentário, atualiza `surveys` e cria `survey_responses`. URL estável fornecida ao usuário para configurar no painel Zenvia.

## Agendamentos

Endpoint público `POST /api/public/cron/run` protegido por segredo (`CRON_SECRET` no header). Executa schedules ativos: busca OINV do período relativo (ontem/última semana/mês), gera envios. O usuário aponta o cron externo (Zenvia agenda, GitHub Actions, ou cron-job.org) para a URL estável `project--{id}.lovable.app/api/public/cron/run` com o header secreto.

## Tech stack

- TanStack Start (já é o template)
- shadcn/ui + Tailwind
- Lovable Cloud (Postgres + Auth + secrets)
- Server functions para SAP e Zenvia
- Server route público para webhook e cron

## Detalhes técnicos

- Credenciais SAP/Zenvia gravadas via `secrets--add_secret`, lidas só em `.handler()`.
- Cliente HTTP para Service Layer com retry no 401 (re-login automático).
- Templates com substituição simples `{{var}}` server-side.
- RLS: cada usuário autenticado vê tudo (app interno); apenas role `admin` pode editar templates/agendamentos/config.
- Telefones normalizados para E.164 (`+55…`) antes de enviar.

## Premissas que preciso confirmar

1. **Campo da NFe modelo 55** no seu SAP — geralmente é por `Series` (série fiscal) ou campo `U_*` customizado. No primeiro teste vamos listar uma fatura recente para identificar; pode me confirmar como vocês marcam isso?
2. **Telefone do cliente**: usar `Cellular` do BP, ou do primeiro `ContactEmployee`? Posso fazer: prioriza Cellular do contato vinculado à fatura → fallback para BP.
3. **Zenvia**: você usa a API v2 (token simples) ou já tem template HSM aprovado? Para envio ativo no WhatsApp Business, normalmente é obrigatório template aprovado pela Meta — a mensagem editável funcionaria como **variáveis dentro de um template aprovado**, não texto livre.

## Ordem de entrega

1. Habilitar Lovable Cloud + auth + tabelas + roles.
2. Tela de Config + secrets SAP/Zenvia.
3. Server functions SAP + tela de Vendas com filtros.
4. Templates + envio manual via Zenvia + tela Pesquisas.
5. Webhook de respostas.
6. Agendamentos + endpoint cron.
7. Dashboard.

Posso responder às 3 dúvidas acima e seguir, ou se preferir já começo pelo passo 1–3 (estrutura + SAP + listagem) e tratamos Zenvia/template em seguida.
