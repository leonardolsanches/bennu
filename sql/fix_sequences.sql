-- ============================================================================
-- BENNU FINANCE — Correção de Sequences (fix_sequences.sql)
-- ============================================================================
-- Finalidade: Sincronizar todas as sequences de ID com o MAX(id) real de cada
--             tabela. Execute APÓS importar um backup para evitar
--             UniqueViolation ao inserir novos registros.
--
-- Como usar (via psql):
--   psql -h <HOST> -U <USUARIO> -d <BANCO> -f fix_sequences.sql
--
-- Como usar no pgAdmin / DBeaver / RDS Query Editor:
--   Copie e cole este script inteiro e execute.
--
-- Seguro para executar mesmo com o sistema em uso (sem locks, sem deletes).
-- ============================================================================

DO $$
DECLARE
    v_max   BIGINT;
    v_seq   TEXT;
BEGIN

    -- ── 1. candidates ────────────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM candidates;
    PERFORM setval('public.candidates_id_seq', GREATEST(v_max, 1), true);

    -- ── 2. cartao_usuarios ───────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM cartao_usuarios;
    PERFORM setval('public.cartao_usuarios_id_seq', GREATEST(v_max, 1), true);

    -- ── 3. cartoes_credito ───────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM cartoes_credito;
    PERFORM setval('public.cartoes_credito_id_seq', GREATEST(v_max, 1), true);

    -- ── 4. categorias_contabeis ──────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM categorias_contabeis;
    PERFORM setval('public.categorias_contabeis_id_seq', GREATEST(v_max, 1), true);

    -- ── 5. categorias_gerenciais ─────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM categorias_gerenciais;
    PERFORM setval('public.categorias_gerenciais_id_seq', GREATEST(v_max, 1), true);

    -- ── 6. centros_custo ─────────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM centros_custo;
    PERFORM setval('public.centros_custo_id_seq', GREATEST(v_max, 1), true);

    -- ── 7. clientes ──────────────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM clientes;
    PERFORM setval('public.clientes_id_seq', GREATEST(v_max, 1), true);

    -- ── 8. contas_bancarias ──────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM contas_bancarias;
    PERFORM setval('public.contas_bancarias_id_seq', GREATEST(v_max, 1), true);

    -- ── 9. contas_contabeis ──────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM contas_contabeis;
    PERFORM setval('public.contas_contabeis_id_seq', GREATEST(v_max, 1), true);

    -- ── 10. contatos_clientes ────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM contatos_clientes;
    PERFORM setval('public.contatos_clientes_id_seq', GREATEST(v_max, 1), true);

    -- ── 11. contatos_fornecedores ────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM contatos_fornecedores;
    PERFORM setval('public.contatos_fornecedores_id_seq', GREATEST(v_max, 1), true);

    -- ── 12. desmembramentos_itens ────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM desmembramentos_itens;
    PERFORM setval('public.desmembramentos_itens_id_seq', GREATEST(v_max, 1), true);

    -- ── 13. desmembramentos_transacoes ───────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM desmembramentos_transacoes;
    PERFORM setval('public.desmembramentos_transacoes_id_seq', GREATEST(v_max, 1), true);

    -- ── 14. empresa_cnpjs ────────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM empresa_cnpjs;
    PERFORM setval('public.empresa_cnpjs_id_seq', GREATEST(v_max, 1), true);

    -- ── 15. empresas ─────────────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM empresas;
    PERFORM setval('public.empresas_id_seq', GREATEST(v_max, 1), true);

    -- ── 16. faturas_cartao ───────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM faturas_cartao;
    PERFORM setval('public.faturas_cartao_id_seq', GREATEST(v_max, 1), true);

    -- ── 17. fornecedores ─────────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM fornecedores;
    PERFORM setval('public.fornecedores_id_seq', GREATEST(v_max, 1), true);

    -- ── 18. impostos ─────────────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM impostos;
    PERFORM setval('public.impostos_id_seq', GREATEST(v_max, 1), true);

    -- ── 19. linhaorc_impostos ────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM linhaorc_impostos;
    PERFORM setval('public.linhaorc_impostos_id_seq', GREATEST(v_max, 1), true);

    -- ── 20. linhaorc_impostos_detalhes ───────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM linhaorc_impostos_detalhes;
    PERFORM setval('public.linhaorc_impostos_detalhes_id_seq', GREATEST(v_max, 1), true);

    -- ── 21. linhaorc_mensalizacao ────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM linhaorc_mensalizacao;
    PERFORM setval('public.linhaorc_mensalizacao_id_seq', GREATEST(v_max, 1), true);

    -- ── 22. linhas_orcamentarias ─────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM linhas_orcamentarias;
    PERFORM setval('public.linhas_orcamentarias_id_seq', GREATEST(v_max, 1), true);

    -- ── 23. logs_acesso ──────────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM logs_acesso;
    PERFORM setval('public.logs_acesso_id_seq', GREATEST(v_max, 1), true);

    -- ── 24. logs_acoes ───────────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM logs_acoes;
    PERFORM setval('public.logs_acoes_id_seq', GREATEST(v_max, 1), true);

    -- ── 25. metricas_uso ─────────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM metricas_uso;
    PERFORM setval('public.metricas_uso_id_seq', GREATEST(v_max, 1), true);

    -- ── 26. pl_map ───────────────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM pl_map;
    PERFORM setval('public.pl_map_id_seq', GREATEST(v_max, 1), true);

    -- ── 27. planejamento_versoes ─────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM planejamento_versoes;
    PERFORM setval('public.planejamento_versoes_id_seq', GREATEST(v_max, 1), true);

    -- ── 28. produto_servico_clientes ─────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM produto_servico_clientes;
    PERFORM setval('public.produto_servico_clientes_id_seq', GREATEST(v_max, 1), true);

    -- ── 29. produtos_servicos ────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM produtos_servicos;
    PERFORM setval('public.produtos_servicos_id_seq', GREATEST(v_max, 1), true);

    -- ── 30. projecoes_pl ─────────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM projecoes_pl;
    PERFORM setval('public.projecoes_pl_id_seq', GREATEST(v_max, 1), true);

    -- ── 31. projeto_classificacoes ───────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM projeto_classificacoes;
    PERFORM setval('public.projeto_classificacoes_id_seq', GREATEST(v_max, 1), true);

    -- ── 32. projeto_clientes ─────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM projeto_clientes;
    PERFORM setval('public.projeto_clientes_id_seq', GREATEST(v_max, 1), true);

    -- ── 33. projetos ─────────────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM projetos;
    PERFORM setval('public.projetos_id_seq', GREATEST(v_max, 1), true);

    -- ── 34. regras_impostos ──────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM regras_impostos;
    PERFORM setval('public.regras_impostos_id_seq', GREATEST(v_max, 1), true);

    -- ── 35. regras_impostos_itens ────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM regras_impostos_itens;
    PERFORM setval('public.regras_impostos_itens_id_seq', GREATEST(v_max, 1), true);

    -- ── 36. sessoes_usuario ──────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM sessoes_usuario;
    PERFORM setval('public.sessoes_usuario_id_seq', GREATEST(v_max, 1), true);

    -- ── 37. transacao_impostos ───────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM transacao_impostos;
    PERFORM setval('public.transacao_impostos_id_seq', GREATEST(v_max, 1), true);

    -- ── 38. transacao_impostos_detalhes ──────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM transacao_impostos_detalhes;
    PERFORM setval('public.transacao_impostos_detalhes_id_seq', GREATEST(v_max, 1), true);

    -- ── 39. transacao_mensalizacao ───────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM transacao_mensalizacao;
    PERFORM setval('public.transacao_mensalizacao_id_seq', GREATEST(v_max, 1), true);

    -- ── 40. transacoes_cartao ────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM transacoes_cartao;
    PERFORM setval('public.transacoes_cartao_id_seq', GREATEST(v_max, 1), true);

    -- ── 41. transacoes_financeiras ───────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM transacoes_financeiras;
    PERFORM setval('public.transacoes_financeiras_id_seq', GREATEST(v_max, 1), true);

    -- ── 42. users ────────────────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM users;
    PERFORM setval('public.users_id_seq', GREATEST(v_max, 1), true);

    -- ── 43. voters ───────────────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM voters;
    PERFORM setval('public.voters_id_seq', GREATEST(v_max, 1), true);

    -- ── 44. votes ────────────────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM votes;
    PERFORM setval('public.votes_id_seq', GREATEST(v_max, 1), true);

    -- ── 45. voting_history ───────────────────────────────────────────────────
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM voting_history;
    PERFORM setval('public.voting_history_id_seq', GREATEST(v_max, 1), true);

    RAISE NOTICE '✅ Todas as sequences foram sincronizadas com sucesso.';

END $$;

-- ============================================================================
-- Verificação pós-execução: exibe o estado atual de cada sequence
-- Execute esta query separadamente para confirmar que ficou correto.
-- ============================================================================
SELECT
    t.relname          AS tabela,
    s.relname          AS sequence,
    seq.last_value     AS proximo_menos_1
FROM   pg_class s
JOIN   pg_depend  d   ON d.objid    = s.oid
JOIN   pg_class   t   ON t.oid      = d.refobjid
JOIN   pg_sequence seq ON seq.seqrelid = s.oid
WHERE  s.relkind = 'S'
  AND  t.relkind = 'r'
  AND  d.deptype = 'a'
ORDER  BY t.relname;
