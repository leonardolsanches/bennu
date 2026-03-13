-- Migração: Permitir cliente_id NULL em projetos
-- Data: 2025-11-18
-- Motivo: Projetos podem existir sem cliente associado inicialmente
--         e são preservados quando empresa é deletada (empresa_id → NULL)

ALTER TABLE projetos ALTER COLUMN cliente_id DROP NOT NULL;

-- Verificar
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'projetos' AND column_name = 'cliente_id';
