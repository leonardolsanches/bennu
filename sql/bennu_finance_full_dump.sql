oria_gerencial_id,
    subcategoria_gerencial_id,
    categoria_contabil_id,
    subcategoria_contabil_id,
    entra_no_gerencial AS pl_gerencial,
    true AS pl_contabil,
    link_nota_fiscal AS pdf_url,
    link_comprovante AS comprovante_url,
    descricao AS conceito
   FROM transacoes_financeiras
  WHERE (tipo = 'despesa'::tipo_transacao_enum);

CREATE OR REPLACE VIEW vw_movimento_planejado AS  SELECT lo.id,
    lo.empresa_id,
    e.nome_fantasia AS empresa_nome,
    lo.versao_id,
        CASE
            WHEN (lo.categoria = 'receita'::categoria_linha_enum) THEN 'receita'::text
            WHEN (lo.categoria = 'despesa'::categoria_linha_enum) THEN 'despesa'::text
            WHEN (lo.categoria = 'investimento'::categoria_linha_enum) THEN 'investimento'::text
            ELSE 'outros'::text
        END AS natureza,
    lo.ano AS competencia_ano,
    lo.mes AS competencia_mes,
    lo.categoria_contabil_id,
    lo.subcategoria_contabil_id,
    lo.categoria_gerencial_id,
    lo.subcategoria_gerencial_id,
    lo.centro_custo_id,
    lo.conta_contabil_id,
    lo.cliente_id,
    lo.projeto_id,
    lo.produto_servico_id,
    lo.valor_previsto AS valor,
    lo.moeda,
    lo.data_vencimento_prevista AS data_vencimento_prev,
    lo.data_recebimento_prevista AS data_recebimento_prev,
    lo.data_pagamento_prevista AS data_pagamento_prev,
    NULL::date AS data_lancamento_real,
    NULL::date AS data_pagamento_real,
    NULL::integer AS fornecedor_id,
    NULL::character varying AS forma_pgto,
        CASE
            WHEN (lo.quitado = true) THEN 'pago'::text
            ELSE 'pendente'::text
        END AS status_unificado,
    true AS entra_no_gerencial,
    lo.parent_id,
    lo.tipo_filho,
    lo.descricao,
    'planejado'::text AS origem
   FROM (linhas_orcamentarias lo
     LEFT JOIN empresas e ON ((e.id = lo.empresa_id)));

CREATE OR REPLACE VIEW vw_movimento_realizado AS  SELECT tf.id,
    tf.empresa_id,
    e.nome_fantasia AS empresa_nome,
    NULL::integer AS versao_id,
        CASE
            WHEN (tf.tipo = 'receita'::tipo_transacao_enum) THEN 'receita'::text
            WHEN (tf.tipo = 'despesa'::tipo_transacao_enum) THEN 'despesa'::text
            WHEN (tf.tipo = 'transferencia'::tipo_transacao_enum) THEN 'transferencia'::text
            WHEN (tf.tipo = 'ajuste'::tipo_transacao_enum) THEN 'ajuste'::text
            ELSE 'outros'::text
        END AS natureza,
    tf.competencia_ano,
    tf.competencia_mes,
    tf.categoria_contabil_id,
    tf.subcategoria_contabil_id,
    tf.categoria_gerencial_id,
    tf.subcategoria_gerencial_id,
    tf.centro_custo_id,
    tf.conta_contabil_id,
    tf.cliente_id,
    tf.projeto_id,
    tf.produto_servico_id,
    tf.valor,
    tf.moeda,
    tf.data_vencimento AS data_vencimento_prev,
    NULL::date AS data_recebimento_prev,
    tf.data_pagamento AS data_pagamento_prev,
    tf.data_lancamento AS data_lancamento_real,
    tf.data_pagamento AS data_pagamento_real,
    tf.fornecedor_id,
    tf.forma_pgto,
        CASE
            WHEN (tf.status = 'pago'::status_enum) THEN 'pago'::text
            WHEN (tf.status = 'pendente'::status_enum) THEN 'pendente'::text
            WHEN (tf.status = 'cancelado'::status_enum) THEN 'cancelado'::text
            ELSE 'outros'::text
        END AS status_unificado,
    tf.entra_no_gerencial,
    tf.parent_id,
    tf.tipo_filho,
    tf.descricao,
    'realizado'::text AS origem
   FROM (transacoes_financeiras tf
     LEFT JOIN empresas e ON ((e.id = tf.empresa_id)));

CREATE OR REPLACE VIEW vw_movimentos_mensais AS  SELECT 'RECEITA'::text AS natureza,
    e.empresa_id,
    e.cliente_id,
    e.projeto_id,
    e.produto_servico_id,
    (date_trunc('month'::text, (COALESCE(e.data_competencia, e.data_emissao))::timestamp with time zone))::date AS dt_mes,
    (EXTRACT(year FROM COALESCE(e.data_competencia, e.data_emissao)))::integer AS ano,
    (EXTRACT(month FROM COALESCE(e.data_competencia, e.data_emissao)))::integer AS mes,
    e.valor_liquido AS valor,
    e.categoria_gerencial_id,
    e.subcategoria_gerencial_id,
    NULL::integer AS tipo_gerencial_id,
    e.categoria_contabil_id,
    e.subcategoria_contabil_id,
    e.pl_contabil,
    e.pl_gerencial
   FROM entradas_financeiras e
UNION ALL
 SELECT 'DESPESA'::text AS natureza,
    s.empresa_id,
    NULL::integer AS cliente_id,
    NULL::integer AS projeto_id,
    NULL::integer AS produto_servico_id,
    (date_trunc('month'::text, (COALESCE(s.data_competencia, s.data_emissao))::timestamp with time zone))::date AS dt_mes,
    (EXTRACT(year FROM COALESCE(s.data_competencia, s.data_emissao)))::integer AS ano,
    (EXTRACT(month FROM COALESCE(s.data_competencia, s.data_emissao)))::integer AS mes,
    (('-1'::integer)::numeric * s.total) AS valor,
    s.categoria_gerencial_id,
    s.subcategoria_gerencial_id,
    NULL::integer AS tipo_gerencial_id,
    s.categoria_contabil_id,
    s.subcategoria_contabil_id,
    s.pl_contabil,
    s.pl_gerencial
   FROM saidas_financeiras s;

CREATE OR REPLACE VIEW vw_movimentos_unificados AS  SELECT vw_movimento_realizado.id,
    vw_movimento_realizado.empresa_id,
    vw_movimento_realizado.empresa_nome,
    vw_movimento_realizado.versao_id,
    vw_movimento_realizado.natureza,
    vw_movimento_realizado.competencia_ano,
    vw_movimento_realizado.competencia_mes,
    vw_movimento_realizado.categoria_contabil_id,
    vw_movimento_realizado.subcategoria_contabil_id,
    vw_movimento_realizado.categoria_gerencial_id,
    vw_movimento_realizado.subcategoria_gerencial_id,
    vw_movimento_realizado.centro_custo_id,
    vw_movimento_realizado.conta_contabil_id,
    vw_movimento_realizado.cliente_id,
    vw_movimento_realizado.projeto_id,
    vw_movimento_realizado.produto_servico_id,
    vw_movimento_realizado.valor,
    vw_movimento_realizado.moeda,
    vw_movimento_realizado.data_vencimento_prev,
    vw_movimento_realizado.data_recebimento_prev,
    vw_movimento_realizado.data_pagamento_prev,
    vw_movimento_realizado.data_lancamento_real,
    vw_movimento_realizado.data_pagamento_real,
    vw_movimento_realizado.fornecedor_id,
    (vw_movimento_realizado.forma_pgto)::character varying AS forma_pgto,
    vw_movimento_realizado.status_unificado,
    vw_movimento_realizado.entra_no_gerencial,
    vw_movimento_realizado.parent_id,
    vw_movimento_realizado.tipo_filho,
    vw_movimento_realizado.descricao,
    vw_movimento_realizado.origem
   FROM vw_movimento_realizado
UNION ALL
 SELECT vw_movimento_planejado.id,
    vw_movimento_planejado.empresa_id,
    vw_movimento_planejado.empresa_nome,
    vw_movimento_planejado.versao_id,
    vw_movimento_planejado.natureza,
    vw_movimento_planejado.competencia_ano,
    vw_movimento_planejado.competencia_mes,
    vw_movimento_planejado.categoria_contabil_id,
    vw_movimento_planejado.subcategoria_contabil_id,
    vw_movimento_planejado.categoria_gerencial_id,
    vw_movimento_planejado.subcategoria_gerencial_id,
    vw_movimento_planejado.centro_custo_id,
    vw_movimento_planejado.conta_contabil_id,
    vw_movimento_planejado.cliente_id,
    vw_movimento_planejado.projeto_id,
    vw_movimento_planejado.produto_servico_id,
    vw_movimento_planejado.valor,
    vw_movimento_planejado.moeda,
    vw_movimento_planejado.data_vencimento_prev,
    vw_movimento_planejado.data_recebimento_prev,
    vw_movimento_planejado.data_pagamento_prev,
    vw_movimento_planejado.data_lancamento_real,
    vw_movimento_planejado.data_pagamento_real,
    vw_movimento_planejado.fornecedor_id,
    vw_movimento_planejado.forma_pgto,
    vw_movimento_planejado.status_unificado,
    vw_movimento_planejado.entra_no_gerencial,
    vw_movimento_planejado.parent_id,
    vw_movimento_planejado.tipo_filho,
    vw_movimento_planejado.descricao,
    vw_movimento_planejado.origem
   FROM vw_movimento_planejado;

CREATE OR REPLACE VIEW vw_payables AS  SELECT id,
    empresa_id,
    fornecedor_id,
    centro_custo_id,
    conta_id,
    data_emissao,
    data_competencia,
    data_vencimento,
    data_pagamento,
    valor_bruto,
    juros_multa,
    descontos,
    iss,
    irrf,
    pis,
    cofins,
    csll,
    (((valor_bruto + (COALESCE(juros_multa, 0))::numeric) - (COALESCE(descontos, 0))::numeric))::numeric(14,2) AS total_calc,
    pdf_url,
    comprovante_url,
    conceito
   FROM saidas_financeiras s;

CREATE OR REPLACE VIEW vw_pl_norm AS  SELECT m.ano,
    m.mes,
    COALESCE(pm.section,
        CASE
            WHEN (m.natureza = 'RECEITA'::text) THEN 'RECEITAS'::text
            ELSE 'DESPESAS'::text
        END) AS section,
    COALESCE(pm.label, 'Diversos'::text) AS label,
    (sum(((COALESCE((pm.sign)::integer, 1))::numeric * m.valor)))::numeric(14,2) AS valor
   FROM (vw_movimentos_mensais m
     LEFT JOIN pl_map pm ON ((((pm.cliente_id IS NULL) OR (pm.cliente_id = m.cliente_id)) AND ((pm.produto_servico_id IS NULL) OR (pm.produto_servico_id = m.produto_servico_id)) AND ((pm.categoria_gerencial_id IS NULL) OR (pm.categoria_gerencial_id = m.categoria_gerencial_id)) AND ((pm.subcategoria_gerencial_id IS NULL) OR (pm.subcategoria_gerencial_id = m.subcategoria_gerencial_id)) AND ((pm.categoria_contabil_id IS NULL) OR (pm.categoria_contabil_id = m.categoria_contabil_id)))))
  GROUP BY m.ano, m.mes, COALESCE(pm.section,
        CASE
            WHEN (m.natureza = 'RECEITA'::text) THEN 'RECEITAS'::text
            ELSE 'DESPESAS'::text
        END), COALESCE(pm.label, 'Diversos'::text);

CREATE OR REPLACE VIEW vw_pl_consolidado AS  SELECT ano,
    mes,
    section,
    label,
    (sum(valor))::numeric(14,2) AS valor
   FROM vw_pl_norm
  GROUP BY ano, mes, section, label;

CREATE OR REPLACE VIEW vw_pl_consolidado_cliente AS  SELECT p.ano,
    p.mes,
    p.section,
    p.label,
    c.id AS cliente_id,
    p.valor AS valor_realizado
   FROM ((vw_pl_consolidado p
     LEFT JOIN pl_map pm ON (((pm.section = p.section) AND (pm.label = p.label))))
     LEFT JOIN clientes c ON ((c.id = pm.cliente_id)))
  WHERE (p.valor <> (0)::numeric);

-- End of script