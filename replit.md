# Bennu Finance - Memorial Descritivo

## Overview

Bennu Finance é um sistema de gestão financeira multi-empresa desenvolvido em Python FastAPI + PostgreSQL. Controla receitas, despesas e orçamentos com categorização dupla (Contábil e Gerencial), gerando relatórios financeiros hierárquicos, fluxo de caixa, controle de caixa em tempo real, contas a pagar/receber, gestão tributária e auditoria completa. Voltado para múltiplas entidades jurídicas com controle granular por papel de usuário.

URL de produção: `https://bennu-finance.bennuapp.com.br/`
Banco desenvolvimento: Neon PostgreSQL
Banco produção: AWS RDS PostgreSQL

---

## User Preferences

- Comunicação em linguagem simples e direta (português)
- Interface otimizada para telas 1920x1080
- Layouts ultra-compactos para minimizar rolagem
- Botões de ação padronizados (azul para editar, vermelho para excluir)
- Ícone Excel verde (#217346) padronizado

---

## System Architecture

Backend Python FastAPI com PostgreSQL. Frontend server-side rendering com Jinja2 e JavaScript vanilla, Bootstrap 5 para UI, Chart.js para visualizações. Padrão RESTful com validação Pydantic e SQLAlchemy 2.0 (Repository pattern). Autenticação via email/senha local com sessões em cookie (`SESSION_SECRET` — **nunca alterar em produção**).

---

## Key Features

### Financial Management
Receitas e despesas com categorização dupla (Contábil + Gerencial), disagregação inteligente via desmembramento, autocompleção progressiva.

### Desmembramento de Transações
Permite dividir uma transação em múltiplas partes com categorias/competências distintas.

**Flags de controle:**
- `entra_no_gerencial = False` → marcado no **pai** ao criar desmembramento (exclui de todos os relatórios)
- `entra_no_gerencial = True` → nos **filhos** (aparecem nos relatórios individualmente)
- `tipo_filho = 'split'` → identifica filhos de qualquer tipo de split (desmembramento ou retenção)
- `parent_id` → referência ao pai

**Regra fundamental de integridade (implementada em todos os relatórios):**
> Apenas transações com `entra_no_gerencial = True` aparecem em qualquer relatório ou tela de listagem. Pais desmembrados (`entra_no_gerencial = False`) são **sempre excluídos**, independente do relatório, evitando duplicidade com os filhos.

**Arquivos principais:** `app/routes/desmembramento.py`, `app/static/js/desmembrar.js`, `app/templates/desmembrar.html`

**UX da tela de desmembramento (`/desmembrar`):**
- Transações normais: botão **"Desmembrar"** (azul)
- Transações pai (já desmembradas): botão **"Ver Partes"** (amarelo) — abre formulário com partes existentes e botão **"Excluir Desmembramento"**
- Transações filhas: dois botões em paralelo:
  - **"Editar"** (verde) → abre `/transacoes/editar/{id}` diretamente para aquela parte
  - **"Rollback"** (vermelho) → desfaz o desmembramento completo via `rollbackDesmembramento(parentId)`, que busca o `desmembramento_id` em `/api/desmembramento/{parentId}` e executa DELETE
- `incluir_pais=true` no endpoint `/api/transacoes` bypassa `apply_leaf_nodes_filter` para exibir pais na tela de desmembramento (único local onde isso é necessário)

**Bug corrigido:** `fornecedor_id` e `cliente_id` da transação pai agora são herdados pelos filhos ao criar desmembramento (`app/routes/desmembramento.py` linha ~100).

### Reporting
- **P&L Contábil**: filtra `entra_no_gerencial == True` ✅
- **P&L Gerencial**: filtra `entra_no_gerencial == True` ✅
- **P&L Consolidado**: filtra `entra_no_gerencial == True` ✅
- **Cash Control**: filtra `exibir_no_cash_control == True` AND `entra_no_gerencial == True` ✅
- **Cash Control (saldo inicial do ano)**: idem ✅
- **Contas a Pagar**: filtra `entra_no_gerencial == True` (substitui lógica anterior com `exibir_no_cash_control` que não excluía pais desmembrados) ✅
- **Contas a Receber**: filtra `entra_no_gerencial == True` ✅

**Contas a Receber** — zoom 75% (`transform: scale(0.75); width: 133.33%`) com layout frozen-header: scroll do body desabilitado via `body.contas-receber-page { overflow: hidden; height: 100vh }`, título/filtros/cards fixos no topo, tabela em flex:1 card com `overflow: auto`, thead `position: sticky; top:0` e tfoot `position: sticky; bottom:0` — só as linhas de dados rolam. Ordenado por `numero_nota_fiscal ASC NULLS LAST` (lexicográfico), secundário por `data_vencimento DESC`. 14 colunas: Emissão NF, Cliente, Comp.Cont., Comp.Ger., NF, Valor Bruto, IRPJ, CSLL/PIS/COFINS (soma agrupada), ISS, Outros Descontos, Valor Líquido, PDF, Recebimento, Valor Recebido. Filtro `tipo_data` (Comp. Contábil / Comp. Gerencial) controla qual competência é usada para filtrar E quais dados são retornados. Percentuais de impostos mostrados nos cabeçalhos quando uniformes via `<span class="th-label">`, coluna PDF com validação XSS-safe, linha de totais no tfoot, export Excel client-side via SheetJS.

**Contas a Pagar** — mesmo layout zoom 75%, 15 colunas: Data Pgto, Data Emissão, Fornecedor, Nº Documento, Conta Contábil, Centro de Custo, Competência, Descrição, Valor Bruto, INSS, IRRF, ISS, CSLL/PIS/COFINS, Juros e Multas, Total a Pagar. Colunas de impostos (INSS/IRRF/ISS/CSLL) buscadas em lote das transações filhas de split (tipo_filho='split', nome LIKE 'Retenção%') agrupadas por parent_id. Juros e Multas placeholder (campo futuro). Backend faz join de CategoriaContabil e CentroCusto para resolução de nomes. Export Excel via SheetJS com mesmas 15 colunas + linha de totais.

### Budgetary Planning
Versionamento com workflow draft/publish, distribuição mensal manual, comparativo orçado vs. realizado.

### Master Data Management
Empresas, Clientes, Fornecedores, Categorias Contábeis/Gerenciais, Centros de Custo, Projetos, Produtos/Serviços, Contas Bancárias, Cartões de Crédito, Impostos.

### Administration
Sistema de auditoria completo, backup/restore com limpeza em cascata (página admin-backup), export Excel em todas as telas.

### Unified Forms
Formulários create/edit de receitas e despesas unificados — `nova_receita.html`/`nova_despesa.html` tratam criação e edição via variável `transacao_id`. Controllers JS (`nova_receita.js`, `nova_despesa.js`) detectam modo edição pelo campo oculto `#transacao-id` e alternam entre POST (criar) e PUT (editar). Ambos usam padrão IIFE com flags guard (`window.NovaReceitaControllerDefined`/`window.NovaDespesaControllerDefined`) para evitar erros de redeclaração em double-load. Templates legados `editar_receita.html`/`editar_despesa.html` arquivados em `archived/legacy_templates/`.

### Currency Mask
O campo `valor` nos formulários usa `type="text"` com máscara JS — no blur formata no estilo brasileiro (ex: `50.000,00`), no focus exibe o número puro para edição. Métodos `parseCurrencyInput()` e `formatCurrencyInput()` fazem conversão entre display e valor numérico.

---

## Technical Stack

- **Backend**: Python >= 3.11, FastAPI >= 0.117.1, SQLAlchemy >= 2.0.43, Pydantic >= 2.11.9, Uvicorn >= 0.36.0, Authlib >= 1.6.4, psycopg2-binary >= 2.9.10, Jinja2 >= 3.1.6, openpyxl >= 3.1.5
- **Frontend**: JavaScript/HTML/CSS (ES6+), Chart.js, SheetJS (XLSX), Font Awesome, Bootstrap 5
- **Database**: PostgreSQL >= 14.x (recomendado 15.x ou 16.x)

---

## AWS ECS Fargate — Estabilidade de Produção

### Health Check — Correção Crítica
O health check do container **não deve usar `curl`** (não instalado na imagem Docker). A tentativa de usar `curl` causava falha no health check, fazendo o ECS reiniciar tasks repetidamente, derrubando o sistema.

**Solução implementada (revisão 56):** health check usa Python puro:
```
python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health', timeout=5)"
```
Endpoint `/health` retorna `{"status": "ok"}`. Após essa correção, tasks passaram a ficar estáveis com sessões válidas.

**IMPORTANTE:** A `SESSION_SECRET` em produção (`079c290f...`) **nunca deve ser alterada** — sua rotação invalida todas as sessões ativas.

### Arquitetura AWS
- **ECS Fargate**: hospedagem do container da aplicação
- **RDS PostgreSQL**: banco de dados gerenciado
- **ALB (Application Load Balancer)**: distribuição de tráfego
- **Route 53**: gerenciamento de DNS
- **CloudFront**: CDN para assets estáticos
- **S3**: backups e armazenamento de arquivos
- **Cognito**: autenticação baseada em Google OAuth 2.0
- **CloudWatch**: logging e monitoramento
- **Secrets Manager**: gerenciamento de credenciais
- **ACM (AWS Certificate Manager)**: certificados SSL
- **VPC (Virtual Private Cloud)**: infraestrutura de rede isolada
- **Google Cloud Console**: configuração de credenciais Google OAuth 2.0 e habilitação da Google+ API via AWS Cognito

---

## Timezone
Banco armazena UTC; exibição em BRT (UTC-3).

---

## Arquivos Importantes

| Arquivo | Responsabilidade |
|---------|-----------------|
| `app/main.py` | Entry point FastAPI, rotas de página, auth |
| `app/database.py` | Conexão PostgreSQL, sessões SQLAlchemy |
| `app/models/transacoes.py` | Model TransacaoFinanceira (flags: entra_no_gerencial, tipo_filho, parent_id, exibir_no_cash_control) |
| `app/routes/transacoes.py` | CRUD transações, `apply_leaf_nodes_filter` |
| `app/routes/desmembramento.py` | Criação, consulta e exclusão de desmembramentos |
| `app/routes/relatorios.py` | P&L, Cash Control, Contas a Pagar/Receber, Cash Flow |
| `app/static/js/desmembrar.js` | Controller JS da tela de desmembramento |
| `app/templates/desmembrar.html` | Template da tela de desmembramento |
