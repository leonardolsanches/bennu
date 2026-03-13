-- Migration: Add versao_publicacao_id to linhas_orcamentarias
-- Data: 29/10/2025
-- Descrição: Adiciona campo para rastrear em qual versão cada linha foi publicada/criada

-- Adicionar coluna versao_publicacao_id
ALTER TABLE linhas_orcamentarias 
ADD COLUMN IF NOT EXISTS versao_publicacao_id INTEGER;

-- Adicionar foreign key para planejamento_versoes
ALTER TABLE linhas_orcamentarias
ADD CONSTRAINT fk_linha_versao_publicacao
FOREIGN KEY (versao_publicacao_id) 
REFERENCES planejamento_versoes(id) 
ON DELETE CASCADE;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_linhas_versao_publicacao 
ON linhas_orcamentarias(versao_publicacao_id);

-- Atualizar linhas existentes para apontar para sua versão
UPDATE linhas_orcamentarias 
SET versao_publicacao_id = versao_id 
WHERE versao_publicacao_id IS NULL;

-- Comentário na coluna para documentação
COMMENT ON COLUMN linhas_orcamentarias.versao_publicacao_id IS 'ID da versão em que esta linha foi criada/publicada (carimbo de versionamento)';
