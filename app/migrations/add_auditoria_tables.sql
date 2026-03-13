-- Criar tabelas de auditoria para rastreamento de uso do sistema
-- Bennu Finance - Sistema de Auditoria

-- Tabela de logs de acesso (login/logout)
CREATE TABLE IF NOT EXISTS logs_acesso (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255),
    acao VARCHAR(50) NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    sucesso BOOLEAN DEFAULT TRUE,
    mensagem TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de sessões de usuários
CREATE TABLE IF NOT EXISTS sessoes_usuario (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE,
    ip_address VARCHAR(50),
    user_agent TEXT,
    inicio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ultima_atividade TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fim TIMESTAMP WITH TIME ZONE,
    duracao_segundos INTEGER,
    ativa BOOLEAN DEFAULT TRUE,
    paginas_visitadas TEXT
);

-- Tabela de logs de ações (CRUD operations)
CREATE TABLE IF NOT EXISTS logs_acoes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    sessao_id INTEGER REFERENCES sessoes_usuario(id) ON DELETE SET NULL,
    acao VARCHAR(50) NOT NULL,
    entidade VARCHAR(100) NOT NULL,
    entidade_id INTEGER,
    descricao TEXT,
    dados_antes TEXT,
    dados_depois TEXT,
    ip_address VARCHAR(50),
    rota VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de métricas agregadas
CREATE TABLE IF NOT EXISTS metricas_uso (
    id SERIAL PRIMARY KEY,
    data TIMESTAMP WITH TIME ZONE NOT NULL,
    periodo VARCHAR(20) NOT NULL,
    total_acessos INTEGER DEFAULT 0,
    usuarios_unicos INTEGER DEFAULT 0,
    total_acoes INTEGER DEFAULT 0,
    tempo_medio_sessao INTEGER DEFAULT 0,
    pagina_mais_visitada VARCHAR(255),
    acao_mais_comum VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_logs_acesso_user_id ON logs_acesso(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_acesso_created_at ON logs_acesso(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_acesso_acao ON logs_acesso(acao);

CREATE INDEX IF NOT EXISTS idx_sessoes_user_id ON sessoes_usuario(user_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_ativa ON sessoes_usuario(ativa);
CREATE INDEX IF NOT EXISTS idx_sessoes_inicio ON sessoes_usuario(inicio);

CREATE INDEX IF NOT EXISTS idx_logs_acoes_user_id ON logs_acoes(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_acoes_sessao_id ON logs_acoes(sessao_id);
CREATE INDEX IF NOT EXISTS idx_logs_acoes_entidade ON logs_acoes(entidade);
CREATE INDEX IF NOT EXISTS idx_logs_acoes_created_at ON logs_acoes(created_at);

CREATE INDEX IF NOT EXISTS idx_metricas_data ON metricas_uso(data);
CREATE INDEX IF NOT EXISTS idx_metricas_periodo ON metricas_uso(periodo);
