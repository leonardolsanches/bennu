/**
 * JavaScript para formulário de planejamento de receitas - TABELA DE MENSALIZAÇÃO
 */

// Estado global (variáveis já declaradas em escopo global pelo sistema de modais)
// Declarar apenas se não existirem
if (typeof empresas === 'undefined') var empresas = [];
if (typeof clientes === 'undefined') var clientes = [];
if (typeof produtosServicos === 'undefined') var produtosServicos = [];
if (typeof categoriasContabeis === 'undefined') var categoriasContabeis = [];
if (typeof categoriasGerenciais === 'undefined') var categoriasGerenciais = [];

// Todas as versões (sem filtro de ano)
var todasVersoes = [];

// Inicializar página
document.addEventListener('DOMContentLoaded', function() {
    console.log('📝 Inicializando formulário de planejamento de receita (mensalização)...');

    // Popular campo de ano com ano corrente + passados + 5 futuros
    if (window.populateYearSelect) {
        window.populateYearSelect('ano_planejamento', { includePlaceholder: false });
    }

    carregarDados();
    configurarEventListeners();
});

async function carregarDados() {
    try {
        console.log('🔄 Carregando dados do formulário de receita...');

        // Carregar versões primeiro (necessário para o formulário)
        await carregarVersoes();
        console.log('✅ Versões carregadas');

        // Carregar empresas
        const respEmpresas = await fetch('/api/empresas');
        const dataEmpresas = await respEmpresas.json();
        empresas = dataEmpresas.empresas || dataEmpresas || [];
        popularSelect('empresa', empresas, 'id', 'nome_fantasia');

        // Carregar clientes
        const respClientes = await fetch('/api/clientes');
        clientes = await respClientes.json();
        popularSelect('cliente', clientes, 'id', 'nome');

        // Carregar produtos/serviços
        const respProdutos = await fetch('/api/produtos-servicos');
        const dataProdutos = await respProdutos.json();
        produtosServicos = dataProdutos.produtos_servicos || dataProdutos || [];
        popularSelect('produto_servico', produtosServicos, 'id', 'nome');

        console.log('✅ Dados carregados:', {
            empresas: empresas.length,
            clientes: clientes.length,
            produtos: produtosServicos.length
        });
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
    }
}




// Função auxiliar para popular selects
function popularSelect(selectId, data, valueKey, textKey, clearFirst = true) {
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
    const form = document.getElementById('planejar-receita-form');
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

    // Filtrar versões quando mudar o ano
    const anoSelect = document.getElementById('ano_planejamento');
    if (anoSelect) {
        anoSelect.addEventListener('change', function() {
            console.log('📅 Ano alterado para:', this.value);
            filtrarVersoesPorAno();
        });
    }
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
    // Remove pontos (separador de milhares) e substitui vírgula por ponto
    return parseFloat(valorFormatado.replace(/\./g, '').replace(',', '.')) || 0;
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

// Funções de distribuição de valores
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

async function handleSubmit(e) {
    e.preventDefault();

    // Validar empresa
    const empresaEl = document.getElementById('empresa');
    if (!empresaEl || !empresaEl.value) {
        alert('Por favor, selecione uma empresa.');
        return;
    }

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

    // Buscar outros elementos do formulário com validação
    const anoEl = document.getElementById('ano_planejamento');
    const descricaoEl = document.getElementById('descricao');
    const clienteEl = document.getElementById('cliente');
    const produtoServicoEl = document.getElementById('produto_servico');

    // Construir descrição com ano/mês dos primeiros meses com valor
    const ano = anoEl ? parseInt(anoEl.value) : new Date().getFullYear();
    const descricaoUsuario = descricaoEl ? descricaoEl.value.trim() : '';

    // Encontrar primeiro mês com valor para usar como referência
    let primeiroMesComValor = null;
    for (let mes = 1; mes <= 12; mes++) {
        if (valores_mensais[mes] && valores_mensais[mes] > 0) {
            primeiroMesComValor = mes;
            break;
        }
    }

    // Construir descrição final
    let descricaoFinal = 'Receita planejada';
    if (primeiroMesComValor) {
        const mesFormatado = primeiroMesComValor.toString().padStart(2, '0');
        descricaoFinal = `${ano}/${mesFormatado}`;
        if (descricaoUsuario) {
            descricaoFinal += ` - ${descricaoUsuario}`;
        }
    } else if (descricaoUsuario) {
        descricaoFinal = descricaoUsuario;
    }

    // Função auxiliar para obter valor de select com segurança
    function getSelectValue(id) {
        const el = document.getElementById(id);
        return (el && el.value) ? parseInt(el.value) : null;
    }

    const formData = {
        empresa_id: parseInt(empresaEl.value),
        ano: ano,
        categoria: 'receita',
        descricao: descricaoFinal,
        valores_mensais: valores_mensais,

        // Versão de planejamento selecionada
        versao_id: getSelectValue('versao'),

        // Classificações opcionais
        cliente_id: getSelectValue('cliente'),
        produto_servico_id: getSelectValue('produto_servico')
    };

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

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor || 0);
}

// Funções de modal integradas com sistema global
function openAddModal(tipo) {
    // Mapear tipos para os nomes corretos do sistema de modais
    const typeMap = {
        'empresa': 'empresas',
        'cliente': 'clientes',
        'projeto': 'projetos',
        'produto_servico': 'produtos-servicos'
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
                loadClientes(); // Chamar a função específica de clientes
            } else if (tipo === 'projeto') {
                carregarDados();
            } else if (tipo === 'produto_servico') {
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

async function carregarTodasVersoes() {
    try {
        console.log('🔄 Carregando todas as versões...');
        const response = await fetch('/api/planejamento/versoes/resumo');

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        todasVersoes = data.versoes || [];
        console.log('✅ Todas versões carregadas:', todasVersoes.length);
        
        // Aplicar filtro inicial baseado no ano selecionado
        filtrarVersoesPorAno();
    } catch (error) {
        console.error('❌ Erro ao carregar versões:', error);
        const selectVersao = document.getElementById('versao');
        if (selectVersao) {
            selectVersao.innerHTML = '<option value="">Erro ao carregar versões</option>';
        }
    }
}

function filtrarVersoesPorAno() {
    const anoSelect = document.getElementById('ano_planejamento');
    const anoSelecionado = anoSelect ? anoSelect.value : '';
    
    const selectVersao = document.getElementById('versao');
    if (!selectVersao) {
        console.warn('⚠️ Campo versao não encontrado no DOM');
        return;
    }

    // Filtrar versões pelo ano (se selecionado)
    let versoesFiltradas = todasVersoes;
    if (anoSelecionado) {
        versoesFiltradas = todasVersoes.filter(v => v.ano_referencia == anoSelecionado);
    }

    if (versoesFiltradas.length === 0) {
        const msg = anoSelecionado ? `Nenhuma versão para ${anoSelecionado}` : 'Nenhuma versão disponível';
        selectVersao.innerHTML = `<option value="">${msg}</option>`;
        console.warn('⚠️ Nenhuma versão encontrada');
        return;
    }

    selectVersao.innerHTML = '<option value="">Selecione uma versão...</option>';

    versoesFiltradas.forEach(versao => {
        const option = document.createElement('option');
        option.value = versao.id;
        // Mostrar ano na opção se não houver filtro de ano
        const anoInfo = anoSelecionado ? '' : ` (${versao.ano_referencia})`;
        option.textContent = `${versao.nome}${anoInfo}${versao.is_ativo ? ' ✓ (Ativa)' : ''}`;
        if (versao.is_ativo) {
            option.selected = true;
        }
        selectVersao.appendChild(option);
    });

    console.log('✅ Versões filtradas para ano', anoSelecionado || 'todos', ':', versoesFiltradas.length);
}

async function carregarVersoes() {
    await carregarTodasVersoes();
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
    const nome = document.getElementById('nova-versao-nome').value.trim();
    const ano = parseInt(document.getElementById('nova-versao-ano').value);
    const tipo = document.getElementById('nova-versao-tipo').value;

    // Validações
    if (!nome) {
        alert('Por favor, informe o nome da versão');
        return;
    }

    if (!ano) {
        alert('Por favor, selecione o ano');
        return;
    }

    try {
        const response = await fetch('/api/planejamento/versoes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: nome,
                ano_referencia: ano,
                tipo: tipo,
                status: 'rascunho'
            })
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
        alert(`Versão "${nome}" criada com sucesso!`);

    } catch (error) {
        console.error('❌ Erro ao salvar versão:', error);
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

async function loadClientes(selectId = 'cliente') {
    try {
        console.log(`🔄 Carregando clientes no select: ${selectId}`);
        const response = await fetch('/api/clientes', {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const clientes = await response.json();
        const select = document.getElementById(selectId) || document.querySelector(`select[name="${selectId}_id"]`);

        if (!select) {
            console.warn(`⚠️ Select ${selectId} não encontrado`);
            return;
        }

        const valorAtual = select.value; // Preservar seleção atual

        select.innerHTML = '<option value="">Selecione...</option>';
        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.id;
            option.textContent = cliente.nome;
            select.appendChild(option);
        });

        // Restaurar seleção se ainda existir
        if (valorAtual && select.querySelector(`option[value="${valorAtual}"]`)) {
            select.value = valorAtual;
        }

        console.log(`✅ Clientes carregados (${clientes.length}) no select:`, selectId);
    } catch (error) {
        console.error('❌ Erro ao carregar clientes:', error);
    }
}

// Exportar função globalmente para uso pelos modals
window.loadClientes = loadClientes;
window.filtrarVersoesPorAno = filtrarVersoesPorAno;