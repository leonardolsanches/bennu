/**
 * JavaScript para formulário de planejamento de despesas - TABELA DE MENSALIZAÇÃO
 */

// Estado global
let empresas = [];
let clientes = [];
let categoriasGerenciais = [];
let subcategoriasGerenciais = [];
let categoriasContabeis = [];
let subcategoriasContabeis = [];
let centrosCusto = [];
let contasContabeis = [];

// Inicializar página
document.addEventListener('DOMContentLoaded', function() {
    console.log('📝 Inicializando formulário de planejamento de despesa (mensalização)...');

    // Popular campo de ano com ano corrente + passados + 5 futuros
    if (window.populateYearSelect) {
        window.populateYearSelect('ano_planejamento', { includePlaceholder: false });
    }

    carregarDados();
    configurarEventListeners();
});

async function carregarDados() {
    try {
        console.log('🔄 Carregando dados do formulário de despesa...');

        // Carregar versões primeiro (necessário para o formulário)
        await carregarVersoes();
        console.log('✅ Versões carregadas');

        // Carregar empresas
        const empresasResponse = await fetch('/api/empresas', {
            credentials: 'include'
        });
        if (empresasResponse.ok) {
            // Removida a declaração duplicada de 'empresas' aqui
            const empresasData = await empresasResponse.json();
            empresas = empresasData; // Atribuição à variável global
            populateSelect('empresa', empresasData, 'id', 'nome_fantasia');
        }

        // Carregar clientes
        const clientesResponse = await fetch('/api/clientes', {
            credentials: 'include'
        });
        if (clientesResponse.ok) {
            const clientesData = await clientesResponse.json();
            clientes = clientesData; // Atribuição à variável global
            populateSelect('cliente', clientesData, 'id', 'nome');
        }

        // Carregar categorias gerenciais (apenas principais)
        const categoriasGerenciaisResponse = await fetch('/api/categorias-gerenciais', {
            credentials: 'include'
        });
        if (categoriasGerenciaisResponse.ok) {
            const categoriasGerenciaisData = await categoriasGerenciaisResponse.json();
            categoriasGerenciais = categoriasGerenciaisData; // Atribuição à variável global
            populateSelect('categoria_gerencial', categoriasGerenciaisData, 'id', 'nome');
            console.log('✅ Categorias gerenciais carregadas:', categoriasGerenciaisData.length);
        }

        // Nota: Categorias contábeis não são carregadas para despesas planejadas

        // Configurar listeners para carregar subcategorias
        setupSubcategoryListeners();
    } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
    }
}

// Função auxiliar para popular selects
function populateSelect(selectId, data, valueKey, textKey, clearFirst = true) {
    const select = document.getElementById(selectId);
    if (!select) return;

    if (clearFirst) {
        select.innerHTML = '<option value="">Selecione...</option>';
    }

    data.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        option.textContent = item[textKey];
        select.appendChild(option);
    });
}

function configurarEventListeners() {
    const form = document.getElementById('planejar-despesa-form');
    form.addEventListener('submit', handleSubmit);

    // Event listeners para os inputs mensais com máscara
    const mesInputs = document.querySelectorAll('.mes-input');
    mesInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            aplicarMascaraValor(e.target);
            atualizarTotal();
        });
    });

    // Máscara para campo de distribuição
    const valorDistribuir = document.getElementById('valor-distribuir');
    if (valorDistribuir) {
        valorDistribuir.addEventListener('input', function(e) {
            aplicarMascaraValor(e.target);
        });
    }

    // Recarregar versões quando mudar o ano
    const anoSelect = document.getElementById('ano_planejamento');
    if (anoSelect) {
        anoSelect.addEventListener('change', function() {
            console.log('📅 Ano alterado para:', this.value);
            carregarVersoes();
        });
    }
}

// Configurar listeners para carregar subcategorias
function setupSubcategoryListeners() {
    // Listener para categoria gerencial
    const categoriaGerencialSelect = document.getElementById('categoria_gerencial');
    if (categoriaGerencialSelect) {
        categoriaGerencialSelect.addEventListener('change', async (e) => {
            const categoriaId = e.target.value;
            const subcategoriaSelect = document.getElementById('subcategoria_gerencial');

            // Limpar subcategorias
            subcategoriaSelect.innerHTML = '<option value="">Selecione...</option>';

            if (categoriaId) {
                try {
                    const response = await fetch(`/api/categorias-gerenciais?pai_id=${categoriaId}`, {
                        credentials: 'include'
                    });
                    if (response.ok) {
                        const subcategorias = await response.json();
                        populateSelect('subcategoria_gerencial', subcategorias, 'id', 'nome', false);
                        console.log('✅ Subcategorias gerenciais carregadas:', subcategorias.length);
                    }
                } catch (error) {
                    console.error('Erro ao carregar subcategorias gerenciais:', error);
                }
            }
        });
    }

    // Nota: Listeners para categorias contábeis removidos para despesas planejadas
}


function atualizarTotal() {
    const mesInputs = document.querySelectorAll('.mes-input');
    let total = 0;

    mesInputs.forEach(input => {
        const valor = extrairValorNumerico(input.value);
        total += valor;
    });

    // Atualizar display do total
    const totalDisplay = document.getElementById('total-anual');
    totalDisplay.textContent = formatarValorInput(total);
}

async function handleSubmit(e) {
    e.preventDefault();

    // Coletar valores mensais
    const valores_mensais = {};
    const mesInputs = document.querySelectorAll('.mes-input');
    let temValor = false;

    mesInputs.forEach(input => {
        const mes = parseInt(input.dataset.mes);
        const valor = extrairValorNumerico(input.value);
        valores_mensais[mes] = valor;
        if (valor > 0) temValor = true;
    });

    if (!temValor) {
        alert('Por favor, preencha pelo menos um mês com valor maior que zero.');
        return;
    }

    // Buscar elementos do formulário com validação
    const empresaEl = document.getElementById('empresa');
    const anoEl = document.getElementById('ano_planejamento');
    const descricaoEl = document.getElementById('descricao');

    // Validar elementos obrigatórios
    if (!empresaEl || !empresaEl.value) {
        alert('Por favor, selecione uma empresa.');
        return;
    }

    // Construir descrição com ano/mês dos primeiros meses com valor
    const ano = anoEl && anoEl.value ? parseInt(anoEl.value) : new Date().getFullYear();
    const descricaoUsuario = descricaoEl && descricaoEl.value ? descricaoEl.value.trim() : '';

    // Encontrar primeiro mês com valor para usar como referência
    let primeiroMesComValor = null;
    for (let mes = 1; mes <= 12; mes++) {
        if (valores_mensais[mes] && valores_mensais[mes] > 0) {
            primeiroMesComValor = mes;
            break;
        }
    }

    // Construir descrição final
    let descricaoFinal = 'Despesa planejada';
    if (primeiroMesComValor) {
        const mesFormatado = primeiroMesComValor.toString().padStart(2, '0');
        descricaoFinal = `${ano}/${mesFormatado}`;
        if (descricaoUsuario) {
            descricaoFinal += ` - ${descricaoUsuario}`;
        }
    } else if (descricaoUsuario) {
        descricaoFinal = descricaoUsuario;
    }

    const formData = {
        empresa_id: parseInt(empresaEl.value),
        ano: ano,
        categoria: 'despesa',
        descricao: descricaoFinal,
        valores_mensais: valores_mensais,

        // Versão de planejamento selecionada
        versao_id: getSelectValue('versao'),

        // Classificações (com validação segura)
        cliente_id: getSelectValue('cliente'),
        categoria_gerencial_id: getSelectValue('categoria_gerencial'),
        subcategoria_gerencial_id: getSelectValue('subcategoria_gerencial')
        // Nota: Despesas planejadas não requerem classificação contábil
    };

    // Função auxiliar para obter valor de select com segurança
    function getSelectValue(id) {
        const el = document.getElementById(id);
        return (el && el.value) ? parseInt(el.value) : null;
    }

    console.log('📤 Enviando dados:', formData);

    try {
        const response = await fetch('/api/planejamento/linhas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Erro ao salvar planejamento');
        }

        const result = await response.json();
        console.log('✅ Planejamento criado:', result);

        const numLinhas = result.linhas?.length || result.linhas_criadas || 0;
        alert(`Sucesso! ${numLinhas} linhas orçamentárias criadas.`);
        window.location.href = '/planejar';
    } catch (error) {
        console.error('❌ Erro ao salvar:', error);
        alert('Erro ao salvar planejamento: ' + error.message);
    }
}

// Funções de distribuição de valores (exportadas para escopo global)
function distribuirValorIgual() {
    const valorInput = document.getElementById('valor-distribuir');
    const valorTotal = extrairValorNumerico(valorInput.value);

    if (valorTotal === 0) {
        alert('Por favor, preencha o valor total antes de distribuir.');
        return;
    }

    const mesInputs = document.querySelectorAll('.mes-input');
    
    // Calcular valor base por mês (arredondado para baixo em 2 casas decimais)
    const valorPorMes = Math.floor((valorTotal / 12) * 100) / 100;
    
    // Calcular a soma de 11 meses com valor base
    const soma11Meses = valorPorMes * 11;
    
    // Último mês recebe a diferença para garantir soma exata
    const valorUltimoMes = Math.round((valorTotal - soma11Meses) * 100) / 100;

    // Preencher os 11 primeiros meses
    const inputsArray = Array.from(mesInputs);
    inputsArray.slice(0, 11).forEach(input => {
        input.value = formatarValorInput(valorPorMes);
    });
    
    // Último mês com diferença de centavos
    if (inputsArray[11]) {
        inputsArray[11].value = formatarValorInput(valorUltimoMes);
    }

    atualizarTotal();
    console.log('✅ Valor distribuído: R$', valorPorMes, 'x 11 meses + R$', valorUltimoMes, '(último mês)');
}

function repetirNos12Meses() {
    const valorInput = document.getElementById('valor-distribuir');
    const valorRepetir = extrairValorNumerico(valorInput.value);

    if (valorRepetir === 0) {
        alert('Por favor, preencha o valor antes de repetir.');
        return;
    }

    const mesInputs = document.querySelectorAll('.mes-input');
    mesInputs.forEach(input => {
        input.value = formatarValorInput(valorRepetir);
    });

    atualizarTotal();
    console.log('✅ Valor repetido nos 12 meses:', valorRepetir);
}

function repetirMesesSubsequentes() {
    const mesInputs = document.querySelectorAll('.mes-input');

    // Encontrar primeiro mês com valor
    let primeiroValor = null;
    for (let input of mesInputs) {
        const valor = extrairValorNumerico(input.value);
        if (valor > 0) {
            primeiroValor = valor;
            break;
        }
    }

    if (!primeiroValor) {
        alert('Por favor, preencha pelo menos um mês antes de repetir.');
        return;
    }

    // Repetir nos meses vazios subsequentes
    let encontrouPrimeiro = false;
    mesInputs.forEach(input => {
        const valorAtual = extrairValorNumerico(input.value);
        if (valorAtual > 0) {
            encontrouPrimeiro = true;
        } else if (encontrouPrimeiro) {
            input.value = formatarValorInput(primeiroValor);
        }
    });

    atualizarTotal();
    console.log('✅ Valores repetidos nos meses subsequentes');
}

function limparTodosMeses() {
    if (!confirm('Deseja realmente limpar todos os valores mensais?')) {
        return;
    }

    const mesInputs = document.querySelectorAll('.mes-input');
    mesInputs.forEach(input => {
        input.value = '';
    });

    const valorInput = document.getElementById('valor-distribuir');
    if (valorInput) {
        valorInput.value = '';
    }
    atualizarTotal();
    console.log('✅ Todos os meses limpos');
}

function aplicarMascaraValor(input) {
    let valor = input.value.replace(/\D/g, ''); // Remove tudo que não é dígito

    if (valor === '') {
        input.value = '';
        return;
    }

    // Converte para número e formata
    valor = (parseInt(valor) / 100).toFixed(2);

    // Formata com separadores
    const partes = valor.split('.');
    partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    input.value = partes.join(',');
}

function extrairValorNumerico(valorFormatado) {
    if (!valorFormatado) return 0;
    return parseFloat(valorFormatado.replace(/\./g, '').replace(',', '.')) || 0;
}

function formatarValorInput(valor) {
    const valorStr = valor.toFixed(2);
    const partes = valorStr.split('.');
    partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return partes.join(',');
}

// Exportar funções para escopo global
window.distribuirValorIgual = distribuirValorIgual;
window.repetirNos12Meses = repetirNos12Meses;
window.repetirMesesSubsequentes = repetirMesesSubsequentes;
window.limparTodosMeses = limparTodosMeses;

// Funções de modal integradas com sistema global
function openAddModal(tipo) {
    // Mapear tipos para os nomes corretos do sistema de modais
    const typeMap = {
        'empresa': 'empresas',
        'cliente': 'clientes',
        'categoria_gerencial': 'categorias-gerenciais',
        'subcategoria_gerencial': 'categorias-gerenciais',
        'categoria_contabil': 'categorias-contabeis',
        'subcategoria_contabil': 'categorias-contabeis',
        'centro_custo': 'centros-custo',
        'conta_contabil': 'contas-contabeis'
    };

    const modalType = typeMap[tipo];
    if (!modalType) {
        console.error('❌ Tipo de modal não encontrado:', tipo);
        alert(`Erro: Tipo de modal não configurado para ${tipo}`);
        return;
    }

    // Usar sistema global de modais
    if (window.openModal) {
        // Registrar callback para recarregar dados após criação
        window.onModalSuccess = (createdModalType, result) => {
            console.log('✅ Registro criado via modal:', result);

            // Recarregar o select correspondente
            if (tipo === 'empresa') {
                carregarDados();
            } else if (tipo === 'cliente') {
                carregarDados();
            } else if (tipo === 'xxxfornecedorxxx') {  // Removido do planejamento
                carregarDados();
            } else if (tipo === 'categoria_gerencial') {
                carregarDados();
            } else if (tipo === 'categoria_contabil') {
                carregarDados();
            }
        };

        window.openModal(modalType);
    } else {
        console.error('❌ Sistema de modal global não disponível');
        alert('Sistema de modais não está carregado. Recarregue a página.');
    }
}

// ====================================================================================
// FUNÇÕES DE GERENCIAMENTO DE VERSÕES
// ====================================================================================

async function carregarVersoes() {
    try {
        // Obter ano selecionado
        const anoSelect = document.getElementById('ano_planejamento');
        const ano = anoSelect ? anoSelect.value : new Date().getFullYear();
        
        console.log('🔄 Carregando versões para ano:', ano);
        const response = await fetch(`/api/planejamento/versoes/resumo?ano=${ano}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📦 Dados recebidos:', data);

        const selectVersao = document.getElementById('versao');
        if (!selectVersao) {
            console.warn('⚠️ Campo versao não encontrado no DOM');
            return;
        }

        if (!data.versoes || data.versoes.length === 0) {
            selectVersao.innerHTML = `<option value="">Nenhuma versão para ${ano}</option>`;
            console.warn('⚠️ Nenhuma versão encontrada para o ano:', ano);
            return;
        }

        selectVersao.innerHTML = '<option value="">Selecione uma versão...</option>';

        data.versoes.forEach(versao => {
            const option = document.createElement('option');
            option.value = versao.id;
            option.textContent = `${versao.nome}${versao.is_ativo ? ' ✓ (Ativa)' : ''}`;
            if (versao.is_ativo) {
                option.selected = true;
            }
            selectVersao.appendChild(option);
        });

        console.log('✅ Versões carregadas para', ano, ':', data.versoes.length);
    } catch (error) {
        console.error('❌ Erro ao carregar versões:', error);
        const selectVersao = document.getElementById('versao');
        if (selectVersao) {
            selectVersao.innerHTML = '<option value="">Erro ao carregar versões</option>';
        }
    }
}

function abrirModalCriarVersao() {
    const modal = document.getElementById('modal-criar-versao');
    if (modal) {
        // Popular campo de ano do modal se ainda não estiver populado
        const anoModal = document.getElementById('nova-versao-ano');
        if (anoModal && anoModal.options.length === 0 && window.populateYearSelect) {
            window.populateYearSelect('nova-versao-ano', { includePlaceholder: false });
        }
        
        // Sincronizar ano do modal com o ano do formulário principal
        const anoFormulario = document.getElementById('ano_planejamento').value;
        if (anoModal && anoFormulario) {
            anoModal.value = anoFormulario;
        }

        modal.style.display = 'flex';

        // Focar no campo de nome
        setTimeout(() => {
            const nomeInput = document.getElementById('nova-versao-nome');
            if (nomeInput) nomeInput.focus();
        }, 100);
    }
}

function fecharModalCriarVersao() {
    const modal = document.getElementById('modal-criar-versao');
    if (modal) {
        modal.style.display = 'none';

        // Limpar campos
        document.getElementById('nova-versao-nome').value = '';
        document.getElementById('nova-versao-tipo').value = 'baseline';
    }
}

async function salvarNovaVersao() {
    const nomeVersao = document.getElementById('nova-versao-nome')?.value?.trim();
    const anoVersao = document.getElementById('nova-versao-ano')?.value;
    const tipoVersao = document.getElementById('nova-versao-tipo')?.value;

    console.log('📝 Criando versão:', { nomeVersao, anoVersao, tipoVersao });

    if (!nomeVersao || !anoVersao) {
        alert('Nome e ano são obrigatórios');
        return;
    }

    try {
        const payload = {
            nome: nomeVersao,
            ano_referencia: parseInt(anoVersao),
            tipo: tipoVersao || 'revisao',
            status: 'rascunho'
        };

        console.log('📤 Enviando payload:', payload);

        const response = await fetch('/api/planejamento/versoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Erro ao criar versão');
        }

        const data = await response.json();
        console.log('✅ Versão criada:', data);

        // Recarregar versões
        await carregarVersoes();

        // Selecionar a versão recém-criada
        const versaoSelect = document.getElementById('versao');
        if (versaoSelect && data.versao && data.versao.id) {
            versaoSelect.value = data.versao.id;
        }

        // Fechar modal
        fecharModalCriarVersao();

        // Mostrar mensagem de sucesso
        alert(`Versão "${nomeVersao}" criada com sucesso!`);

    } catch (error) {
        console.error('❌ Erro ao criar versão:', error);
        alert(`Erro ao criar versão: ${error.message}`);
    }
}

// Exportar funções do modal para escopo global
window.abrirModalCriarVersao = abrirModalCriarVersao;
window.fecharModalCriarVersao = fecharModalCriarVersao;
window.salvarNovaVersao = salvarNovaVersao;

// Fechar modal ao clicar fora
document.addEventListener('click', function(event) {
    const modal = document.getElementById('modal-criar-versao');
    if (modal && event.target === modal) {
        fecharModalCriarVersao();
    }
});