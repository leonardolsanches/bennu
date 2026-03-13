
// P&L Contábil - Demonstração do Resultado com drill-down hierárquico
console.log('📊 Carregando módulo P&L Contábil...');

let dadosPL = {
    receitas: {},
    despesas: {},
    totais: {}
};

// Estado para controlar itens expandidos
let expandedItems = {};

// Variável global para armazenar a estrutura do P&L
let estruturaPL = [];

// Inicialização quando a página carrega
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Inicializando P&L Contábil...');

    // Popular campo de ano com ano corrente + passados + 5 futuros
    const anoAtual = new Date().getFullYear();
    if (window.populateYearSelect) {
        window.populateYearSelect('ano-filter', { includePlaceholder: false });
    }
    document.getElementById('ano-filter').value = anoAtual;
    document.getElementById('periodo-atual').textContent = anoAtual;
});

// Carregar lista de empresas
async function carregarEmpresas() {
    try {
        console.log('📊 Carregando empresas...');
        const response = await fetch('/api/empresas', {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const empresas = await response.json();

        const empresaSelect = document.getElementById('empresa-filter');
        empresaSelect.innerHTML = '<option value="">Todas as Empresas</option>';

        empresas.forEach(empresa => {
            const option = document.createElement('option');
            option.value = empresa.id;
            option.textContent = empresa.nome_fantasia || empresa.razao_social;
            empresaSelect.appendChild(option);
        });

        console.log('✅ Empresas carregadas:', empresas.length);
    } catch (error) {
        console.error('❌ Erro ao carregar empresas:', error);
    }
}

// Carregar lista de clientes
async function carregarClientes() {
    try {
        console.log('📊 Carregando clientes...');
        const response = await fetch('/api/clientes', {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const clientes = await response.json();

        const clienteSelect = document.getElementById('cliente-filter');
        clienteSelect.innerHTML = '<option value="">Todos os Clientes</option>';

        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.id;
            option.textContent = cliente.nome;
            clienteSelect.appendChild(option);
        });

        console.log('✅ Clientes carregados:', clientes.length);
    } catch (error) {
        console.error('❌ Erro ao carregar clientes:', error);
    }
}

// Carregar lista de projetos
async function carregarProjetos() {
    try {
        console.log('📊 Carregando projetos...');
        const response = await fetch('/api/projetos', {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const projetos = await response.json();

        const projetoSelect = document.getElementById('projeto-filter');
        if (!projetoSelect) {
            console.error('❌ Elemento projeto-filter não encontrado no DOM');
            return;
        }

        projetoSelect.innerHTML = '<option value="">Todos os Projetos</option>';

        if (Array.isArray(projetos) && projetos.length > 0) {
            projetos.forEach(projeto => {
                if (projeto && projeto.id && projeto.nome) {
                    const option = document.createElement('option');
                    option.value = projeto.id;
                    option.textContent = projeto.nome;
                    projetoSelect.appendChild(option);
                }
            });
            console.log('✅ Projetos carregados:', projetos.length);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar projetos:', error);
    }
}

// Carregar lista de produtos/serviços
async function carregarProdutosServicos() {
    try {
        console.log('📊 Carregando produtos/serviços...');
        const response = await fetch('/api/produtos-servicos', {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const produtosServicos = await response.json();

        const produtoServicoSelect = document.getElementById('produto-servico-filter');
        produtoServicoSelect.innerHTML = '<option value="">Todos</option>';

        produtosServicos.forEach(ps => {
            const option = document.createElement('option');
            option.value = ps.id;
            option.textContent = ps.nome + (ps.tipo ? ` (${ps.tipo})` : '');
            produtoServicoSelect.appendChild(option);
        });

        console.log('✅ Produtos/Serviços carregados:', produtosServicos.length);
    } catch (error) {
        console.error('❌ Erro ao carregar produtos/serviços:', error);
    }
}

// Carregar lista de fornecedores
async function carregarFornecedores() {
    try {
        console.log('📊 Carregando fornecedores...');
        const response = await fetch('/api/fornecedores', {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const fornecedores = await response.json();

        const fornecedorSelect = document.getElementById('fornecedor-filter');
        if (!fornecedorSelect) {
            console.warn('⚠️ Elemento fornecedor-filter não encontrado no DOM');
            return;
        }
        
        fornecedorSelect.innerHTML = '<option value="">Todos os Fornecedores</option>';

        fornecedores.forEach(f => {
            const option = document.createElement('option');
            option.value = f.id;
            option.textContent = f.nome;
            fornecedorSelect.appendChild(option);
        });

        console.log('✅ Fornecedores carregados:', fornecedores.length);
    } catch (error) {
        console.error('❌ Erro ao carregar fornecedores:', error);
    }
}

// Carregar lista de centros de custo
async function carregarCentrosCusto() {
    try {
        console.log('📊 Carregando centros de custo...');
        const response = await fetch('/api/centros-custo', {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const centrosCusto = await response.json();

        const centroCustoSelect = document.getElementById('centro-custo-filter');
        if (!centroCustoSelect) {
            console.warn('⚠️ Elemento centro-custo-filter não encontrado no DOM');
            return;
        }
        
        centroCustoSelect.innerHTML = '<option value="">Todos os Centros de Custo</option>';

        centrosCusto.forEach(cc => {
            const option = document.createElement('option');
            option.value = cc.id;
            option.textContent = cc.nome;
            centroCustoSelect.appendChild(option);
        });

        console.log('✅ Centros de custo carregados:', centrosCusto.length);
    } catch (error) {
        console.error('❌ Erro ao carregar centros de custo:', error);
    }
}

// Carregar dados do P&L Contábil
async function carregarDadosPL() {
    const tbody = document.getElementById('pl-tbody');
    
    try {
        console.log('📊 Carregando dados do P&L Contábil...');

        // Mostrar loading
        tbody.innerHTML = `
            <tr>
                <td colspan="14" class="text-center py-3">
                    <div class="d-flex align-items-center justify-content-center">
                        <div class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
                        <span class="small">Carregando dados do P&L Contábil...</span>
                    </div>
                </td>
            </tr>
        `;

        const ano = document.getElementById('ano-filter').value;
        const empresa = document.getElementById('empresa-filter').value;
        const fornecedor = document.getElementById('fornecedor-filter')?.value || '';
        const centroCusto = document.getElementById('centro-custo-filter')?.value || '';

        // Atualizar período na interface
        document.getElementById('periodo-atual').textContent = ano;

        // Construir URL com parâmetros
        let url = `/api/relatorios/pl-contabil?ano=${ano}`;
        if (empresa) url += `&empresa=${empresa}`;
        if (fornecedor) url += `&fornecedor=${fornecedor}`;
        if (centroCusto) url += `&centro_custo=${centroCusto}`;

        console.log('🔍 Buscando dados de:', url);

        const response = await fetch(url, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        dadosPL = await response.json();
        console.log('✅ Dados P&L Contábil carregados:', dadosPL);

        // Resetar estado de expansão ao carregar novos dados
        expandedItems = {};

        // Renderizar tabela
        renderizarTabelaPL();

    } catch (error) {
        console.error('❌ Erro ao carregar dados P&L Contábil:', error);
        
        tbody.innerHTML = `
            <tr>
                <td colspan="14" style="text-align: center; padding: 40px; color: #ef4444;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 8px;"></i>
                    <br>Erro ao carregar dados do P&L Contábil
                    <br><small style="color: #6b7280;">${error.message || 'Verifique sua conexão e tente novamente'}</small>
                </td>
            </tr>
        `;
        
        if (typeof showErrorMessage === 'function') {
            showErrorMessage('Erro ao carregar dados do P&L Contábil');
        }
    }
}

// Renderizar tabela do P&L Contábil com hierarquia drill-down
function renderizarTabelaPL() {
    console.log('📊 Renderizando tabela P&L Contábil...');

    const tbody = document.getElementById('pl-tbody');
    let html = '';

    if (!dadosPL || !dadosPL.totais) {
        tbody.innerHTML = `
            <tr>
                <td colspan="14" style="text-align: center; padding: 40px; color: #6b7280;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 8px;"></i>
                    <br>Nenhum dado encontrado para este período
                </td>
            </tr>
        `;
        return;
    }

    // Reinicializar estrutura global
    estruturaPL = [];

    // 1. RECEITAS - Hierarquia: Cliente > Projeto > Produto/Serviço
    let temReceitas = false;
    const receitasItems = [];

    if (dadosPL.receitas && Object.keys(dadosPL.receitas).length > 0) {
        Object.keys(dadosPL.receitas).forEach(clienteKey => {
            const clienteData = dadosPL.receitas[clienteKey];
            
            // Calcular total do cliente
            const valoresCliente = {
                meses: [...(clienteData.meses || Array(12).fill(0))],
                total: clienteData.total || 0
            };

            if (temValorNaoZero(valoresCliente)) {
                temReceitas = true;
                const clienteId = `receita_cliente_${clienteKey.replace(/\s+/g, '_').toLowerCase()}`;

                const clienteItem = {
                    titulo: clienteKey,
                    tipo: 'grupo_receita',
                    nivel: 2,
                    categoria: clienteId,
                    valores: valoresCliente,
                    expansivel: clienteData.projetos && Object.keys(clienteData.projetos).length > 0,
                    filhos: []
                };

                // Nível 2: Projetos do cliente
                if (clienteData.projetos) {
                    Object.keys(clienteData.projetos).forEach(projetoKey => {
                        const projetoData = clienteData.projetos[projetoKey];
                        const valoresProjeto = {
                            meses: [...(projetoData.meses || Array(12).fill(0))],
                            total: projetoData.total || 0
                        };

                        if (temValorNaoZero(valoresProjeto)) {
                            const projetoId = `${clienteId}_projeto_${projetoKey.replace(/\s+/g, '_').toLowerCase()}`;
                            
                            const projetoItem = {
                                titulo: projetoKey,
                                tipo: 'subgrupo_receita',
                                nivel: 3,
                                categoria: projetoId,
                                valores: valoresProjeto,
                                expansivel: projetoData.produtos && Object.keys(projetoData.produtos).length > 0,
                                filhos: [],
                                pai: clienteId
                            };

                            // Nível 3: Produtos/Serviços do projeto
                            if (projetoData.produtos) {
                                Object.keys(projetoData.produtos).forEach(produtoKey => {
                                    const produtoData = projetoData.produtos[produtoKey];
                                    const valoresProduto = {
                                        meses: [...(produtoData.meses || Array(12).fill(0))],
                                        total: produtoData.total || 0
                                    };

                                    if (temValorNaoZero(valoresProduto)) {
                                        projetoItem.filhos.push({
                                            titulo: produtoKey,
                                            tipo: 'item_receita',
                                            nivel: 4,
                                            categoria: `${projetoId}_produto_${produtoKey.replace(/\s+/g, '_').toLowerCase()}`,
                                            valores: valoresProduto,
                                            expansivel: false,
                                            pai: projetoId
                                        });
                                    }
                                });
                            }

                            clienteItem.filhos.push(projetoItem);
                        }
                    });
                }

                receitasItems.push(clienteItem);
            }
        });
    }

    if (temReceitas) {
        estruturaPL.push({ titulo: 'RECEITAS', tipo: 'header', nivel: 0, expansivel: false });
        estruturaPL.push(...receitasItems);
        estruturaPL.push({
            titulo: 'TOTAL RECEITAS',
            tipo: 'subtotal',
            nivel: 0,
            categoria: 'total_receitas',
            valores: {
                meses: [...(dadosPL.totais.receitas_mes || Array(12).fill(0))],
                total: dadosPL.totais.receitas_total || 0
            },
            expansivel: false
        });
    }

    // 2. DESPESAS - Hierarquia: Centro de Custo > Categoria Contábil > Título
    let temDespesas = false;
    const despesasItems = [];

    if (dadosPL.despesas && Object.keys(dadosPL.despesas).length > 0) {
        Object.keys(dadosPL.despesas).forEach(centroCustoKey => {
            const centroCustoData = dadosPL.despesas[centroCustoKey];
            
            const valoresCentroCusto = {
                meses: centroCustoData.meses ? centroCustoData.meses.map(v => -v) : Array(12).fill(0),
                total: -(centroCustoData.total || 0)
            };

            if (temValorNaoZero(valoresCentroCusto)) {
                temDespesas = true;
                const centroCustoId = `despesa_cc_${centroCustoKey.replace(/\s+/g, '_').toLowerCase()}`;

                const centroCustoItem = {
                    titulo: centroCustoKey,
                    tipo: 'grupo_despesa',
                    nivel: 2,
                    categoria: centroCustoId,
                    valores: valoresCentroCusto,
                    expansivel: centroCustoData.categorias && Object.keys(centroCustoData.categorias).length > 0,
                    filhos: []
                };

                // Nível 2: Categorias Contábeis
                if (centroCustoData.categorias) {
                    Object.keys(centroCustoData.categorias).forEach(categoriaKey => {
                        const categoriaData = centroCustoData.categorias[categoriaKey];
                        const valoresCategoria = {
                            meses: categoriaData.meses ? categoriaData.meses.map(v => -v) : Array(12).fill(0),
                            total: -(categoriaData.total || 0)
                        };

                        if (temValorNaoZero(valoresCategoria)) {
                            const categoriaId = `${centroCustoId}_cat_${categoriaKey.replace(/\s+/g, '_').toLowerCase()}`;
                            
                            const categoriaItem = {
                                titulo: categoriaKey,
                                tipo: 'subgrupo_despesa',
                                nivel: 3,
                                categoria: categoriaId,
                                valores: valoresCategoria,
                                expansivel: categoriaData.titulos && Object.keys(categoriaData.titulos).length > 0,
                                filhos: [],
                                pai: centroCustoId
                            };

                            // Nível 3: Títulos
                            if (categoriaData.titulos) {
                                Object.keys(categoriaData.titulos).forEach(tituloKey => {
                                    const tituloData = categoriaData.titulos[tituloKey];
                                    const valoresTitulo = {
                                        meses: tituloData.meses ? tituloData.meses.map(v => -v) : Array(12).fill(0),
                                        total: -(tituloData.total || 0)
                                    };

                                    if (temValorNaoZero(valoresTitulo)) {
                                        categoriaItem.filhos.push({
                                            titulo: tituloKey,
                                            tipo: 'item_despesa',
                                            nivel: 4,
                                            categoria: `${categoriaId}_titulo_${tituloKey.replace(/\s+/g, '_').toLowerCase()}`,
                                            valores: valoresTitulo,
                                            expansivel: false,
                                            pai: categoriaId
                                        });
                                    }
                                });
                            }

                            centroCustoItem.filhos.push(categoriaItem);
                        }
                    });
                }

                despesasItems.push(centroCustoItem);
            }
        });
    }

    if (temDespesas) {
        estruturaPL.push({ titulo: 'DESPESAS', tipo: 'header', nivel: 0, expansivel: false });
        estruturaPL.push(...despesasItems);
        estruturaPL.push({
            titulo: 'TOTAL DESPESAS',
            tipo: 'subtotal',
            nivel: 0,
            categoria: 'total_despesas',
            valores: {
                meses: dadosPL.totais.despesas_mes ? dadosPL.totais.despesas_mes.map(v => -v) : Array(12).fill(0),
                total: -(dadosPL.totais.despesas_total || 0)
            },
            expansivel: false
        });
    }

    // 3. RESULTADO LÍQUIDO
    estruturaPL.push({
        titulo: 'RESULTADO LÍQUIDO',
        tipo: 'resultado',
        nivel: 0,
        categoria: 'resultado_liquido',
        valores: {
            meses: [...(dadosPL.totais.resultado_mes || Array(12).fill(0))],
            total: dadosPL.totais.resultado_total || 0
        },
        expansivel: false
    });

    // Renderizar cada linha
    html = renderizarLinhasComDrillDown(estruturaPL);

    tbody.innerHTML = html;

    // Aplicar largura da primeira coluna após re-render
    setTimeout(() => {
        if (typeof updateFirstColumnWidth === 'function') {
            updateFirstColumnWidth();
        }
    }, 50);

    console.log('✅ Tabela P&L Contábil renderizada');
}

// Função para verificar se tem valores não-zero
function temValorNaoZero(valores) {
    if (!valores) return false;
    if (valores.total && valores.total !== 0) return true;
    if (valores.meses && valores.meses.some(v => v !== 0)) return true;
    return false;
}

// Renderizar linhas com drill-down
function renderizarLinhasComDrillDown(estrutura) {
    let html = '';

    estrutura.forEach(item => {
        const ehCabecalho = ['header', 'subtotal', 'resultado'].includes(item.tipo);

        if (!ehCabecalho && item.valores && !temValorNaoZero(item.valores)) {
            return;
        }

        html += criarLinhaTabelaPL(item, item.valores || { meses: Array(12).fill(0), total: 0 });

        if (item.filhos && item.filhos.length > 0 && expandedItems[item.categoria]) {
            item.filhos.forEach(filho => {
                if (filho.valores && temValorNaoZero(filho.valores)) {
                    html += criarLinhaTabelaPL(filho, filho.valores);
                    
                    // Renderizar netos (títulos) se o filho também estiver expandido
                    if (filho.filhos && filho.filhos.length > 0 && expandedItems[filho.categoria]) {
                        filho.filhos.forEach(neto => {
                            if (neto.valores && temValorNaoZero(neto.valores)) {
                                html += criarLinhaTabelaPL(neto, neto.valores);
                            }
                        });
                    }
                }
            });
        }
    });

    return html;
}

// Toggle expansão de linha
function toggleExpansaoLinha(categoria) {
    expandedItems[categoria] = !expandedItems[categoria];
    renderizarTabelaPL();
}

// Criar linha da tabela P&L
function criarLinhaTabelaPL(item, valores) {
    const corTexto = item.tipo === 'header' ? '#1f2937' : '#374151';

    let classeLinha = '';
    let estiloLinha = `color: ${corTexto};`;
    let iconeHierarquia = '';

    switch (item.tipo) {
        case 'header':
            classeLinha = 'pl-header-row';
            estiloLinha += ' font-weight: 700; background-color: #e0f2fe; color: #0c4a6e; font-size: 13px; border-top: 1px solid #bae6fd; border-bottom: 1px solid #bae6fd;';
            break;
        case 'subtotal':
            classeLinha = 'pl-subtotal-row';
            estiloLinha += ' font-weight: 700; background-color: #f0f9ff; color: #0c4a6e; border-top: 1px solid #bae6fd; border-bottom: 1px solid #bae6fd; font-size: 12px;';
            break;
        case 'resultado':
            classeLinha = 'pl-resultado-row';
            estiloLinha += ' font-weight: 700; background-color: #ddd6fe; color: #4c1d95; border-top: 1px solid #c4b5fd; border-bottom: 1px solid #c4b5fd; font-size: 13px;';
            break;
        case 'grupo_receita':
            classeLinha = 'pl-grupo-row';
            estiloLinha += ' font-weight: 600; background-color: #f8fafc; font-size: 11px;';
            iconeHierarquia = '👤 ';
            if (item.expansivel) {
                estiloLinha += ' cursor: pointer;';
            }
            break;
        case 'grupo_despesa':
            classeLinha = 'pl-grupo-row';
            estiloLinha += ' font-weight: 600; background-color: #f8fafc; font-size: 11px;';
            iconeHierarquia = '📁 ';
            if (item.expansivel) {
                estiloLinha += ' cursor: pointer;';
            }
            break;
        case 'subgrupo_receita':
            classeLinha = 'pl-subgrupo-row';
            estiloLinha += ' font-weight: 500; background-color: #fefefe; font-size: 10px;';
            iconeHierarquia = '&nbsp;&nbsp;📊 ';
            if (item.expansivel) {
                estiloLinha += ' cursor: pointer;';
            }
            break;
        case 'subgrupo_despesa':
            classeLinha = 'pl-subgrupo-row';
            estiloLinha += ' font-weight: 500; background-color: #fefefe; font-size: 10px;';
            iconeHierarquia = '&nbsp;&nbsp;📂 ';
            if (item.expansivel) {
                estiloLinha += ' cursor: pointer;';
            }
            break;
        case 'item_receita':
            classeLinha = 'pl-item-row';
            estiloLinha += ' background-color: white; font-weight: 400; font-size: 9px; color: #6b7280;';
            iconeHierarquia = '&nbsp;&nbsp;&nbsp;&nbsp;• ';
            break;
        case 'item_despesa':
            classeLinha = 'pl-item-row';
            estiloLinha += ' background-color: white; font-weight: 400; font-size: 9px; color: #6b7280;';
            iconeHierarquia = '&nbsp;&nbsp;&nbsp;&nbsp;• ';
            break;
    }

    const nivelIndentacao = Math.max(0, item.nivel - 1);
    const indentacao = '&nbsp;'.repeat(nivelIndentacao * 4);

    let iconeDrillDown = '';
    if (item.expansivel && item.filhos && item.filhos.length > 0) {
        const expandido = expandedItems[item.categoria];
        const icone = expandido ? '−' : '+';
        const corIcone = expandido ? '#dc2626' : '#059669';
        iconeDrillDown = `<span class="expand-icon" onclick="event.stopPropagation(); toggleExpansaoLinha('${item.categoria}');" style="cursor: pointer; color: ${corIcone}; font-weight: bold; margin-right: 6px; user-select: none; display: inline-block; width: 18px; height: 18px; text-align: center; font-size: 14px; background: ${expandido ? '#fee2e2' : '#dcfce7'}; border: 1px solid ${corIcone}; border-radius: 3px; line-height: 16px;">${icone}</span>`;
    } else if (item.tipo.includes('item_')) {
        // Para itens finais (títulos), não mostrar botão mas manter espaço alinhado
        iconeDrillDown = '<span class="expand-icon" style="display: inline-block; width: 18px; margin-right: 6px;"></span>';
    } else {
        iconeDrillDown = '<span class="expand-icon" style="display: inline-block; width: 14px; margin-right: 8px;"></span>';
    }

    const eventoClique = item.expansivel ? `onclick="toggleExpansaoLinha('${item.categoria}');" style="${estiloLinha} cursor: pointer;"` : `style="${estiloLinha}"`;

    let html = `<tr class="${classeLinha}" ${eventoClique}>`;
    html += `<td style="padding: 6px 12px; border-bottom: 1px solid #f1f5f9; position: sticky; left: 0; background: ${item.nivel === 0 ? '#f8f9fa' : 'white'}; z-index: 9; border-right: 2px solid #dee2e6; min-width: ${firstColumnWidth || 300}px; max-width: ${firstColumnWidth || 300}px; width: ${firstColumnWidth || 300}px;">${indentacao}${iconeDrillDown}${iconeHierarquia}${item.titulo}</td>`;

    const ehTotalizador = ['subtotal', 'resultado'].includes(item.tipo);

    if (valores && valores.meses) {
        valores.meses.forEach(valor => {
            const valorFormatado = formatarMoeda(valor, ehTotalizador);
            const corValor = valor > 0 ? '#059669' : valor < 0 ? '#dc2626' : '#374151';
            const pesoMes = ehTotalizador ? '600' : '400';
            const tamanhoFonte = item.tipo.includes('item_') ? '9px' : '11px';
            html += `<td style="padding: 6px 4px; text-align: right; border-bottom: 1px solid #f1f5f9; color: ${corValor}; font-size: ${tamanhoFonte}; font-weight: ${pesoMes};">${valorFormatado}</td>`;
        });
    } else {
        for (let i = 0; i < 12; i++) {
            html += `<td style="padding: 6px 4px; text-align: right; border-bottom: 1px solid #f1f5f9; color: #6b7280; font-size: 10px;">-</td>`;
        }
    }

    const total = valores ? valores.total : 0;
    const totalFormatado = formatarMoeda(total, ehTotalizador);
    const corTotal = total > 0 ? '#059669' : total < 0 ? '#dc2626' : '#374151';
    const pesoTotal = ehTotalizador ? '700' : '400';
    const tamanhoFonteTotal = item.tipo.includes('item_') ? '9px' : '11px';
    html += `<td style="padding: 6px 4px; text-align: right; border-bottom: 1px solid #f1f5f9; background: #f8fafc; font-weight: ${pesoTotal}; color: ${corTotal}; font-size: ${tamanhoFonteTotal};">${totalFormatado}</td>`;

    html += '</tr>';

    return html;
}

// Formatar moeda sem símbolo R$
function formatarMoeda(valor, exibirZero = false) {
    if (valor === 0 && !exibirZero) return '-';

    const valorAbs = Math.abs(valor);
    const sinal = valor < 0 ? '-' : '';

    return sinal + valorAbs.toLocaleString('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

// Resetar filtros
function resetFilters() {
    document.getElementById('ano-filter').value = new Date().getFullYear();
    document.getElementById('empresa-filter').value = '';
    const fornecedorFilter = document.getElementById('fornecedor-filter');
    if (fornecedorFilter) fornecedorFilter.value = '';
    const centroCustoFilter = document.getElementById('centro-custo-filter');
    if (centroCustoFilter) centroCustoFilter.value = '';
    carregarDadosPL();
}

// Exportar P&L
function exportarPL(formato = 'xlsx') {
    console.log(`📊 Exportando P&L Contábil como ${formato.toUpperCase()}...`);

    if (formato === 'xlsx') {
        exportarXLSX();
    } else if (formato === 'csv') {
        exportarCSV();
    } else {
        showErrorMessage(`Formato ${formato.toUpperCase()} não implementado ainda`);
    }
}

// Exportar como XLSX
async function exportarXLSX() {
    try {
        console.log('📥 Iniciando exportação XLSX do P&L Contábil...');

        const ano = document.getElementById('ano-filter').value;
        const empresa = document.getElementById('empresa-filter').value;
        const fornecedor = document.getElementById('fornecedor-filter')?.value || '';
        const centroCusto = document.getElementById('centro-custo-filter')?.value || '';

        // Construir URL com parâmetros
        let url = `/api/relatorios/pl-contabil/export-excel?ano=${ano}`;
        if (empresa) url += `&empresa=${empresa}`;
        if (fornecedor) url += `&fornecedor=${fornecedor}`;
        if (centroCusto) url += `&centro_custo=${centroCusto}`;

        console.log('📥 URL de exportação:', url);

        const response = await fetch(url, {
            credentials: 'include',
            headers: { 
                'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro na resposta do servidor:', errorText);
            throw new Error(`Erro ao exportar: ${response.status} - ${errorText}`);
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `pl-contabil-${ano}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);

        console.log('✅ Exportação concluída com sucesso');
        if (typeof showSuccessMessage === 'function') {
            showSuccessMessage(`P&L Contábil exportado como pl-contabil-${ano}.xlsx`);
        } else {
            alert(`P&L Contábil exportado como pl-contabil-${ano}.xlsx`);
        }

    } catch (error) {
        console.error('❌ Erro ao exportar XLSX:', error);
        if (typeof showErrorMessage === 'function') {
            showErrorMessage('Erro ao exportar relatório: ' + error.message);
        } else {
            alert('Erro ao exportar relatório: ' + error.message);
        }
    }
}

// Exportar como CSV (mantido para compatibilidade)
function exportarCSV() {
    try {
        let csv = 'Descrição,Jan,Fev,Mar,Abr,Mai,Jun,Jul,Ago,Set,Out,Nov,Dez,Total\n';

        const linhas = document.querySelectorAll('#pl-tbody tr');

        linhas.forEach(linha => {
            const colunas = linha.querySelectorAll('td');
            if (colunas.length > 1) {
                const dadosLinha = [];
                colunas.forEach((coluna, index) => {
                    let valor = coluna.textContent.trim();
                    if (valor.includes(',')) {
                        valor = `"${valor.replace(/"/g, '""')}"`;
                    }
                    dadosLinha.push(valor);
                });
                csv += dadosLinha.join(',') + '\n';
            }
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        const ano = document.getElementById('ano-filter').value;
        const nomeArquivo = `pl-contabil-${ano}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', nomeArquivo);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showSuccessMessage(`P&L Contábil exportado como ${nomeArquivo}`);

    } catch (error) {
        console.error('❌ Erro ao exportar CSV:', error);
        showErrorMessage('Erro ao exportar relatório como CSV');
    }
}

// Funções utilitárias
function showErrorMessage(message) {
    console.error('❌ Erro:', message);
    alert('Erro: ' + message);
}

function showSuccessMessage(message) {
    console.log('✅ Sucesso:', message);
    alert(message);
}
