
-- Migration para permitir cliente_id NULL na tabela projetos
-- Data: 2025-01-08

-- Remover constraint NOT NULL de cliente_id se existir
ALTER TABLE projetos 
ALTER COLUMN cliente_id DROP NOT NULL;

-- Comentário explicativo
COMMENT ON COLUMN projetos.cliente_id IS 'ID do cliente (opcional) - pode ser NULL para projetos sem cliente específico';
