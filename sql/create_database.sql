-- ============================================================================
-- BENNU FINANCE - Script de Criacao do Banco de Dados
-- ============================================================================
-- Versao: 3.0
-- Data: Fevereiro 2026
-- Banco: PostgreSQL 15.x ou superior
-- Descricao: Cria todas as tabelas, tipos enumerados, indices, foreign keys
--            e views necessarias para o funcionamento do Bennu Finance.
--
-- USO:
--   psql -h <HOST> -U <USUARIO> -d bennu_finance -f create_database.sql
--
-- IMPORTANTE:
--   - Execute este script em um banco VAZIO (recem-criado).
--   - Se o banco ja possuir dados, use pg_dump/pg_restore para migracao.
--   - A ordem de criacao respeita as dependencias entre tabelas (FK).
-- ============================================================================

-- ============================================================================
-- 1. TIPOS ENUMERADOS (ENUMs)
-- ============================================================================

DO $$ BEGIN CREATE TYPE tipo_transacao_enum AS ENUM ('receita', 'despesa', 'transferencia', 'ajuste'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE status_enum AS ENUM ('pendente', 'pago', 'cancelado', 'desmembrado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE forma_pgto_enum AS ENUM ('pix', 'transferencia', 'cartao', 'boleto', 'especie', 'outros'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE status_cliente_enum AS ENUM ('ativo', 'inativo', 'prospect'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tipo_pessoa_enum AS ENUM ('fisica', 'juridica'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE papel_enum AS ENUM ('admin', 'gestor', 'operador'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tipo_conta_bancaria_enum AS ENUM ('corrente', 'poupanca', 'salario'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tipo_conta AS ENUM ('ativo', 'passivo', 'receita', 'despesa', 'patrimonio_liquido'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tipo_conta_enum AS ENUM ('ativo', 'passivo', 'receita', 'despesa', 'patrimonio', 'outros'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tipo_imposto_enum AS ENUM ('percentual', 'fixo'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tipo_produto_enum AS ENUM ('produto', 'servico'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tipo_planejamento_enum AS ENUM ('baseline', 'forecast'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE status_planejamento_enum AS ENUM ('rascunho', 'publicado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE categoria_linha_enum AS ENUM ('receita', 'despesa', 'investimento'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE base_calculo_enum AS ENUM ('bruta', 'liquida'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE base_imposto_enum AS ENUM ('bruta', 'liquida'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE status_processamento_enum AS ENUM ('pendente', 'processado', 'erro'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE status_categorizacao_enum AS ENUM ('pendente', 'categorizada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- 2. TABELAS PRINCIPAIS (ordem respeitando dependencias FK)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 Empresas
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS empresas (
    id              SERIAL PRIMARY KEY,
    nome_fantasia   VARCHAR(120) NOT NULL,
    razao_social    VARCHAR(255),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    aliquota_iss    NUMERIC(5,2) NOT NULL DEFAULT 5.00,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2.2 CNPJs das Empresas (uma empresa pode ter multiplos CNPJs)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS empresa_cnpjs (
    id                  SERIAL PRIMARY KEY,
    empresa_id          INTEGER NOT NULL REFERENCES empresas(id),
    cnpj                VARCHAR(18) NOT NULL,
    inscricao_estadual  VARCHAR(20),
    apelido             VARCHAR(60),
    ativo               BOOLEAN,
    UNIQUE (empresa_id, cnpj)
);

-- ----------------------------------------------------------------------------
-- 2.3 Usuarios
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id                  SERIAL PRIMARY KEY,
    empresa_id          INTEGER REFERENCES empresas(id),
    nome                VARCHAR(120) NOT NULL,
    email               VARCHAR(120) NOT NULL UNIQUE,
    senha_hash          VARCHAR(256),
    papel               papel_enum,
    ativo               BOOLEAN DEFAULT TRUE,
    external_auth_id    VARCHAR(255) UNIQUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2.4 Sessions (connect-pg-simple / express-session)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    sid     VARCHAR NOT NULL PRIMARY KEY,
    sess    JSON NOT NULL,
    expire  TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);

-- ----------------------------------------------------------------------------
-- 2.5 Clientes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
    id          SERIAL PRIMARY KEY,
    empresa_id  INTEGER REFERENCES empresas(id),
    nome        VARCHAR(120) NOT NULL,
    documento   VARCHAR(18),
    status      status_cliente_enum,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2.6 Contatos de Clientes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contatos_clientes (
    id          SERIAL PRIMARY KEY,
    cliente_id  INTEGER NOT NULL REFERENCES clientes(id),
    nome        VARCHAR(120) NOT NULL,
    cargo       VARCHAR(100),
    email       VARCHAR(120),
    telefone    VARCHAR(20),
    celular     VARCHAR(20),
    principal   BOOLEAN,
    ativo       BOOLEAN,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2.7 Fornecedores
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fornecedores (
    id          SERIAL PRIMARY KEY,
    empresa_id  INTEGER REFERENCES empresas(id),
    nome        VARCHAR(120) NOT NULL,
    documento   VARCHAR(18),
    tipo_pessoa tipo_pessoa_enum,
    email       VARCHAR(120),
    telefone    VARCHAR(20),
    endereco    VARCHAR(255),
    observacoes TEXT,
    ativo       BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2.8 Contatos de Fornecedores
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contatos_fornecedores (
    id              SERIAL PRIMARY KEY,
    fornecedor_id   INTEGER NOT NULL REFERENCES fornecedores(id),
    nome            VARCHAR(120) NOT NULL,
    cargo           VARCHAR(100),
    email           VARCHAR(120),
    telefone        VARCHAR(20),
    celular         VARCHAR(20),
    principal       BOOLEAN,
    ativo           BOOLEAN,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2.9 Centros de Custo
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS centros_custo (
    id          SERIAL PRIMARY KEY,
    empresa_id  INTEGER REFERENCES empresas(id),
    codigo      VARCHAR(20) NOT NULL,
    nome        VARCHAR(120) NOT NULL,
    pai_id      INTEGER REFERENCES centros_custo(id),
    ativo       BOOLEAN DEFAULT TRUE
);

-- ----------------------------------------------------------------------------
-- 2.10 Categorias Contabeis (hierarquia via pai_id)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias_contabeis (
    id              SERIAL PRIMARY KEY,
    empresa_id      INTEGER REFERENCES empresas(id),
    nome            VARCHAR(120) NOT NULL,
    pai_id          INTEGER REFERENCES categorias_contabeis(id),
    centro_custo_id INTEGER REFERENCES centros_custo(id),
    codigo          VARCHAR(50),
    descricao       TEXT,
    ativo           BOOLEAN DEFAULT TRUE,
    ordem           INTEGER,
    secao_pl        VARCHAR(100),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2.11 Categorias Gerenciais (hierarquia via pai_id)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias_gerenciais (
    id          SERIAL PRIMARY KEY,
    empresa_id  INTEGER REFERENCES empresas(id),
    nome        VARCHAR(120) NOT NULL,
    pai_id      INTEGER REFERENCES categorias_gerenciais(id),
    codigo      VARCHAR(50),
    descricao   TEXT,
    ativo       BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2.12 Contas Contabeis (plano de contas)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contas_contabeis (
    id                  SERIAL PRIMARY KEY,
    empresa_id          INTEGER REFERENCES empresas(id),
    codigo              VARCHAR(20) NOT NULL,
    nome                VARCHAR(120) NOT NULL,
    tipo                tipo_conta_enum,
    nivel               INTEGER,
    pai_id              INTEGER REFERENCES contas_contabeis(id),
    aceita_lancamento   BOOLEAN DEFAULT TRUE,
    ativo               BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2.13 Produtos e Servicos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS produtos_servicos (
    id          SERIAL PRIMARY KEY,
    empresa_id  INTEGER REFERENCES empresas(id),
    nome        VARCHAR(120) NOT NULL,
    tipo        tipo_produto_enum,
    sku         VARCHAR(50),
    ativo       BOOLEAN DEFAULT TRUE
);

-- ----------------------------------------------------------------------------
-- 2.14 Classificacoes de Projeto
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projeto_classificacoes (
    id          SERIAL PRIMARY KEY,
    empresa_id  INTEGER NOT NULL REFERENCES empresas(id),
    nome        VARCHAR(120) NOT NULL,
    cor_hex     VARCHAR(7)
);

-- ----------------------------------------------------------------------------
-- 2.15 Projetos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projetos (
    id                  SERIAL PRIMARY KEY,
    empresa_id          INTEGER REFERENCES empresas(id),
    cliente_id          INTEGER REFERENCES clientes(id),
    classificacao_id    INTEGER REFERENCES projeto_classificacoes(id),
    nome                VARCHAR(120) NOT NULL,
    codigo_interno      VARCHAR(50),
    ativo               BOOLEAN DEFAULT TRUE,
    UNIQUE (empresa_id, codigo_interno)
);

-- ----------------------------------------------------------------------------
-- 2.16 Contas Bancarias
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contas_bancarias (
    id              SERIAL PRIMARY KEY,
    empresa_id      INTEGER REFERENCES empresas(id),
    banco           VARCHAR(100) NOT NULL,
    codigo_banco    VARCHAR(10),
    agencia         VARCHAR(20) NOT NULL,
    conta           VARCHAR(20) NOT NULL,
    digito          VARCHAR(2),
    tipo            tipo_conta_bancaria_enum,
    saldo_inicial   NUMERIC(14,2),
    ativa           BOOLEAN DEFAULT TRUE,
    ativo           BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2.17 Impostos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS impostos (
    id                  SERIAL PRIMARY KEY,
    empresa_id          INTEGER NOT NULL REFERENCES empresas(id),
    produto_servico_id  INTEGER REFERENCES produtos_servicos(id),
    nome                VARCHAR(60) NOT NULL,
    codigo              VARCHAR(10),
    tipo                tipo_imposto_enum,
    valor               NUMERIC(8,4) NOT NULL,
    cumulativo          BOOLEAN DEFAULT FALSE,
    ativo               BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2.18 Cartoes de Credito
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cartoes_credito (
    id                  SERIAL PRIMARY KEY,
    empresa_id          INTEGER REFERENCES empresas(id),
    nome                VARCHAR(100) NOT NULL,
    bandeira            VARCHAR(50),
    banco               VARCHAR(100),
    limite              NUMERIC(14,2),
    dia_vencimento      INTEGER,
    dia_fechamento      INTEGER,
    ultimos_4_digitos   VARCHAR(4),
    ativo               BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2.19 Usuarios do Cartao (N:N entre cartao e usuario)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cartao_usuarios (
    id              SERIAL PRIMARY KEY,
    cartao_id       INTEGER NOT NULL REFERENCES cartoes_credito(id),
    user_id         INTEGER NOT NULL REFERENCES users(id),
    nome_usuario    VARCHAR(100) NOT NULL,
    ativo           BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2.20 Regras de Impostos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS regras_impostos (
    id              SERIAL PRIMARY KEY,
    empresa_id      INTEGER NOT NULL REFERENCES empresas(id),
    nome_regra      VARCHAR(120) NOT NULL,
    base            base_imposto_enum,
    ordem_aplicacao INTEGER
);

-- ----------------------------------------------------------------------------
-- 2.21 Itens das Regras de Impostos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS regras_impostos_itens (
    id          SERIAL PRIMARY KEY,
    regra_id    INTEGER NOT NULL REFERENCES regras_impostos(id),
    imposto_id  INTEGER NOT NULL REFERENCES impostos(id),
    prioridade  INTEGER
);


-- ============================================================================
-- 3. TABELAS DE PLANEJAMENTO ORCAMENTARIO
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 Versoes de Planejamento
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planejamento_versoes (
    id              SERIAL PRIMARY KEY,
    empresa_id      INTEGER REFERENCES empresas(id),
    nome            VARCHAR(120) NOT NULL,
    ano_referencia  INTEGER NOT NULL,
    tipo            tipo_planejamento_enum,
    indice_forecast INTEGER,
    indice_revisao  INTEGER,
    status          status_planejamento_enum DEFAULT 'rascunho',
    is_ativo        BOOLEAN DEFAULT TRUE,
    data_publicacao TIMESTAMP,
    publicado_por   INTEGER,
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_planejamento_versoes_status ON planejamento_versoes(status);
CREATE INDEX IF NOT EXISTS idx_planejamento_versoes_tipo_ano ON planejamento_versoes(tipo, ano_referencia);

-- ----------------------------------------------------------------------------
-- 3.2 Linhas Orcamentarias
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS linhas_orcamentarias (
    id                          SERIAL PRIMARY KEY,
    empresa_id                  INTEGER REFERENCES empresas(id),
    versao_id                   INTEGER NOT NULL REFERENCES planejamento_versoes(id),
    versao_publicacao_id        INTEGER REFERENCES planejamento_versoes(id),
    ano                         INTEGER NOT NULL,
    mes                         INTEGER NOT NULL,
    cliente_id                  INTEGER REFERENCES clientes(id),
    projeto_id                  INTEGER REFERENCES projetos(id),
    produto_servico_id          INTEGER REFERENCES produtos_servicos(id),
    centro_custo_id             INTEGER REFERENCES centros_custo(id),
    conta_contabil_id           INTEGER REFERENCES contas_contabeis(id),
    categoria                   categoria_linha_enum,
    descricao                   VARCHAR(255),
    valor_previsto              NUMERIC(14,2) NOT NULL,
    moeda                       VARCHAR(3) DEFAULT 'BRL',
    categoria_contabil_id       INTEGER REFERENCES categorias_contabeis(id),
    subcategoria_contabil_id    INTEGER REFERENCES categorias_contabeis(id),
    categoria_gerencial_id      INTEGER REFERENCES categorias_gerenciais(id),
    subcategoria_gerencial_id   INTEGER REFERENCES categorias_gerenciais(id),
    parent_id                   INTEGER REFERENCES linhas_orcamentarias(id),
    tipo_filho                  VARCHAR(16),
    data_vencimento_prevista    DATE,
    data_recebimento_prevista   DATE,
    data_pagamento_prevista     DATE,
    quitado                     BOOLEAN DEFAULT FALSE,
    created_by                  INTEGER REFERENCES users(id),
    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_linhas_orcamentarias_parent_id ON linhas_orcamentarias(parent_id);
CREATE INDEX IF NOT EXISTS idx_linhas_orcamentarias_parent_null ON linhas_orcamentarias(parent_id) WHERE parent_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_linhas_versao_publicacao ON linhas_orcamentarias(versao_publicacao_id);

-- ----------------------------------------------------------------------------
-- 3.3 Mensalizacao de Linhas Orcamentarias
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS linhaorc_mensalizacao (
    id          SERIAL PRIMARY KEY,
    linha_id    INTEGER NOT NULL REFERENCES linhas_orcamentarias(id),
    mes         INTEGER NOT NULL,
    valor       NUMERIC(14,2) NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3.4 Impostos de Linhas Orcamentarias
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS linhaorc_impostos (
    id                      SERIAL PRIMARY KEY,
    linha_id                INTEGER NOT NULL REFERENCES linhas_orcamentarias(id),
    regra_id                INTEGER NOT NULL REFERENCES regras_impostos(id),
    base_calculo            base_calculo_enum,
    valor_base              NUMERIC(14,2),
    valor_imposto_total     NUMERIC(14,2)
);

-- ----------------------------------------------------------------------------
-- 3.5 Detalhes de Impostos de Linhas Orcamentarias
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS linhaorc_impostos_detalhes (
    id                      SERIAL PRIMARY KEY,
    linha_imposto_id        INTEGER NOT NULL REFERENCES linhaorc_impostos(id),
    imposto_id              INTEGER NOT NULL REFERENCES impostos(id),
    base_calculo_imposto    NUMERIC(14,2),
    valor_imposto           NUMERIC(14,2),
    aliquota_aplicada       NUMERIC(8,4)
);

-- ----------------------------------------------------------------------------
-- 3.6 Categorias Contabeis de Linhas Orcamentarias (N:N)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS linhaorc_categoria_contabil (
    linha_id                INTEGER NOT NULL REFERENCES linhas_orcamentarias(id),
    categoria_contabil_id   INTEGER NOT NULL REFERENCES categorias_contabeis(id),
    PRIMARY KEY (linha_id, categoria_contabil_id)
);

-- ----------------------------------------------------------------------------
-- 3.7 Categorias Gerenciais de Linhas Orcamentarias (N:N)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS linhaorc_categoria_gerencial (
    linha_id                    INTEGER NOT NULL REFERENCES linhas_orcamentarias(id),
    categoria_gerencial_id      INTEGER NOT NULL REFERENCES categorias_gerenciais(id),
    PRIMARY KEY (linha_id, categoria_gerencial_id)
);


-- ============================================================================
-- 4. TABELAS TRANSACIONAIS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 Transacoes Financeiras (tabela principal)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transacoes_financeiras (
    id                          SERIAL PRIMARY KEY,
    empresa_id                  INTEGER NOT NULL REFERENCES empresas(id),
    tipo                        tipo_transacao_enum NOT NULL,
    data_lancamento             DATE NOT NULL,
    competencia_ano             INTEGER NOT NULL,
    competencia_mes             INTEGER NOT NULL,
    competencia_ano_contabil    INTEGER,
    competencia_mes_contabil    INTEGER,
    competencia_ano_gerencial   INTEGER,
    competencia_mes_gerencial   INTEGER,
    cliente_id                  INTEGER REFERENCES clientes(id),
    projeto_id                  INTEGER REFERENCES projetos(id),
    produto_servico_id          INTEGER REFERENCES produtos_servicos(id),
    centro_custo_id             INTEGER REFERENCES centros_custo(id),
    conta_contabil_id           INTEGER REFERENCES contas_contabeis(id),
    categoria_contabil_id       INTEGER REFERENCES categorias_contabeis(id),
    subcategoria_contabil_id    INTEGER REFERENCES categorias_contabeis(id),
    categoria_gerencial_id      INTEGER REFERENCES categorias_gerenciais(id),
    subcategoria_gerencial_id   INTEGER REFERENCES categorias_gerenciais(id),
    fornecedor_id               INTEGER REFERENCES fornecedores(id),
    linha_orcamentaria_id       INTEGER REFERENCES linhas_orcamentarias(id),
    nome                        VARCHAR(120),
    descricao                   VARCHAR(255),
    valor                       NUMERIC(14,2) NOT NULL,
    status                      status_enum,
    forma_pgto                  forma_pgto_enum,
    data_vencimento             DATE,
    data_pagamento              DATE,
    numero_nota_fiscal          VARCHAR(50),
    link_nota_fiscal            VARCHAR(255),
    numero_pedido_compra        VARCHAR(50),
    link_pedido_compra          VARCHAR(255),
    link_boleto                 VARCHAR(255),
    link_comprovante            VARCHAR(255),
    referencia_externa          VARCHAR(100),
    parent_id                   INTEGER REFERENCES transacoes_financeiras(id),
    tipo_filho                  VARCHAR(16),
    titulo_breve                VARCHAR(120),
    moeda                       VARCHAR(3) DEFAULT 'BRL',
    eh_duplicado                BOOLEAN NOT NULL DEFAULT FALSE,
    is_cc_pagamento             BOOLEAN NOT NULL DEFAULT FALSE,
    entra_no_gerencial          BOOLEAN NOT NULL DEFAULT TRUE,
    exibir_no_cash_control      BOOLEAN NOT NULL DEFAULT TRUE,
    valor_recebido              NUMERIC(14,2),
    valor_pago                  NUMERIC(14,2),
    created_by                  INTEGER REFERENCES users(id),
    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transacao_competencia ON transacoes_financeiras(competencia_ano, competencia_mes);
CREATE INDEX IF NOT EXISTS idx_transacao_eh_duplicado ON transacoes_financeiras(eh_duplicado);
CREATE INDEX IF NOT EXISTS idx_transacao_parent ON transacoes_financeiras(parent_id);

-- ----------------------------------------------------------------------------
-- 4.2 Categorias Contabeis de Transacoes (N:N)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transacao_categoria_contabil (
    transacao_id            INTEGER NOT NULL REFERENCES transacoes_financeiras(id),
    categoria_contabil_id   INTEGER NOT NULL REFERENCES categorias_contabeis(id),
    PRIMARY KEY (transacao_id, categoria_contabil_id)
);

-- ----------------------------------------------------------------------------
-- 4.3 Categorias Gerenciais de Transacoes (N:N)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transacao_categoria_gerencial (
    transacao_id                INTEGER NOT NULL REFERENCES transacoes_financeiras(id),
    categoria_gerencial_id      INTEGER NOT NULL REFERENCES categorias_gerenciais(id),
    PRIMARY KEY (transacao_id, categoria_gerencial_id)
);

-- ----------------------------------------------------------------------------
-- 4.4 Mensalizacao de Transacoes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transacao_mensalizacao (
    id              SERIAL PRIMARY KEY,
    transacao_id    INTEGER NOT NULL REFERENCES transacoes_financeiras(id),
    mes             INTEGER NOT NULL,
    valor           NUMERIC(14,2) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 4.5 Impostos de Transacoes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transacao_impostos (
    id                  SERIAL PRIMARY KEY,
    transacao_id        INTEGER NOT NULL REFERENCES transacoes_financeiras(id),
    regra_id            INTEGER NOT NULL REFERENCES regras_impostos(id),
    base_calculo        base_calculo_enum,
    valor_base          NUMERIC(14,2),
    valor_imposto_total NUMERIC(14,2)
);

-- ----------------------------------------------------------------------------
-- 4.6 Detalhes de Impostos de Transacoes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transacao_impostos_detalhes (
    id                      SERIAL PRIMARY KEY,
    transacao_imposto_id    INTEGER NOT NULL REFERENCES transacao_impostos(id),
    imposto_id              INTEGER NOT NULL REFERENCES impostos(id),
    base_calculo_imposto    NUMERIC(14,2),
    valor_imposto           NUMERIC(14,2),
    aliquota_aplicada       NUMERIC(8,4)
);


-- ============================================================================
-- 5. DESMEMBRAMENTOS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5.1 Desmembramentos de Transacoes (cabecalho)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS desmembramentos_transacoes (
    id                      SERIAL PRIMARY KEY,
    empresa_id              INTEGER NOT NULL REFERENCES empresas(id),
    transacao_origem_id     INTEGER NOT NULL REFERENCES transacoes_financeiras(id),
    created_by              INTEGER NOT NULL REFERENCES users(id),
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observacoes             TEXT
);

-- ----------------------------------------------------------------------------
-- 5.2 Itens de Desmembramento
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS desmembramentos_itens (
    id                          SERIAL PRIMARY KEY,
    desmembramento_id           INTEGER NOT NULL REFERENCES desmembramentos_transacoes(id),
    transacao_derivada_id       INTEGER NOT NULL REFERENCES transacoes_financeiras(id),
    valor                       NUMERIC(14,2) NOT NULL,
    cliente_id                  INTEGER REFERENCES clientes(id),
    categoria_contabil_id       INTEGER REFERENCES categorias_contabeis(id),
    subcategoria_contabil_id    INTEGER,
    categoria_gerencial_id      INTEGER REFERENCES categorias_gerenciais(id),
    subcategoria_gerencial_id   INTEGER,
    centro_custo_id             INTEGER REFERENCES centros_custo(id),
    projeto_id                  INTEGER,
    produto_servico_id          INTEGER,
    competencia_ano             INTEGER NOT NULL,
    competencia_mes             INTEGER NOT NULL,
    descricao                   VARCHAR(255)
);


-- ============================================================================
-- 6. CARTAO DE CREDITO - FATURAS E TRANSACOES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 6.1 Faturas de Cartao de Credito
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS faturas_cartao (
    id                      SERIAL PRIMARY KEY,
    empresa_id              INTEGER NOT NULL REFERENCES empresas(id),
    cartao_id               INTEGER NOT NULL REFERENCES cartoes_credito(id),
    mes_referencia          INTEGER NOT NULL,
    ano_referencia          INTEGER NOT NULL,
    data_vencimento         DATE,
    valor_total             NUMERIC(14,2),
    nome_arquivo_pdf        VARCHAR(255),
    caminho_arquivo         VARCHAR(500),
    status_processamento    status_processamento_enum,
    uploaded_by             INTEGER REFERENCES users(id),
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 6.2 Transacoes de Cartao de Credito
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transacoes_cartao (
    id                          SERIAL PRIMARY KEY,
    fatura_id                   INTEGER NOT NULL REFERENCES faturas_cartao(id),
    empresa_id                  INTEGER NOT NULL REFERENCES empresas(id),
    data_transacao              DATE NOT NULL,
    estabelecimento             VARCHAR(255),
    descricao                   VARCHAR(255) NOT NULL,
    valor                       NUMERIC(14,2) NOT NULL,
    portador                    VARCHAR(100),
    categoria_contabil_id       INTEGER REFERENCES categorias_contabeis(id),
    subcategoria_contabil_id    INTEGER REFERENCES categorias_contabeis(id),
    categoria_gerencial_id      INTEGER REFERENCES categorias_gerenciais(id),
    subcategoria_gerencial_id   INTEGER REFERENCES categorias_gerenciais(id),
    centro_custo_id             INTEGER REFERENCES centros_custo(id),
    conta_contabil_id           INTEGER REFERENCES contas_contabeis(id),
    status_categorizacao        status_categorizacao_enum,
    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================================
-- 7. TABELAS DE ASSOCIACAO (N:N)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 7.1 Projeto x Cliente
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projeto_clientes (
    id          SERIAL PRIMARY KEY,
    projeto_id  INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    cliente_id  INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    UNIQUE (projeto_id, cliente_id)
);

-- ----------------------------------------------------------------------------
-- 7.2 Produto/Servico x Cliente
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS produto_servico_clientes (
    id                  SERIAL PRIMARY KEY,
    produto_servico_id  INTEGER NOT NULL REFERENCES produtos_servicos(id) ON DELETE CASCADE,
    cliente_id          INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    UNIQUE (produto_servico_id, cliente_id)
);


-- ============================================================================
-- 8. P&L (DEMONSTRATIVO DE RESULTADOS)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 8.1 Mapeamento de P&L (regras de classificacao)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pl_map (
    id                          SERIAL PRIMARY KEY,
    section                     TEXT NOT NULL,
    label                       TEXT NOT NULL,
    cliente_id                  INTEGER REFERENCES clientes(id),
    produto_servico_id          INTEGER REFERENCES produtos_servicos(id),
    categoria_gerencial_id      INTEGER REFERENCES categorias_gerenciais(id),
    subcategoria_gerencial_id   INTEGER REFERENCES categorias_gerenciais(id),
    categoria_contabil_id       INTEGER REFERENCES categorias_contabeis(id),
    subcategoria_contabil_id    INTEGER REFERENCES categorias_contabeis(id),
    conta_contabil_id           INTEGER REFERENCES contas_contabeis(id),
    centro_custo_id             INTEGER REFERENCES centros_custo(id),
    tipo_match                  TEXT DEFAULT 'ANY',
    sign                        SMALLINT DEFAULT 1,
    ordem_exibicao              INTEGER DEFAULT 1,
    ativo                       BOOLEAN DEFAULT TRUE,
    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 8.2 Projecoes de P&L
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projecoes_pl (
    id                  SERIAL PRIMARY KEY,
    empresa_id          INTEGER NOT NULL REFERENCES empresas(id),
    ano                 INTEGER NOT NULL,
    mes                 INTEGER NOT NULL,
    section             TEXT NOT NULL,
    label               TEXT NOT NULL,
    valor_previsto      NUMERIC(14,2) NOT NULL DEFAULT 0,
    valor_budget        NUMERIC(14,2) DEFAULT 0,
    cliente_id          INTEGER,
    produto_servico_id  INTEGER,
    created_by          INTEGER REFERENCES users(id),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_projecoes_pl_unique
    ON projecoes_pl(empresa_id, ano, mes, section, label, COALESCE(cliente_id, 0), COALESCE(produto_servico_id, 0));

CREATE UNIQUE INDEX IF NOT EXISTS projecoes_pl_empresa_id_ano_mes_section_label_key
    ON projecoes_pl(empresa_id, ano, mes, section, label);


-- ============================================================================
-- 9. AUDITORIA E MONITORAMENTO
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 9.1 Logs de Acesso (login/logout)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS logs_acesso (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    email       VARCHAR(255),
    acao        VARCHAR(50) NOT NULL,
    ip_address  VARCHAR(50),
    user_agent  TEXT,
    sucesso     BOOLEAN DEFAULT TRUE,
    mensagem    TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_acesso_user_id ON logs_acesso(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_acesso_created_at ON logs_acesso(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_acesso_acao ON logs_acesso(acao);

-- ----------------------------------------------------------------------------
-- 9.2 Sessoes de Usuario
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessoes_usuario (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token       VARCHAR(255) UNIQUE,
    ip_address          VARCHAR(50),
    user_agent          TEXT,
    inicio              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ultima_atividade    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fim                 TIMESTAMP WITH TIME ZONE,
    duracao_segundos    INTEGER,
    ativa               BOOLEAN DEFAULT TRUE,
    paginas_visitadas   TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessoes_user_id ON sessoes_usuario(user_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_ativa ON sessoes_usuario(ativa);
CREATE INDEX IF NOT EXISTS idx_sessoes_inicio ON sessoes_usuario(inicio);

-- ----------------------------------------------------------------------------
-- 9.3 Logs de Acoes (CRUD)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS logs_acoes (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    sessao_id       INTEGER REFERENCES sessoes_usuario(id) ON DELETE SET NULL,
    acao            VARCHAR(50) NOT NULL,
    entidade        VARCHAR(100) NOT NULL,
    entidade_id     INTEGER,
    descricao       TEXT,
    dados_antes     TEXT,
    dados_depois    TEXT,
    ip_address      VARCHAR(50),
    rota            VARCHAR(255),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_acoes_user_id ON logs_acoes(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_acoes_sessao_id ON logs_acoes(sessao_id);
CREATE INDEX IF NOT EXISTS idx_logs_acoes_entidade ON logs_acoes(entidade);
CREATE INDEX IF NOT EXISTS idx_logs_acoes_created_at ON logs_acoes(created_at);

-- ----------------------------------------------------------------------------
-- 9.4 Metricas de Uso (agregadas)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metricas_uso (
    id                      SERIAL PRIMARY KEY,
    data                    TIMESTAMP WITH TIME ZONE NOT NULL,
    periodo                 VARCHAR(20) NOT NULL,
    total_acessos           INTEGER DEFAULT 0,
    usuarios_unicos         INTEGER DEFAULT 0,
    total_acoes             INTEGER DEFAULT 0,
    tempo_medio_sessao      INTEGER DEFAULT 0,
    pagina_mais_visitada    VARCHAR(255),
    acao_mais_comum         VARCHAR(50),
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_metricas_data ON metricas_uso(data);
CREATE INDEX IF NOT EXISTS idx_metricas_periodo ON metricas_uso(periodo);


-- ============================================================================
-- 10. CONFIGURACAO DO SISTEMA
-- ============================================================================

CREATE TABLE IF NOT EXISTS config (
    id              INTEGER PRIMARY KEY DEFAULT 1,
    voting_end_date TIMESTAMP,
    voting_active   BOOLEAN DEFAULT FALSE,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================================
-- 11. VIEWS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 11.1 View: Entradas Financeiras (receitas)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW entradas_financeiras AS
SELECT
    id,
    empresa_id,
    cliente_id,
    projeto_id,
    produto_servico_id,
    data_lancamento AS data_emissao,
    make_date(competencia_ano, competencia_mes, 1) AS data_competencia,
    data_pagamento,
    valor AS valor_bruto,
    0 AS descontos,
    0 AS impostos_retidos,
    valor AS valor_liquido,
    categoria_gerencial_id,
    subcategoria_gerencial_id,
    categoria_contabil_id,
    subcategoria_contabil_id,
    entra_no_gerencial AS pl_gerencial,
    TRUE AS pl_contabil
FROM transacoes_financeiras
WHERE tipo = 'receita'::tipo_transacao_enum;

-- ----------------------------------------------------------------------------
-- 11.2 View: Saidas Financeiras (despesas)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW saidas_financeiras AS
SELECT
    id,
    empresa_id,
    fornecedor_id,
    centro_custo_id,
    conta_contabil_id AS conta_id,
    data_lancamento AS data_emissao,
    make_date(competencia_ano, competencia_mes, 1) AS data_competencia,
    data_pagamento,
    data_vencimento,
    valor AS valor_bruto,
    0 AS juros_multa,
    0 AS descontos,
    0 AS iss,
    0 AS pis,
    0 AS cofins,
    0 AS irrf,
    0 AS csll,
    valor AS total,
    categoria_gerencial_id,
    subcategoria_gerencial_id,
    categoria_contabil_id,
    subcategoria_contabil_id,
    entra_no_gerencial AS pl_gerencial,
    TRUE AS pl_contabil,
    link_nota_fiscal AS pdf_url,
    link_comprovante AS comprovante_url,
    descricao AS conceito
FROM transacoes_financeiras
WHERE tipo = 'despesa'::tipo_transacao_enum;

-- ----------------------------------------------------------------------------
-- 11.3 View: Movimentos Mensais (uniao receitas + despesas para P&L)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_movimentos_mensais AS
SELECT
    'RECEITA'::TEXT AS natureza,
    e.empresa_id, e.cliente_id, e.projeto_id, e.produto_servico_id,
    date_trunc('month', COALESCE(e.data_competencia, e.data_emissao)::TIMESTAMP)::DATE AS dt_mes,
    EXTRACT(YEAR FROM COALESCE(e.data_competencia, e.data_emissao))::INTEGER AS ano,
    EXTRACT(MONTH FROM COALESCE(e.data_competencia, e.data_emissao))::INTEGER AS mes,
    e.valor_liquido AS valor,
    e.categoria_gerencial_id, e.subcategoria_gerencial_id,
    NULL::INTEGER AS tipo_gerencial_id,
    e.categoria_contabil_id, e.subcategoria_contabil_id,
    e.pl_contabil, e.pl_gerencial
FROM entradas_financeiras e
UNION ALL
SELECT
    'DESPESA'::TEXT AS natureza,
    s.empresa_id, NULL::INTEGER AS cliente_id, NULL::INTEGER AS projeto_id, NULL::INTEGER AS produto_servico_id,
    date_trunc('month', COALESCE(s.data_competencia, s.data_emissao)::TIMESTAMP)::DATE AS dt_mes,
    EXTRACT(YEAR FROM COALESCE(s.data_competencia, s.data_emissao))::INTEGER AS ano,
    EXTRACT(MONTH FROM COALESCE(s.data_competencia, s.data_emissao))::INTEGER AS mes,
    (-1)::NUMERIC * s.total AS valor,
    s.categoria_gerencial_id, s.subcategoria_gerencial_id,
    NULL::INTEGER AS tipo_gerencial_id,
    s.categoria_contabil_id, s.subcategoria_contabil_id,
    s.pl_contabil, s.pl_gerencial
FROM saidas_financeiras s;

-- ----------------------------------------------------------------------------
-- 11.4 View: P&L Normalizado (aplica regras do pl_map)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_pl_norm AS
SELECT
    m.ano, m.mes,
    COALESCE(pm.section,
        CASE WHEN m.natureza = 'RECEITA' THEN 'RECEITAS' ELSE 'DESPESAS' END
    ) AS section,
    COALESCE(pm.label, 'Diversos') AS label,
    SUM(COALESCE(pm.sign::INTEGER, 1)::NUMERIC * m.valor)::NUMERIC(14,2) AS valor
FROM vw_movimentos_mensais m
LEFT JOIN pl_map pm ON (
    (pm.cliente_id IS NULL OR pm.cliente_id = m.cliente_id)
    AND (pm.produto_servico_id IS NULL OR pm.produto_servico_id = m.produto_servico_id)
    AND (pm.categoria_gerencial_id IS NULL OR pm.categoria_gerencial_id = m.categoria_gerencial_id)
    AND (pm.subcategoria_gerencial_id IS NULL OR pm.subcategoria_gerencial_id = m.subcategoria_gerencial_id)
    AND (pm.categoria_contabil_id IS NULL OR pm.categoria_contabil_id = m.categoria_contabil_id)
)
GROUP BY m.ano, m.mes,
    COALESCE(pm.section, CASE WHEN m.natureza = 'RECEITA' THEN 'RECEITAS' ELSE 'DESPESAS' END),
    COALESCE(pm.label, 'Diversos');

-- ----------------------------------------------------------------------------
-- 11.5 View: P&L Consolidado
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_pl_consolidado AS
SELECT
    ano, mes, section, label,
    SUM(valor)::NUMERIC(14,2) AS valor
FROM vw_pl_norm
GROUP BY ano, mes, section, label;

-- ----------------------------------------------------------------------------
-- 11.6 View: P&L Consolidado por Cliente
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_pl_consolidado_cliente AS
SELECT
    p.ano, p.mes, p.section, p.label,
    c.id AS cliente_id,
    p.valor AS valor_realizado
FROM vw_pl_consolidado p
LEFT JOIN pl_map pm ON pm.section = p.section AND pm.label = p.label
LEFT JOIN clientes c ON c.id = pm.cliente_id
WHERE p.valor <> 0;

-- ----------------------------------------------------------------------------
-- 11.7 View: Contas a Pagar
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_payables AS
SELECT
    id, empresa_id, fornecedor_id, centro_custo_id, conta_id,
    data_emissao, data_competencia, data_vencimento, data_pagamento,
    valor_bruto, juros_multa, descontos, iss, irrf, pis, cofins, csll,
    (valor_bruto + COALESCE(juros_multa, 0)::NUMERIC - COALESCE(descontos, 0)::NUMERIC)::NUMERIC(14,2) AS total_calc,
    pdf_url, comprovante_url, conceito
FROM saidas_financeiras s;

-- ----------------------------------------------------------------------------
-- 11.8 View: Movimento Realizado
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_movimento_realizado AS
SELECT
    tf.id, tf.empresa_id,
    e.nome_fantasia AS empresa_nome,
    NULL::INTEGER AS versao_id,
    CASE
        WHEN tf.tipo = 'receita'::tipo_transacao_enum THEN 'receita'
        WHEN tf.tipo = 'despesa'::tipo_transacao_enum THEN 'despesa'
        WHEN tf.tipo = 'transferencia'::tipo_transacao_enum THEN 'transferencia'
        WHEN tf.tipo = 'ajuste'::tipo_transacao_enum THEN 'ajuste'
        ELSE 'outros'
    END AS natureza,
    tf.competencia_ano, tf.competencia_mes,
    tf.categoria_contabil_id, tf.subcategoria_contabil_id,
    tf.categoria_gerencial_id, tf.subcategoria_gerencial_id,
    tf.centro_custo_id, tf.conta_contabil_id,
    tf.cliente_id, tf.projeto_id, tf.produto_servico_id,
    tf.valor, tf.moeda,
    tf.data_vencimento AS data_vencimento_prev,
    NULL::DATE AS data_recebimento_prev,
    tf.data_pagamento AS data_pagamento_prev,
    tf.data_lancamento AS data_lancamento_real,
    tf.data_pagamento AS data_pagamento_real,
    tf.fornecedor_id, tf.forma_pgto,
    CASE
        WHEN tf.status = 'pago'::status_enum THEN 'pago'
        WHEN tf.status = 'pendente'::status_enum THEN 'pendente'
        WHEN tf.status = 'cancelado'::status_enum THEN 'cancelado'
        ELSE 'outros'
    END AS status_unificado,
    tf.entra_no_gerencial,
    tf.parent_id, tf.tipo_filho, tf.descricao,
    'realizado'::TEXT AS origem
FROM transacoes_financeiras tf
LEFT JOIN empresas e ON e.id = tf.empresa_id;

-- ----------------------------------------------------------------------------
-- 11.9 View: Movimento Planejado
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_movimento_planejado AS
SELECT
    lo.id, lo.empresa_id,
    e.nome_fantasia AS empresa_nome,
    lo.versao_id,
    CASE
        WHEN lo.categoria = 'receita'::categoria_linha_enum THEN 'receita'
        WHEN lo.categoria = 'despesa'::categoria_linha_enum THEN 'despesa'
        WHEN lo.categoria = 'investimento'::categoria_linha_enum THEN 'investimento'
        ELSE 'outros'
    END AS natureza,
    lo.ano AS competencia_ano, lo.mes AS competencia_mes,
    lo.categoria_contabil_id, lo.subcategoria_contabil_id,
    lo.categoria_gerencial_id, lo.subcategoria_gerencial_id,
    lo.centro_custo_id, lo.conta_contabil_id,
    lo.cliente_id, lo.projeto_id, lo.produto_servico_id,
    lo.valor_previsto AS valor, lo.moeda,
    lo.data_vencimento_prevista AS data_vencimento_prev,
    lo.data_recebimento_prevista AS data_recebimento_prev,
    lo.data_pagamento_prevista AS data_pagamento_prev,
    NULL::DATE AS data_lancamento_real,
    NULL::DATE AS data_pagamento_real,
    NULL::INTEGER AS fornecedor_id,
    NULL::VARCHAR AS forma_pgto,
    CASE WHEN lo.quitado = TRUE THEN 'pago' ELSE 'pendente' END AS status_unificado,
    TRUE AS entra_no_gerencial,
    lo.parent_id, lo.tipo_filho, lo.descricao,
    'planejado'::TEXT AS origem
FROM linhas_orcamentarias lo
LEFT JOIN empresas e ON e.id = lo.empresa_id;

-- ----------------------------------------------------------------------------
-- 11.10 View: Movimentos Unificados (realizado + planejado)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_movimentos_unificados AS
SELECT
    id, empresa_id, empresa_nome, versao_id, natureza,
    competencia_ano, competencia_mes,
    categoria_contabil_id, subcategoria_contabil_id,
    categoria_gerencial_id, subcategoria_gerencial_id,
    centro_custo_id, conta_contabil_id,
    cliente_id, projeto_id, produto_servico_id,
    valor, moeda,
    data_vencimento_prev, data_recebimento_prev, data_pagamento_prev,
    data_lancamento_real, data_pagamento_real,
    fornecedor_id, forma_pgto::VARCHAR AS forma_pgto,
    status_unificado, entra_no_gerencial,
    parent_id, tipo_filho, descricao, origem
FROM vw_movimento_realizado
UNION ALL
SELECT
    id, empresa_id, empresa_nome, versao_id, natureza,
    competencia_ano, competencia_mes,
    categoria_contabil_id, subcategoria_contabil_id,
    categoria_gerencial_id, subcategoria_gerencial_id,
    centro_custo_id, conta_contabil_id,
    cliente_id, projeto_id, produto_servico_id,
    valor, moeda,
    data_vencimento_prev, data_recebimento_prev, data_pagamento_prev,
    data_lancamento_real, data_pagamento_real,
    fornecedor_id, forma_pgto,
    status_unificado, entra_no_gerencial,
    parent_id, tipo_filho, descricao, origem
FROM vw_movimento_planejado;


-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
-- Total: 17 tipos enumerados, 35+ tabelas, 10 views, 25+ indices
-- Compativel com PostgreSQL 15.x ou superior
-- ============================================================================
