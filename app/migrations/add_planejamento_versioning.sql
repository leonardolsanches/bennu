-- Migração: Sistema de Versionamento de Planejamento
-- Adiciona campos de status, renomeia forecast para revisao, torna empresa opcional

-- 1. Criar enum de status se não existir
DO $$ BEGIN
    CREATE TYPE status_planejamento_enum AS ENUM ('rascunho', 'publicado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Adicionar novos campos em planejamento_versoes
ALTER TABLE planejamento_versoes
    ADD COLUMN IF NOT EXISTS indice_revisao INTEGER,
    ADD COLUMN IF NOT EXISTS status status_planejamento_enum DEFAULT 'rascunho',
    ADD COLUMN IF NOT EXISTS data_publicacao TIMESTAMP,
    ADD COLUMN IF NOT EXISTS publicado_por INTEGER;

-- 3. Tornar empresa_id opcional
ALTER TABLE planejamento_versoes ALTER COLUMN empresa_id DROP NOT NULL;
ALTER TABLE linhas_orcamentarias ALTER COLUMN empresa_id DROP NOT NULL;

-- 4. Remover fornecedor_id de linhas_orcamentarias (se existir)
ALTER TABLE linhas_orcamentarias DROP COLUMN IF EXISTS fornecedor_id;

-- 5. Atualizar versões existentes para status publicado
UPDATE planejamento_versoes SET status = 'publicado' WHERE is_ativo = true AND status IS NULL;
UPDATE planejamento_versoes SET status = 'rascunho' WHERE status IS NULL;

-- 6. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_planejamento_versoes_status ON planejamento_versoes(status);
CREATE INDEX IF NOT EXISTS idx_planejamento_versoes_tipo_ano ON planejamento_versoes(tipo, ano_referencia);

COMMIT;
