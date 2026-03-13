# Bennu Finance - Memorial Descritivo

## 1. Visão Geral

Bennu Finance é um sistema abrangente de gestão financeira projetado para operações multi-empresa. O sistema rastreia receitas, despesas e orçamentos, gerando relatórios financeiros detalhados com suporte a categorização complexa (dual: Contábil e Gerencial, ambas com subcategorias). Oferece controle financeiro completo, relatórios gerenciais e contábeis integrados, planejamento orçamentário com versionamento, análise de fluxo de caixa, gestão de impostos e auditoria completa. Sua visão de negócio é otimizar operações financeiras entre múltiplas entidades, oferecendo insights profundos e controle robusto para tomada de decisões informadas.

---

## 2. Preferências do Usuário

- Comunicação em linguagem simples e direta
- Interface otimizada para telas 1920x1080
- Layouts ultra-compactos para minimizar rolagem
- Botões de ação padronizados (azul para editar, vermelho para excluir)
- Ícone Excel verde (#217346) padronizado

---

## 3. Arquitetura do Sistema

Bennu Finance utiliza backend Python FastAPI e banco de dados PostgreSQL. O frontend usa renderização no servidor com Jinja2 e JavaScript vanilla, aprimorado com Bootstrap 5 para componentes de interface e Chart.js para visualizações interativas.

### 3.1 Especificações Técnicas

| Componente | Tecnologia | Versão |
|------------|------------|--------|
| Backend | Python | >= 3.11 |
| Frontend | JavaScript/HTML/CSS | ES6+ |

### 3.2 Frameworks e Bibliotecas Backend

| Biblioteca | Versão | Finalidade |
|------------|--------|------------|
| FastAPI | >= 0.117.1 | Framework web assíncrono |
| SQLAlchemy | >= 2.0.43 | ORM para PostgreSQL |
| Pydantic | >= 2.11.9 | Validação de dados |
| Uvicorn | >= 0.36.0 | Servidor ASGI |
| Authlib | >= 1.6.4 | Autenticação OAuth/OIDC |
| psycopg2-binary | >= 2.9.10 | Driver PostgreSQL |
| Jinja2 | >= 3.1.6 | Templates HTML |
| openpyxl | >= 3.1.5 | Exportação Excel |
| httpx | >= 0.28.1 | Cliente HTTP assíncrono |
| python-dotenv | >= 1.1.1 | Variáveis de ambiente |
| python-multipart | >= 0.0.20 | Upload de arquivos |
| itsdangerous | >= 2.2.0 | Tokens seguros |
| requests | >= 2.32.5 | Cliente HTTP |

### 3.3 Bibliotecas Frontend

| Biblioteca | Finalidade |
|------------|------------|
| Chart.js | Gráficos interativos |
| SheetJS (XLSX) | Exportação Excel |
| Font Awesome | Ícones |
| Bootstrap 5 | Framework CSS |

### 3.4 Banco de Dados

| Componente | Especificação |
|------------|---------------|
| SGBD | PostgreSQL |
| Versão Mínima | 14.x |
| Versão Recomendada | 15.x ou 16.x |
| Extensões | Nenhuma obrigatória |

### 3.5 Estrutura de Diretórios

```
bennu-finance/
├── app/
│   ├── auth/           # Autenticação OAuth/OIDC
│   ├── middleware/     # Middlewares (auditoria)
│   ├── migrations/     # Scripts de migração
│   ├── models/         # Modelos SQLAlchemy
│   ├── routes/         # Endpoints da API
│   ├── services/       # Lógica de negócio
│   ├── static/         # CSS, JS, imagens
│   │   ├── css/
│   │   └── js/
│   ├── templates/      # Templates Jinja2
│   ├── database.py     # Configuração do banco
│   └── main.py         # Aplicação principal
├── pyproject.toml      # Dependências Python
└── replit.md           # Documentação do projeto
```

### 3.6 Padrões de Arquitetura

- **Backend**: API RESTful com FastAPI, validação Pydantic, SQLAlchemy 2.0 com padrão Repository
- **Autenticação**: OAuth 2.0 / OpenID Connect com sessões baseadas em cookies
- **Interface**: Jinja2 + JavaScript vanilla, tema Bootstrap 5 customizado, layouts compactos, colunas fixas para relatórios, tabelas full-width, navegação compacta com menus expansíveis

---

## 4. Funcionalidades Principais

### 4.1 Gestão Financeira
- Lançamento de receitas e despesas
- Categorização dual (Contábil/Gerencial), ambas com subcategorias hierárquicas
- Subcategoria Contábil para agrupamento no P&L Contábil e Consolidado
- Subcategoria Gerencial para análise gerencial detalhada
- Desmembramento inteligente de transações
- Auto-preenchimento progressivo baseado em histórico

### 4.2 Modelo de Categorização

O sistema utiliza categorização dual independente para cada transação:

#### Categorias Contábeis (para P&L Contábil e Consolidado)
Estrutura hierárquica pai/filho na tabela `categorias_contabeis` com:
- **Categoria principal** (`pai_id = NULL`): Agrupamento de nível superior
- **Subcategoria** (`pai_id = <id_categoria>`): Detalhamento dentro da categoria
- **Seção P&L** (`secao_pl`): Define em qual seção do P&L a categoria aparece (Gtos Comerciais, Gtos Administrativos, Despesas Financeiras)
- **Ordem** (`ordem`): Define a sequência de exibição no P&L
- **Código hierárquico** (`codigo`): Formato `N` para categorias, `N.N` para subcategorias (ex: `7`, `7.1`, `7.2`)

| Código | Categoria | Seção P&L | Subcategorias |
|--------|-----------|-----------|---------------|
| 1 | SERVIÇO DE TERCEIROS | Gtos Comerciais | ROGER SHEN, VICTOR SIMOES, OUTROS |
| 2 | LICENÇA DE CONTEÚDO | Gtos Comerciais | ANTARES COMINIÇÃO, AS PARTICIPAÇÕES (JORNAL O POVO), EDITORA GLOBO S/A, EDITORA TRÊS COMÉRCIO, EDITORA ONLINE, EMPRESA BAIANA DE JORNALISMO S/A, EMPRESA JORNALÍSTICA CALDAS JR, FOLHAPRESS, JORNAL DO LITORAL, PERFIL BRASIL-CARAS, S/A ESTADO DE MINAS, SA O ESTADO DE SÃO PAULO - ESTADÃO, CORREIO DO ESTADO MS, JORNAL SANTA CATARINA-NCC, O LIBERAL - DELTA PUBLICIDADE |
| 3 | CONSULTORIA E COMISSÕES | Gtos Comerciais | IMTX SERVIÇO, IRMÃOS DIAS/ANJOS |
| 4 | PROPAGANDA E PUBLICIDADE (GTOS COM MÍDIA) | Gtos Comerciais | UPSTREAM MOBILE |
| 5 | GTOS COM VIAGEM E REPRESENTAÇÕES | Gtos Comerciais | PASSAGENS E HOSPEDAGEM, REFEIÇÃO, TAXI/CONDUÇÃO, COMBUSTÍVEL/ESTACIONAMENTO/PEDÁGIO, TREINAMENTOS/CONVENÇÕES/EVENTOS PARA CLIENTES |
| 6 | DIVERSOS | Gtos Administrativos | — |
| 7 | FOLHA DE PAGAMENTO | Gtos Administrativos | SALÁRIOS, 13º SALÁRIO, FÉRIAS, INSS, FGTS, ASSISTÊNCIA MÉDICA, DESPESAS COM ALIMENTAÇÃO, SEGURO DE VIDA, AUXÍLIO CRECHE, SINDICATOS, EXAMES OCUPACIONAIS, OUTROS |
| 8 | DESPESAS ESCRITÓRIO | Gtos Administrativos | ALUGUEL E COND ESCRITÓRIO, LIMPEZA DA SALA, SERV. DE LOCAÇÃO ESPAÇO E ARMAZENAGEM, ENERGIA ELÉTRICA |
| 9 | COMUNICAÇÃO (TELEFONE FIXO, INTERNET E LOCAÇÃO) | Gtos Administrativos | TELEFONE FIXO/INTERNET, TELEFONE MÓVEL |
| 10 | GASTOS ADMINISTRATIVOS | Gtos Administrativos | MATERIAL DE ESCRITÓRIO, MATERIAL DE LIMPEZA/COPA E COZINHA, MANUTENÇÃO PREDIAL, MANUTENÇÃO DE EQUIPAMENTOS, COMBUSTÍVEL/PEDÁGIO/ESTACIONAMENTO, CORREIOS, DESPESAS COM CARTÓRIOS/CÓPIAS, DESPESAS COM REFEIÇÕES, TAXI/CONDUÇÃO, BENS ATIVO DE PEQUENO VALOR, ENTREGAS RÁPIDAS E FRETES, BRINDES/PRESENTES/CONFRATERNIZAÇÕES, TAXAS, DIVERSOS, DESPESAS INDEDUTÍVEIS, DEPRECIAÇÕES E AMORTIZAÇÕES |
| 11 | SERVIÇOS CONTRATADOS | Gtos Administrativos | ASSISTÊNCIA CONTÁBIL, HONORÁRIOS ADVOCATÍCIOS, HONORÁRIOS ADMINISTRADOR, RECRUTAMENTO E SELEÇÃO, SERVIÇOS DE TERCEIROS, OUTROS SERVIÇOS |
| 12 | SOFTWARE E COMPUTADORES | Gtos Administrativos | LICENÇAS E DOMÍNIOS, EQUIPAMENTOS, INFRAESTRUTURA, SERVIÇOS DE ORGANIZAÇÃO |

#### Categorias Gerenciais (para análise gerencial)
Estrutura hierárquica pai/filho na tabela `categorias_gerenciais` com:
- **Categoria principal** (`pai_id = NULL`, código `CGxxx`)
- **Subcategoria** (`pai_id = <id_categoria>`, código `SGxxx`)

| Código | Categoria | Subcategorias |
|--------|-----------|---------------|
| CG001 | ADMINISTRATIVAS | ALUGUEL ESCRITÓRIO, CONTABILIDADE, JURÍDICO, MANUTENÇÃO ESCRITÓRIO, MATERIAIS ESCRITÓRIO, CONTAS CONSUMO, ADMINISTRADOR, DIVERSOS, TAXAS, INTERNO, RH |
| CG002 | TI | INFRAESTRUTURA, LICENÇAS E DOMÍNIOS, LICENÇAS PRODUTOS, SERVIÇOS DE ORGANIZAÇÃO |
| CG003 | COMISSIONAMENTO | BUNDLE, AVULSO |
| CG004 | MÍDIA | WEB AFILIADOS - TIM, WEB GOOGLE - TIM, SMART MESSAGE - TIM, CANAIS DE VOZ - TIM, COMISSÃO, WEB GOOGLE - CLARO, CANAIS ON-DECK - CLARO |
| CG005 | PESSOAL | SALÁRIOS, ENCARGOS, HONORÁRIOS, BENEFÍCIOS |
| CG006 | PRESTAÇÃO DE SERVIÇOS | TI, PRODUTO, CONTEÚDO, COMERCIAL |
| CG007 | PRODUÇÃO DE CONTEÚDO | FLUID, ABACO, FOOD BALANCE, BANCAS, PROGAMERS, MAKERS CLUB |
| CG008 | LICENÇAS DE CONTEÚDO | JORNAIS, REVISTAS |
| CG009 | SIGN-IN | — |
| CG010 | COMERCIAIS | PASSAGEM / HOSPEDAGEM, ALIMENTAÇÃO / TRANSPORTE, EVENTOS CLIENTES |
| CG011 | ARGENTINA | SALÁRIO, FERRAMENTAS |
| CG012 | EQUIPAMENTOS | — |

### 4.3 Relatórios
- P&L Contábil com estrutura hierárquica (agrupado por Categoria e Subcategoria Contábil, seções Gtos Comerciais e Gtos Administrativos)
- P&L Consolidado com análise Previsto vs Realizado
- Cash Flow com projeções mensais
- Cash Control com acompanhamento em tempo real
- Contas a Pagar e Receber

### 4.4 Planejamento Orçamentário
- Versionamento com workflow rascunho/publicação
- Distribuição manual por mês
- Comparativo orçado vs realizado
- Cenários e revisões
- Vinculação com categorias e subcategorias (contábil e gerencial)

### 4.5 Gestão de Cadastros
- Empresas, Clientes, Fornecedores
- Categorias Contábeis com Subcategorias (hierarquia pai/filho)
- Categorias Gerenciais com Subcategorias (hierarquia pai/filho)
- Centros de Custo, Projetos
- Produtos/Serviços
- Contas Bancárias, Cartões de Crédito
- Impostos por empresa e produto

### 4.6 Administração
- Sistema de auditoria completo
- Backup e restauração de dados
- Limpeza controlada de tabelas
- Rateio automático de despesas
- Exportação Excel em todas as telas

---

## 5. Dependências Externas

### 5.1 Ambiente Atual
- **PostgreSQL**: Banco de dados principal (Neon Database)
- **Autenticação Replit**: Provedor OAuth 2.0/OpenID Connect
- **Hospedagem Replit**: Ambiente de desenvolvimento e produção

---

## 6. Infraestrutura para Migração AWS

### 6.1 Arquitetura Recomendada

```
┌─────────────────────────────────────────────────────────────┐
│                        AWS Cloud                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │   Route 53  │────▶│ CloudFront  │────▶│     ALB     │   │
│  │    (DNS)    │     │    (CDN)    │     │             │   │
│  └─────────────┘     └─────────────┘     └──────┬──────┘   │
│                                                  │          │
│  ┌───────────────────────────────────────────────┴────────┐ │
│  │                     ECS Fargate                        │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │ │
│  │  │  Task 1     │  │  Task 2     │  │  Task N     │    │ │
│  │  │  (FastAPI)  │  │  (FastAPI)  │  │  (FastAPI)  │    │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │ │
│  └────────────────────────────┬───────────────────────────┘ │
│                               │                             │
│  ┌────────────────────────────┴───────────────────────────┐ │
│  │                      Amazon RDS                        │ │
│  │              PostgreSQL 15.x (Multi-AZ)                │ │
│  │         ┌─────────┐         ┌─────────┐               │ │
│  │         │ Primário│ ───────▶│ Standby │               │ │
│  │         └─────────┘         └─────────┘               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Cognito    │  │     S3      │  │ CloudWatch  │        │
│  │  (Auth)     │  │  (Backups)  │  │  (Logs)     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Serviços AWS Necessários

| Serviço | Finalidade | Especificação Mínima |
|---------|------------|----------------------|
| **ECS Fargate** | Containers da aplicação | 2 vCPU, 4GB RAM por task |
| **RDS PostgreSQL** | Banco de dados gerenciado | db.t3.medium, Multi-AZ |
| **ALB** | Balanceador de carga | Application Load Balancer |
| **Route 53** | Gerenciamento de DNS | Hosted Zone |
| **CloudFront** | CDN para assets estáticos | Distribuição global |
| **S3** | Backups e arquivos estáticos | Armazenamento padrão |
| **Cognito** | Autenticação Google | User Pool + Identity Pool |
| **CloudWatch** | Logs e monitoramento | Logs, Métricas, Alarmes |
| **Secrets Manager** | Gerenciamento de credenciais | Rotação automática |
| **ACM** | Certificados SSL | Certificado wildcard |
| **VPC** | Rede isolada | 2+ subnets públicas/privadas |

### 6.3 Estimativa de Custos AWS (Produção Básica)

| Serviço | Especificação | Custo Estimado/Mês |
|---------|---------------|-------------------|
| ECS Fargate | 2 tasks x 2vCPU x 4GB | ~$150 |
| RDS PostgreSQL | db.t3.medium Multi-AZ | ~$140 |
| ALB | Application LB | ~$25 |
| CloudFront | 100GB transferência | ~$10 |
| S3 | 50GB armazenamento | ~$2 |
| Route 53 | 1 hosted zone | ~$1 |
| CloudWatch | Logs + métricas | ~$20 |
| Cognito | 1000 MAU | Gratuito |
| **TOTAL ESTIMADO** | | **~$350/mês** |

### 6.4 Autenticação via Google (AWS Cognito)

#### Configuração Necessária:

1. **AWS Cognito User Pool**
   - Criar User Pool com Google como provedor federado
   - Configurar App Client para OAuth 2.0
   - Definir URLs de callback da aplicação

2. **Google Cloud Console**
   - Criar projeto no Google Cloud
   - Habilitar Google+ API
   - Criar credenciais OAuth 2.0
   - Configurar origens JavaScript autorizadas
   - Configurar URIs de redirecionamento

3. **Variáveis de Ambiente Necessárias**
   ```
   COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
   COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
   COGNITO_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
   COGNITO_DOMAIN=bennu-finance.auth.us-east-1.amazoncognito.com
   GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxxxxxxxxxxxxxxx
   ```

4. **Modificações no Código**
   - Substituir Replit OIDC por AWS Cognito
   - Atualizar middleware de autenticação
   - Configurar refresh tokens
   - Implementar logout federado

---

## 7. Script SQL - Criação do Banco de Dados

```sql
-- ============================================
-- BENNU FINANCE - SCRIPT DE CRIAÇÃO DO BANCO
-- PostgreSQL 15.x
-- Versão: 3.0 (Fevereiro 2026)
-- Inclui subcategorias contábeis e gerenciais
-- ============================================

-- Criar tipos ENUM
CREATE TYPE tipo_transacao_enum AS ENUM ('receita', 'despesa');
CREATE TYPE status_transacao_enum AS ENUM ('pendente', 'pago', 'recebido', 'cancelado', 'atrasado');
CREATE TYPE forma_pgto_enum AS ENUM ('pix', 'boleto', 'cartao_credito', 'cartao_debito', 'transferencia', 'dinheiro', 'cheque', 'debito_automatico', 'outro');
CREATE TYPE tipo_versao_enum AS ENUM ('baseline', 'revisao', 'budget', 'scenario');
CREATE TYPE status_planejamento_enum AS ENUM ('rascunho', 'publicado');
CREATE TYPE categoria_linha_enum AS ENUM ('receita', 'despesa', 'investimento');

-- ============================================
-- TABELAS DE CADASTROS PRINCIPAIS
-- ============================================

-- Tabela: empresas
CREATE TABLE empresas (
    id SERIAL PRIMARY KEY,
    nome_fantasia VARCHAR NOT NULL,
    razao_social VARCHAR,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: empresa_cnpjs (múltiplos CNPJs por empresa)
CREATE TABLE empresa_cnpjs (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    cnpj VARCHAR NOT NULL,
    descricao VARCHAR,
    principal BOOLEAN DEFAULT FALSE,
    ativo BOOLEAN DEFAULT TRUE
);

-- Tabela: users (usuários)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,
    nome VARCHAR NOT NULL,
    empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
    role VARCHAR DEFAULT 'user',
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Tabela: clientes
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
    nome VARCHAR NOT NULL,
    documento VARCHAR,
    status VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: contatos_clientes
CREATE TABLE contatos_clientes (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    nome VARCHAR,
    email VARCHAR,
    telefone VARCHAR,
    cargo VARCHAR,
    principal BOOLEAN DEFAULT FALSE
);

-- Tabela: fornecedores
CREATE TABLE fornecedores (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
    nome VARCHAR NOT NULL,
    documento VARCHAR,
    tipo_pessoa VARCHAR,
    email VARCHAR,
    telefone VARCHAR,
    endereco VARCHAR,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: contatos_fornecedores
CREATE TABLE contatos_fornecedores (
    id SERIAL PRIMARY KEY,
    fornecedor_id INTEGER NOT NULL REFERENCES fornecedores(id) ON DELETE CASCADE,
    nome VARCHAR,
    email VARCHAR,
    telefone VARCHAR,
    cargo VARCHAR,
    principal BOOLEAN DEFAULT FALSE
);

-- Tabela: centros_custo
CREATE TABLE centros_custo (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
    nome VARCHAR NOT NULL,
    codigo VARCHAR,
    ativo BOOLEAN DEFAULT TRUE
);

-- Tabela: projeto_classificacoes
CREATE TABLE projeto_classificacoes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR NOT NULL,
    descricao VARCHAR,
    ativo BOOLEAN DEFAULT TRUE
);

-- Tabela: projetos
CREATE TABLE projetos (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    classificacao_id INTEGER REFERENCES projeto_classificacoes(id) ON DELETE SET NULL,
    nome VARCHAR NOT NULL,
    codigo_interno VARCHAR,
    ativo BOOLEAN DEFAULT TRUE
);

-- ============================================
-- TABELAS DE CATEGORIZAÇÃO
-- ============================================

-- Tabela: categorias_contabeis (hierarquia pai/filho com subcategorias)
-- Categorias principais: pai_id = NULL, codigo = 'N' (ex: '1', '2', '7')
-- Subcategorias: pai_id = <id_categoria>, codigo = 'N.N' (ex: '1.1', '7.3', '10.16')
-- Campos ordem e secao_pl controlam exibição no P&L Contábil e Consolidado
CREATE TABLE categorias_contabeis (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
    nome VARCHAR NOT NULL,
    pai_id INTEGER REFERENCES categorias_contabeis(id) ON DELETE SET NULL,
    centro_custo_id INTEGER REFERENCES centros_custo(id) ON DELETE SET NULL,
    codigo VARCHAR(50),
    descricao TEXT,
    ordem INTEGER,
    secao_pl VARCHAR(100),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: categorias_gerenciais (hierarquia pai/filho com subcategorias)
-- Categorias principais: pai_id = NULL, codigo = 'CGxxx'
-- Subcategorias: pai_id = <id_categoria>, codigo = 'SGxxx'
CREATE TABLE categorias_gerenciais (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
    nome VARCHAR NOT NULL,
    pai_id INTEGER REFERENCES categorias_gerenciais(id) ON DELETE SET NULL,
    codigo VARCHAR(50),
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: contas_contabeis (plano de contas)
CREATE TABLE contas_contabeis (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
    codigo VARCHAR NOT NULL,
    nome VARCHAR NOT NULL,
    tipo VARCHAR,
    nivel INTEGER,
    pai_id INTEGER,
    aceita_lancamento BOOLEAN DEFAULT TRUE,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELAS DE PRODUTOS E SERVIÇOS
-- ============================================

-- Tabela: produtos_servicos
CREATE TABLE produtos_servicos (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
    nome VARCHAR NOT NULL,
    tipo VARCHAR,
    sku VARCHAR,
    ativo BOOLEAN DEFAULT TRUE
);

-- ============================================
-- TABELAS FINANCEIRAS
-- ============================================

-- Tabela: contas_bancarias
CREATE TABLE contas_bancarias (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
    banco VARCHAR NOT NULL,
    codigo_banco VARCHAR,
    agencia VARCHAR NOT NULL,
    conta VARCHAR NOT NULL,
    digito VARCHAR,
    tipo VARCHAR,
    saldo_inicial NUMERIC,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: cartoes_credito
CREATE TABLE cartoes_credito (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
    nome VARCHAR NOT NULL,
    bandeira VARCHAR,
    banco VARCHAR,
    limite NUMERIC,
    dia_vencimento INTEGER,
    dia_fechamento INTEGER,
    ultimos_4_digitos VARCHAR,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: cartao_usuarios (usuários vinculados a cartões)
CREATE TABLE cartao_usuarios (
    id SERIAL PRIMARY KEY,
    cartao_id INTEGER NOT NULL REFERENCES cartoes_credito(id) ON DELETE CASCADE,
    nome VARCHAR NOT NULL,
    ativo BOOLEAN DEFAULT TRUE
);

-- Tabela: faturas_cartao
CREATE TABLE faturas_cartao (
    id SERIAL PRIMARY KEY,
    cartao_id INTEGER NOT NULL REFERENCES cartoes_credito(id) ON DELETE CASCADE,
    empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
    mes_referencia INTEGER NOT NULL,
    ano_referencia INTEGER NOT NULL,
    valor_total NUMERIC,
    data_vencimento DATE,
    status VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: transacoes_cartao
CREATE TABLE transacoes_cartao (
    id SERIAL PRIMARY KEY,
    fatura_id INTEGER REFERENCES faturas_cartao(id) ON DELETE CASCADE,
    cartao_id INTEGER NOT NULL REFERENCES cartoes_credito(id) ON DELETE CASCADE,
    transacao_id INTEGER REFERENCES transacoes_financeiras(id) ON DELETE SET NULL,
    descricao VARCHAR,
    valor NUMERIC NOT NULL,
    data_compra DATE,
    parcela_atual INTEGER,
    total_parcelas INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: impostos
CREATE TABLE impostos (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    produto_servico_id INTEGER REFERENCES produtos_servicos(id) ON DELETE SET NULL,
    nome VARCHAR NOT NULL,
    codigo VARCHAR,
    tipo VARCHAR,
    valor NUMERIC NOT NULL,
    cumulativo BOOLEAN DEFAULT FALSE,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: regras_impostos
CREATE TABLE regras_impostos (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nome VARCHAR NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: regras_impostos_itens
CREATE TABLE regras_impostos_itens (
    id SERIAL PRIMARY KEY,
    regra_id INTEGER NOT NULL REFERENCES regras_impostos(id) ON DELETE CASCADE,
    imposto_id INTEGER NOT NULL REFERENCES impostos(id) ON DELETE CASCADE,
    ordem INTEGER
);

-- ============================================
-- TABELAS DE TRANSAÇÕES
-- ============================================

-- Tabela: transacoes_financeiras (tabela principal de lançamentos)
CREATE TABLE transacoes_financeiras (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    tipo tipo_transacao_enum NOT NULL,
    data_lancamento DATE NOT NULL,
    competencia_ano INTEGER NOT NULL,
    competencia_mes INTEGER NOT NULL,
    competencia_ano_contabil INTEGER,
    competencia_mes_contabil INTEGER,
    competencia_ano_gerencial INTEGER,
    competencia_mes_gerencial INTEGER,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    projeto_id INTEGER REFERENCES projetos(id) ON DELETE SET NULL,
    produto_servico_id INTEGER REFERENCES produtos_servicos(id) ON DELETE SET NULL,
    centro_custo_id INTEGER REFERENCES centros_custo(id) ON DELETE SET NULL,
    conta_contabil_id INTEGER REFERENCES contas_contabeis(id) ON DELETE SET NULL,
    categoria_contabil_id INTEGER REFERENCES categorias_contabeis(id) ON DELETE SET NULL,
    categoria_gerencial_id INTEGER REFERENCES categorias_gerenciais(id) ON DELETE SET NULL,
    subcategoria_contabil_id INTEGER REFERENCES categorias_contabeis(id) ON DELETE SET NULL,
    subcategoria_gerencial_id INTEGER REFERENCES categorias_gerenciais(id) ON DELETE SET NULL,
    linha_orcamentaria_id INTEGER REFERENCES linhas_orcamentarias(id) ON DELETE SET NULL,
    fornecedor_id INTEGER REFERENCES fornecedores(id) ON DELETE SET NULL,
    nome VARCHAR,
    descricao VARCHAR,
    valor NUMERIC NOT NULL,
    status status_transacao_enum,
    forma_pgto forma_pgto_enum,
    data_vencimento DATE,
    data_pagamento DATE,
    numero_nota_fiscal VARCHAR,
    link_nota_fiscal VARCHAR,
    numero_pedido_compra VARCHAR,
    link_pedido_compra VARCHAR,
    link_boleto VARCHAR,
    link_comprovante VARCHAR,
    referencia_externa VARCHAR,
    parent_id INTEGER REFERENCES transacoes_financeiras(id) ON DELETE SET NULL,
    tipo_filho VARCHAR,
    titulo_breve VARCHAR,
    moeda VARCHAR DEFAULT 'BRL',
    eh_duplicado BOOLEAN NOT NULL DEFAULT FALSE,
    is_cc_pagamento BOOLEAN NOT NULL DEFAULT FALSE,
    entra_no_gerencial BOOLEAN NOT NULL DEFAULT TRUE,
    exibir_no_cash_control BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: transacao_categoria_contabil (vínculo N:N transação-categoria contábil)
CREATE TABLE transacao_categoria_contabil (
    id SERIAL PRIMARY KEY,
    transacao_id INTEGER NOT NULL REFERENCES transacoes_financeiras(id) ON DELETE CASCADE,
    categoria_contabil_id INTEGER NOT NULL REFERENCES categorias_contabeis(id) ON DELETE CASCADE,
    subcategoria_contabil_id INTEGER REFERENCES categorias_contabeis(id) ON DELETE SET NULL,
    valor NUMERIC,
    percentual NUMERIC
);

-- Tabela: transacao_categoria_gerencial (vínculo N:N transação-categoria gerencial)
CREATE TABLE transacao_categoria_gerencial (
    id SERIAL PRIMARY KEY,
    transacao_id INTEGER NOT NULL REFERENCES transacoes_financeiras(id) ON DELETE CASCADE,
    categoria_gerencial_id INTEGER NOT NULL REFERENCES categorias_gerenciais(id) ON DELETE CASCADE,
    subcategoria_gerencial_id INTEGER REFERENCES categorias_gerenciais(id) ON DELETE SET NULL,
    valor NUMERIC,
    percentual NUMERIC
);

-- Tabela: transacao_impostos (impostos por transação)
CREATE TABLE transacao_impostos (
    id SERIAL PRIMARY KEY,
    transacao_id INTEGER NOT NULL REFERENCES transacoes_financeiras(id) ON DELETE CASCADE,
    imposto_id INTEGER NOT NULL REFERENCES impostos(id) ON DELETE CASCADE,
    valor_base NUMERIC,
    aliquota NUMERIC,
    valor_imposto NUMERIC
);

-- Tabela: transacao_impostos_detalhes
CREATE TABLE transacao_impostos_detalhes (
    id SERIAL PRIMARY KEY,
    transacao_imposto_id INTEGER NOT NULL REFERENCES transacao_impostos(id) ON DELETE CASCADE,
    descricao VARCHAR,
    valor NUMERIC
);

-- Tabela: transacao_mensalizacao (parcelas/mensalização)
CREATE TABLE transacao_mensalizacao (
    id SERIAL PRIMARY KEY,
    transacao_id INTEGER NOT NULL REFERENCES transacoes_financeiras(id) ON DELETE CASCADE,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    valor NUMERIC NOT NULL,
    status VARCHAR,
    data_vencimento DATE
);

-- Tabela: desmembramentos_transacoes (grupos de desmembramento)
CREATE TABLE desmembramentos_transacoes (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
    transacao_origem_id INTEGER NOT NULL REFERENCES transacoes_financeiras(id) ON DELETE CASCADE,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observacoes TEXT
);

-- Tabela: desmembramentos_itens (itens do desmembramento)
CREATE TABLE desmembramentos_itens (
    id SERIAL PRIMARY KEY,
    desmembramento_id INTEGER NOT NULL REFERENCES desmembramentos_transacoes(id) ON DELETE CASCADE,
    categoria_gerencial_id INTEGER REFERENCES categorias_gerenciais(id) ON DELETE SET NULL,
    subcategoria_gerencial_id INTEGER REFERENCES categorias_gerenciais(id) ON DELETE SET NULL,
    centro_custo_id INTEGER REFERENCES centros_custo(id) ON DELETE SET NULL,
    projeto_id INTEGER REFERENCES projetos(id) ON DELETE SET NULL,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    valor NUMERIC NOT NULL,
    percentual NUMERIC,
    descricao VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELAS DE PLANEJAMENTO ORÇAMENTÁRIO
-- ============================================

-- Tabela: planejamento_versoes
CREATE TABLE planejamento_versoes (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
    nome VARCHAR NOT NULL,
    ano_referencia INTEGER NOT NULL,
    tipo tipo_versao_enum,
    indice_revisao INTEGER,
    status status_planejamento_enum DEFAULT 'rascunho',
    is_ativo BOOLEAN DEFAULT TRUE,
    data_publicacao TIMESTAMP,
    publicado_por INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Tabela: linhas_orcamentarias
CREATE TABLE linhas_orcamentarias (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
    versao_id INTEGER NOT NULL REFERENCES planejamento_versoes(id) ON DELETE CASCADE,
    versao_publicacao_id INTEGER REFERENCES planejamento_versoes(id) ON DELETE SET NULL,
    ano INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    projeto_id INTEGER REFERENCES projetos(id) ON DELETE SET NULL,
    produto_servico_id INTEGER REFERENCES produtos_servicos(id) ON DELETE SET NULL,
    centro_custo_id INTEGER REFERENCES centros_custo(id) ON DELETE SET NULL,
    conta_contabil_id INTEGER REFERENCES contas_contabeis(id) ON DELETE SET NULL,
    categoria categoria_linha_enum,
    descricao VARCHAR,
    valor_previsto NUMERIC(15,2) NOT NULL,
    moeda VARCHAR(10) DEFAULT 'BRL',
    categoria_contabil_id INTEGER REFERENCES categorias_contabeis(id) ON DELETE SET NULL,
    categoria_gerencial_id INTEGER REFERENCES categorias_gerenciais(id) ON DELETE SET NULL,
    subcategoria_contabil_id INTEGER REFERENCES categorias_contabeis(id) ON DELETE SET NULL,
    subcategoria_gerencial_id INTEGER REFERENCES categorias_gerenciais(id) ON DELETE SET NULL,
    parent_id INTEGER REFERENCES linhas_orcamentarias(id) ON DELETE SET NULL,
    tipo_filho VARCHAR,
    data_vencimento_prevista DATE,
    data_recebimento_prevista DATE,
    data_pagamento_prevista DATE,
    quitado BOOLEAN DEFAULT FALSE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: linhaorc_categoria_contabil (vínculo linha orçamentária-categoria contábil)
CREATE TABLE linhaorc_categoria_contabil (
    id SERIAL PRIMARY KEY,
    linha_orcamentaria_id INTEGER NOT NULL REFERENCES linhas_orcamentarias(id) ON DELETE CASCADE,
    categoria_contabil_id INTEGER NOT NULL REFERENCES categorias_contabeis(id) ON DELETE CASCADE,
    subcategoria_contabil_id INTEGER REFERENCES categorias_contabeis(id) ON DELETE SET NULL,
    valor NUMERIC,
    percentual NUMERIC
);

-- Tabela: linhaorc_categoria_gerencial (vínculo linha orçamentária-categoria gerencial)
CREATE TABLE linhaorc_categoria_gerencial (
    id SERIAL PRIMARY KEY,
    linha_orcamentaria_id INTEGER NOT NULL REFERENCES linhas_orcamentarias(id) ON DELETE CASCADE,
    categoria_gerencial_id INTEGER NOT NULL REFERENCES categorias_gerenciais(id) ON DELETE CASCADE,
    subcategoria_gerencial_id INTEGER REFERENCES categorias_gerenciais(id) ON DELETE SET NULL,
    valor NUMERIC,
    percentual NUMERIC
);

-- Tabela: linhaorc_impostos
CREATE TABLE linhaorc_impostos (
    id SERIAL PRIMARY KEY,
    linha_orcamentaria_id INTEGER NOT NULL REFERENCES linhas_orcamentarias(id) ON DELETE CASCADE,
    imposto_id INTEGER NOT NULL REFERENCES impostos(id) ON DELETE CASCADE,
    valor_base NUMERIC,
    aliquota NUMERIC,
    valor_imposto NUMERIC
);

-- Tabela: linhaorc_impostos_detalhes
CREATE TABLE linhaorc_impostos_detalhes (
    id SERIAL PRIMARY KEY,
    linhaorc_imposto_id INTEGER NOT NULL REFERENCES linhaorc_impostos(id) ON DELETE CASCADE,
    descricao VARCHAR,
    valor NUMERIC
);

-- Tabela: linhaorc_mensalizacao
CREATE TABLE linhaorc_mensalizacao (
    id SERIAL PRIMARY KEY,
    linha_orcamentaria_id INTEGER NOT NULL REFERENCES linhas_orcamentarias(id) ON DELETE CASCADE,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    valor NUMERIC NOT NULL,
    status VARCHAR,
    data_vencimento DATE
);

-- ============================================
-- TABELAS DE P&L E PROJEÇÕES
-- ============================================

-- Tabela: pl_map (mapeamento para P&L)
CREATE TABLE pl_map (
    id SERIAL PRIMARY KEY,
    secao VARCHAR NOT NULL,
    categoria VARCHAR NOT NULL,
    subcategoria VARCHAR,
    ordem INTEGER,
    tipo VARCHAR
);

-- Tabela: projecoes_pl (projeções do P&L)
CREATE TABLE projecoes_pl (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
    ano INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    secao VARCHAR,
    categoria VARCHAR,
    valor NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELAS DE AUDITORIA E CONTROLE
-- ============================================

-- Tabela: logs_acoes (log de ações do sistema)
CREATE TABLE logs_acoes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    user_email VARCHAR,
    acao VARCHAR NOT NULL,
    entidade VARCHAR,
    entidade_id INTEGER,
    detalhes TEXT,
    ip_address VARCHAR,
    user_agent VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: logs_acesso (log de acessos)
CREATE TABLE logs_acesso (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ip_address VARCHAR,
    user_agent VARCHAR,
    rota VARCHAR,
    metodo VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: sessoes_usuario
CREATE TABLE sessoes_usuario (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR NOT NULL,
    ip_address VARCHAR,
    user_agent VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ativo BOOLEAN DEFAULT TRUE
);

-- Tabela: sessions (sessões web)
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR NOT NULL UNIQUE,
    data TEXT,
    expiry TIMESTAMP
);

-- Tabela: metricas_uso (métricas de uso do sistema)
CREATE TABLE metricas_uso (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    funcionalidade VARCHAR NOT NULL,
    contador INTEGER DEFAULT 1,
    periodo VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: config (configurações do sistema)
CREATE TABLE config (
    id SERIAL PRIMARY KEY,
    chave VARCHAR NOT NULL UNIQUE,
    valor TEXT,
    descricao VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELAS AUXILIARES (ASSOCIAÇÃO)
-- ============================================

-- Tabela: projeto_clientes (relacionamento muitos-para-muitos)
CREATE TABLE projeto_clientes (
    id SERIAL PRIMARY KEY,
    projeto_id INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE
);

-- Tabela: produto_servico_clientes (relacionamento muitos-para-muitos)
CREATE TABLE produto_servico_clientes (
    id SERIAL PRIMARY KEY,
    produto_servico_id INTEGER NOT NULL REFERENCES produtos_servicos(id) ON DELETE CASCADE,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX idx_transacoes_empresa ON transacoes_financeiras(empresa_id);
CREATE INDEX idx_transacoes_tipo ON transacoes_financeiras(tipo);
CREATE INDEX idx_transacoes_competencia ON transacoes_financeiras(competencia_ano, competencia_mes);
CREATE INDEX idx_transacoes_data_lancamento ON transacoes_financeiras(data_lancamento);
CREATE INDEX idx_transacoes_cliente ON transacoes_financeiras(cliente_id);
CREATE INDEX idx_transacoes_fornecedor ON transacoes_financeiras(fornecedor_id);
CREATE INDEX idx_transacoes_cat_contabil ON transacoes_financeiras(categoria_contabil_id);
CREATE INDEX idx_transacoes_subcat_contabil ON transacoes_financeiras(subcategoria_contabil_id);
CREATE INDEX idx_transacoes_cat_gerencial ON transacoes_financeiras(categoria_gerencial_id);
CREATE INDEX idx_transacoes_subcat_gerencial ON transacoes_financeiras(subcategoria_gerencial_id);
CREATE INDEX idx_linhas_versao ON linhas_orcamentarias(versao_id);
CREATE INDEX idx_linhas_ano_mes ON linhas_orcamentarias(ano, mes);
CREATE INDEX idx_desmembramentos_transacao ON desmembramentos_transacoes(transacao_origem_id);
CREATE INDEX idx_logs_acoes_created ON logs_acoes(created_at);
CREATE INDEX idx_logs_acoes_user ON logs_acoes(user_id);
CREATE INDEX idx_cat_contabeis_pai ON categorias_contabeis(pai_id);
CREATE INDEX idx_cat_contabeis_ordem ON categorias_contabeis(ordem);
CREATE INDEX idx_cat_gerenciais_pai ON categorias_gerenciais(pai_id);

-- ============================================
-- COMENTÁRIOS NAS TABELAS
-- ============================================

COMMENT ON TABLE empresas IS 'Cadastro de empresas do sistema';
COMMENT ON TABLE transacoes_financeiras IS 'Tabela principal de lançamentos financeiros';
COMMENT ON TABLE categorias_contabeis IS 'Categorias contábeis hierárquicas (pai/filho) para P&L Contábil e Consolidado. Subcategorias usam pai_id, campos ordem e secao_pl controlam exibição no P&L';
COMMENT ON TABLE categorias_gerenciais IS 'Categorias gerenciais hierárquicas (pai/filho) para análise gerencial. Subcategorias usam pai_id';
COMMENT ON TABLE planejamento_versoes IS 'Versões do planejamento orçamentário';
COMMENT ON TABLE linhas_orcamentarias IS 'Linhas de orçamento por versão com vínculo a categorias/subcategorias contábeis e gerenciais';
COMMENT ON TABLE desmembramentos_transacoes IS 'Grupos de desmembramento de transações';
COMMENT ON TABLE desmembramentos_itens IS 'Itens individuais dos desmembramentos por categoria/centro';
COMMENT ON TABLE logs_acoes IS 'Log de auditoria de ações do sistema';

-- FIM DO SCRIPT
```

---

## 8. Checklist de Migração para AWS

### 8.1 Pré-Migração
- [ ] Criar conta AWS e configurar IAM
- [ ] Configurar VPC com subnets públicas/privadas
- [ ] Criar Security Groups
- [ ] Configurar RDS PostgreSQL
- [ ] Executar script SQL de criação
- [ ] Migrar dados existentes
- [ ] Configurar Cognito com Google OAuth
- [ ] Criar repositório ECR para imagens Docker

### 8.2 Deploy
- [ ] Criar Dockerfile para a aplicação
- [ ] Configurar ECS Task Definition
- [ ] Criar ECS Service com Fargate
- [ ] Configurar ALB e Target Groups
- [ ] Configurar Route 53 e certificado ACM
- [ ] Configurar CloudFront para assets

### 8.3 Pós-Deploy
- [ ] Configurar CloudWatch Logs
- [ ] Criar alarmes de monitoramento
- [ ] Configurar backups automáticos RDS
- [ ] Testar autenticação Google
- [ ] Validar todas as funcionalidades
- [ ] Documentar procedimentos operacionais

---

## 9. Histórico de Alterações

| Data | Versão | Descrição |
|------|--------|-----------|
| Janeiro 2026 | 1.0 | Versão inicial do Memorial Descritivo |
| Janeiro 2026 | 2.0 | Inclusão de infraestrutura AWS, script SQL e checklist de migração |
| Fevereiro 2026 | 3.0 | Atualização categorias gerenciais (12 categorias + subcategorias via pai_id). Atualização categorias contábeis (12 categorias + subcategorias hierárquicas com campos `ordem` e `secao_pl` para P&L). Inclusão de todas as tabelas auxiliares do sistema (cartões, faturas, impostos detalhados, desmembramentos, P&L map, projeções, logs, métricas, config). Script SQL atualizado para refletir estrutura real do banco em produção |

---

*Documento atualizado em: Fevereiro 2026*
*Versão: 3.0*
