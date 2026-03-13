-- Migração: Permitir empresa_id NULL em tabelas mestres/auxiliares compartilhadas
-- Data: 2025-11-09
-- Objetivo: Permitir que categorias, produtos, clientes, fornecedores, etc sejam compartilhados entre empresas

-- 1. TABELAS DE CATEGORIZAÇÃO
ALTER TABLE categorias_contabeis 
ALTER COLUMN empresa_id DROP NOT NULL;

ALTER TABLE categorias_gerenciais 
ALTER COLUMN empresa_id DROP NOT NULL;

ALTER TABLE centros_custo 
ALTER COLUMN empresa_id DROP NOT NULL;

-- 2. TABELAS DE CADASTROS AUXILIARES
ALTER TABLE produtos_servicos 
ALTER COLUMN empresa_id DROP NOT NULL;

ALTER TABLE contas_contabeis 
ALTER COLUMN empresa_id DROP NOT NULL;

ALTER TABLE contas_bancarias 
ALTER COLUMN empresa_id DROP NOT NULL;

ALTER TABLE cartoes_credito 
ALTER COLUMN empresa_id DROP NOT NULL;

-- 3. TABELAS DE RELACIONAMENTO (CLIENTES/FORNECEDORES/PROJETOS)
ALTER TABLE clientes 
ALTER COLUMN empresa_id DROP NOT NULL;

ALTER TABLE fornecedores 
ALTER COLUMN empresa_id DROP NOT NULL;

ALTER TABLE projetos 
ALTER COLUMN empresa_id DROP NOT NULL;

-- NOTA: Tabelas transacionais (transacoes_financeiras, planejamento_versoes, etc) 
-- continuam com empresa_id NOT NULL pois devem ser deletadas junto com a empresa
