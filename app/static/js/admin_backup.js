// Carregar informações das tabelas ao iniciar
document.addEventListener('DOMContentLoaded', function() {
    carregarTabelasStatus();
});

// Carregar status das tabelas
async function carregarTabelasStatus() {
    try {
        const response = await fetch('/api/admin/backup/tables');
        const data = await response.json();
        
        const tbody = document.getElementById('lista-tabelas');
        
        if (!data.tabelas || data.tabelas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 40px;">Nenhuma tabela encontrada</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.tabelas.map(tabela => {
            const badgeClass = tabela.categoria === 'Cadastro' ? 'badge-cadastro' : 
                              tabela.categoria === 'Transacional' ? 'badge-transacional' : 
                              'badge-auditoria';
            const desc = tabela.descricao || '';
            
            return `
                <tr data-testid="row-tabela-${tabela.nome}">
                    <td>
                        <strong>${tabela.nome}</strong>
                        ${desc ? `<div style="font-size: 11px; color: #6b7280; margin-top: 2px;">${desc}</div>` : ''}
                    </td>
                    <td>
                        <span class="badge-categoria ${badgeClass}">${tabela.categoria}</span>
                    </td>
                    <td style="text-align: right;">
                        ${tabela.registros.toLocaleString('pt-BR')}
                    </td>
                    <td style="text-align: center;">
                        ${tabela.registros > 0 ? `
                            <button class="btn-action btn-action-delete" onclick="confirmarLimpezaTabela('${tabela.nome}')" data-testid="button-limpar-${tabela.nome}" title="Limpar tabela" style="width: auto; padding: 0 8px;">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : '<span style="color: #9ca3af; font-size: 12px;">Vazia</span>'}
                    </td>
                </tr>
            `;
        }).join('');
        
        console.log(`✅ Carregadas ${data.tabelas.length} tabelas`);
        
    } catch (error) {
        console.error('Erro ao carregar status das tabelas:', error);
        document.getElementById('lista-tabelas').innerHTML = 
            '<tr><td colspan="4" style="text-align: center; padding: 40px; color: red;">Erro ao carregar tabelas</td></tr>';
    }
}

// Exportar backup
async function exportarBackup() {
    try {
        const tipo = document.getElementById('tipo-backup').value;
        
        // Mostrar mensagem de processamento
        const button = event.target;
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exportando...';
        
        // Fazer download do backup
        window.location.href = `/api/admin/backup/export?tipo=${tipo}`;
        
        // Restaurar botão após um delay
        setTimeout(() => {
            button.disabled = false;
            button.innerHTML = originalText;
            mostrarMensagem('Backup exportado com sucesso!', 'success');
        }, 2000);
        
    } catch (error) {
        console.error('Erro ao exportar backup:', error);
        mostrarMensagem('Erro ao exportar backup', 'error');
    }
}

// Importar backup
async function importarBackup() {
    try {
        const fileInput = document.getElementById('arquivo-backup');
        const file = fileInput.files[0];
        const limparDestino = document.getElementById('limpar-destino')?.checked || false;

        if (!file) {
            mostrarMensagem('Por favor, selecione um arquivo de backup', 'error');
            return;
        }

        if (!file.name.endsWith('.json')) {
            mostrarMensagem('Arquivo inválido. Selecione um arquivo .json', 'error');
            return;
        }

        // Confirmação mais forte quando modo migração completa
        if (limparDestino) {
            const confirmMsg = '⚠️ MIGRAÇÃO COMPLETA ATIVADA\n\n'
                + 'TODOS os dados atuais deste banco serão APAGADOS permanentemente '
                + 'antes de importar o backup.\n\n'
                + 'Esta operação é IRREVERSÍVEL.\n\n'
                + 'Confirma a limpeza completa e reimportação?';
            if (!confirm(confirmMsg)) return;
        } else {
            if (!confirm('ATENÇÃO: A importação pode sobrescrever dados existentes. Confirma?')) {
                return;
            }
        }

        // Mostrar progresso
        document.getElementById('progresso-import').style.display = 'block';
        document.getElementById('barra-progresso').style.width = '20%';
        document.getElementById('status-import').textContent = limparDestino
            ? 'Limpando destino e importando...'
            : 'Processando arquivo...';

        const formData = new FormData();
        formData.append('file', file);
        formData.append('limpar_destino', limparDestino ? 'true' : 'false');

        document.getElementById('barra-progresso').style.width = '50%';

        const response = await fetch('/api/admin/backup/import', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Erro ao importar backup');
        }

        const resultado = await response.json();

        document.getElementById('barra-progresso').style.width = '100%';
        document.getElementById('status-import').textContent = 'Importação concluída!';

        const modo = resultado.modo === 'migracao_completa'
            ? '🔄 Modo: Migração Completa (destino limpo + reimportação)\n'
            : '📥 Modo: Incremental (UPSERT)\n';

        let mensagem = `Importação concluída!\n\n${modo}\n`;
        mensagem += `✅ Registros importados: ${resultado.registros_importados}\n\n`;

        if (resultado.sucesso.length > 0) {
            mensagem += `Tabelas:\n`;
            resultado.sucesso.forEach(s => mensagem += `  • ${s}\n`);
        }

        if (resultado.erros.length > 0) {
            mensagem += `\n❌ Erros:\n`;
            resultado.erros.forEach(e => mensagem += `  • ${e}\n`);
        }

        alert(mensagem);

        setTimeout(() => {
            carregarTabelasStatus();
            document.getElementById('progresso-import').style.display = 'none';
            document.getElementById('barra-progresso').style.width = '0%';
            fileInput.value = '';
            if (document.getElementById('limpar-destino')) {
                document.getElementById('limpar-destino').checked = false;
            }
        }, 2000);

    } catch (error) {
        console.error('Erro ao importar backup:', error);
        mostrarMensagem(`Erro ao importar backup: ${error.message}`, 'error');
        document.getElementById('progresso-import').style.display = 'none';
        document.getElementById('barra-progresso').style.width = '0%';
    }
}

// Estado global da seleção
let gruposData = null;
let tabelasSelecionadas = new Set();
let validacaoAtual = null;

// Abrir modal de limpeza com grupos e presets
async function abrirModalLimpeza(preSelectTable = null) {
    try {
        // Buscar grupos, presets e dependências
        const response = await fetch('/api/admin/cleanup/groups');
        gruposData = await response.json();
        
        const modal = document.getElementById('modal-limpeza');
        const conteudo = document.getElementById('conteudo-modal-limpeza');
        
        // Resetar seleção
        tabelasSelecionadas = new Set();
        validacaoAtual = null;
        
        // Se há pré-seleção, adicionar à seleção
        if (preSelectTable) {
            tabelasSelecionadas.add(preSelectTable);
        }
        
        // Renderizar modal completo
        renderizarModalLimpeza(conteudo);
        modal.style.display = 'flex';
        
        // Se há pré-seleção, validar automaticamente após renderização
        if (preSelectTable) {
            setTimeout(() => {
                validarSelecaoAtual();
            }, 100);
        }
        
    } catch (error) {
        console.error('Erro ao abrir modal de limpeza:', error);
        mostrarMensagem('Erro ao carregar dados para limpeza', 'error');
    }
}

// Renderizar modal de limpeza com grupos e presets
function renderizarModalLimpeza(conteudo) {
    let html = `
        <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 12px; margin-bottom: 20px; border-radius: 4px;">
            <strong><i class="fas fa-exclamation-triangle"></i> ATENÇÃO:</strong> 
            Esta operação é IRREVERSÍVEL! Todos os dados das tabelas selecionadas serão PERMANENTEMENTE deletados.
        </div>
        
        <!-- Presets -->
        <div style="margin-bottom: 20px;">
            <h4 style="margin: 0 0 10px 0;">⚡ Presets Rápidos</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
    `;
    
    Object.entries(gruposData.presets).forEach(([presetId, preset]) => {
        const corBg = preset.seguro ? '#dbeafe' : '#fef3c7';
        const corTexto = preset.seguro ? '#1e40af' : '#b45309';
        html += `
            <button onclick="aplicarPreset('${presetId}')" 
                    style="padding: 10px; border: 1px solid ${corTexto}; background: ${corBg}; color: ${corTexto}; border-radius: 4px; cursor: pointer; text-align: left; font-size: 13px;"
                    data-testid="preset-${presetId}">
                <strong>${preset.nome}</strong><br>
                <small>${preset.tabelas.length} tabelas</small>
            </button>
        `;
    });
    
    html += `
            </div>
        </div>
        
        <!-- Área de avisos dinâmicos -->
        <div id="avisos-validacao" style="margin-bottom: 20px; display: none;"></div>
        
        <!-- Grupos de tabelas -->
        <div style="max-height: 400px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 4px; padding: 15px;">
    `;
    
    // Renderizar grupos
    Object.entries(gruposData.grupos).forEach(([grupoId, grupo]) => {
        const coresCss = {
            blue: { bg: '#dbeafe', text: '#1e40af' },
            purple: { bg: '#f3e8ff', text: '#7c3aed' },
            green: { bg: '#dcfce7', text: '#15803d' },
            yellow: { bg: '#fef3c7', text: '#b45309' },
            gray: { bg: '#f3f4f6', text: '#374151' }
        };
        const cor = coresCss[grupo.cor] || coresCss.gray;
        
        html += `
            <div style="margin-bottom: 20px; border: 1px solid ${cor.text}; border-radius: 6px; padding: 10px; background: ${cor.bg};">
                <h4 style="margin: 0 0 5px 0; color: ${cor.text};">
                    ${grupo.nome}
                    <span style="font-size: 12px; font-weight: normal;">(${grupo.tabelas.length} tabelas)</span>
                </h4>
                <p style="margin: 0 0 10px 0; font-size: 12px; color: #6b7280;">${grupo.descricao}</p>
                <div style="font-size: 12px; color: ${cor.text}; margin-bottom: 10px;">${grupo.aviso}</div>
        `;
        
        grupo.tabelas.forEach(tabela => {
            const checked = tabelasSelecionadas.has(tabela.nome) ? 'checked' : '';
            const tDesc = tabela.descricao || '';
            html += `
                <label style="display: block; padding: 6px; cursor: pointer; border-radius: 4px; margin-bottom: 3px; background: white;">
                    <input type="checkbox" class="tabela-checkbox" value="${tabela.nome}" ${checked}
                           onchange="toggleTabelaSelecionada('${tabela.nome}')" 
                           data-testid="checkbox-${tabela.nome}">
                    <strong>${tabela.nome}</strong>
                    <span style="color: #6b7280; font-size: 13px;">(${tabela.registros.toLocaleString('pt-BR')} registros)</span>
                    ${tDesc ? `<div style="font-size: 11px; color: #9ca3af; margin-left: 22px;">${tDesc}</div>` : ''}
                </label>
            `;
        });
        
        html += `</div>`;
    });
    
    html += `
        </div>
        
        <div style="margin-top: 20px; display: flex; justify-content: space-between; align-items: center;">
            <span id="contador-selecionados" style="color: #6b7280; font-size: 14px;">
                0 tabelas selecionadas
            </span>
            <div>
                <button class="btn btn-secondary" onclick="fecharModalLimpeza()" style="margin-right: 10px;">
                    Cancelar
                </button>
                <button id="btn-confirmar-limpeza" class="btn btn-danger" onclick="executarLimpeza()" disabled data-testid="button-confirmar-limpeza">
                    <i class="fas fa-trash-alt"></i> Confirmar Limpeza
                </button>
            </div>
        </div>
    `;
    
    conteudo.innerHTML = html;
}

// Aplicar preset de limpeza
function aplicarPreset(presetId) {
    const preset = gruposData.presets[presetId];
    if (!preset) return;
    
    // Limpar seleção atual
    tabelasSelecionadas.clear();
    
    // Adicionar tabelas do preset
    preset.tabelas.forEach(tabela => tabelasSelecionadas.add(tabela));
    
    // Re-renderizar para atualizar checkboxes
    renderizarModalLimpeza(document.getElementById('conteudo-modal-limpeza'));
    
    // Atualizar contador
    document.getElementById('contador-selecionados').textContent = 
        `${tabelasSelecionadas.size} tabela(s) selecionada(s)`;
    
    // Validar seleção
    validarSelecaoAtual();
    
    console.log(`✅ Preset aplicado: ${preset.nome} (${preset.tabelas.length} tabelas)`);
}

// Toggle de seleção de tabela
function toggleTabelaSelecionada(tabelaNome) {
    if (tabelasSelecionadas.has(tabelaNome)) {
        tabelasSelecionadas.delete(tabelaNome);
    } else {
        tabelasSelecionadas.add(tabelaNome);
    }
    
    // Atualizar contador
    document.getElementById('contador-selecionados').textContent = 
        `${tabelasSelecionadas.size} tabela(s) selecionada(s)`;
    
    // Validar seleção e mostrar sugestões
    validarSelecaoAtual();
}

// Validar seleção atual e atualizar avisos
async function validarSelecaoAtual() {
    const avisosDiv = document.getElementById('avisos-validacao');
    const btnConfirmar = document.getElementById('btn-confirmar-limpeza');
    
    if (tabelasSelecionadas.size === 0) {
        avisosDiv.style.display = 'none';
        btnConfirmar.disabled = true;
        btnConfirmar.style.opacity = '0.5';
        return;
    }
    
    try {
        const response = await fetch('/api/admin/cleanup/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Array.from(tabelasSelecionadas))
        });
        
        validacaoAtual = await response.json();
        
        // Montar avisos visuais
        let avisosHtml = '';
        
        if (validacaoAtual.seguro) {
            avisosHtml = `
                <div style="background: #dcfce7; border-left: 4px solid #15803d; padding: 12px; border-radius: 4px;">
                    <strong style="color: #15803d;"><i class="fas fa-check-circle"></i> Seleção Segura</strong><br>
                    <span style="color: #374151; font-size: 14px;">As tabelas selecionadas podem ser limpas sem quebrar dependências.</span>
                </div>
            `;
            btnConfirmar.disabled = false;
            btnConfirmar.style.opacity = '1';
        } else {
            // Coletar todas as tabelas dependentes faltantes
            const tabelasFaltantes = new Set();
            validacaoAtual.dependencias_quebradas.forEach(dep => {
                dep.dependentes.forEach(t => {
                    if (!tabelasSelecionadas.has(t)) {
                        tabelasFaltantes.add(t);
                    }
                });
            });
            
            avisosHtml = `
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 4px;">
                    <strong style="color: #b45309;"><i class="fas fa-exclamation-triangle"></i> AVISO: Dependências Precisam Ser Incluídas</strong>
                    <div style="margin-top: 10px; font-size: 13px; color: #374151;">
            `;
            
            validacaoAtual.dependencias_quebradas.forEach(dep => {
                avisosHtml += `
                    <div style="margin-bottom: 5px;">
                        • <strong>${dep.tabela}</strong> é referenciada por: 
                        <span style="color: #ef4444;">${dep.dependentes.join(', ')}</span>
                    </div>
                `;
            });
            
            // Adicionar botão para selecionar dependentes automaticamente
            if (tabelasFaltantes.size > 0) {
                avisosHtml += `
                    <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #f59e0b;">
                        <button onclick="selecionarDependentes(${JSON.stringify(Array.from(tabelasFaltantes)).replace(/"/g, '&quot;')})" 
                                style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px;"
                                data-testid="button-selecionar-dependentes">
                            <i class="fas fa-magic"></i> Selecionar Tabelas Relacionadas (${tabelasFaltantes.size})
                        </button>
                        <div style="font-size: 11px; color: #6b7280; margin-top: 5px;">
                            Clique para selecionar automaticamente: ${Array.from(tabelasFaltantes).join(', ')}
                        </div>
                    </div>
                `;
            }
            
            avisosHtml += `
                    </div>
                </div>
            `;
            
            // Desabilitar botão para seleções inseguras
            btnConfirmar.disabled = true;
            btnConfirmar.style.opacity = '0.5';
        }
        
        avisosDiv.innerHTML = avisosHtml;
        avisosDiv.style.display = 'block';
        
    } catch (error) {
        console.error('Erro ao validar seleção:', error);
    }
}

// Selecionar automaticamente tabelas dependentes
function selecionarDependentes(tabelasFaltantes) {
    // Adicionar todas as tabelas faltantes à seleção
    tabelasFaltantes.forEach(tabela => {
        tabelasSelecionadas.add(tabela);
    });
    
    // Re-renderizar modal para atualizar checkboxes
    renderizarModalLimpeza(document.getElementById('conteudo-modal-limpeza'));
    
    // Atualizar contador
    document.getElementById('contador-selecionados').textContent = 
        `${tabelasSelecionadas.size} tabela(s) selecionada(s)`;
    
    // Revalidar
    validarSelecaoAtual();
    
    console.log(`✅ Selecionadas ${tabelasFaltantes.length} tabelas dependentes automaticamente`);
}

// Fechar modal de limpeza
function fecharModalLimpeza() {
    document.getElementById('modal-limpeza').style.display = 'none';
    tabelasSelecionadas.clear();
    validacaoAtual = null;
}

// Executar limpeza das tabelas selecionadas
async function executarLimpeza() {
    try {
        if (tabelasSelecionadas.size === 0) {
            mostrarMensagem('Selecione ao menos uma tabela para limpar', 'error');
            return;
        }
        
        if (!validacaoAtual || !validacaoAtual.seguro) {
            mostrarMensagem('A seleção atual não é segura. Verifique os avisos de dependências.', 'error');
            return;
        }
        
        const listTabelas = Array.from(tabelasSelecionadas);
        
        // ===== LÓGICA ESPECIAL PARA EMPRESAS =====
        // Se "empresas" está selecionada, processar primeiro com modo especial
        if (listTabelas.includes('empresas')) {
            const outrasTabs = listTabelas.filter(t => t !== 'empresas');
            
            if (outrasTabs.length > 0) {
                // Tem empresas + outras tabelas
                const resposta = confirm(
                    `📋 PROCESSAMENTO EM DUAS ETAPAS\n\n` +
                    `Você selecionou "empresas" junto com outras tabelas.\n\n` +
                    `O sistema irá processar em duas etapas:\n\n` +
                    `1️⃣ PRIMEIRO: Deletar empresas (modo especial que preserva dados mestres)\n` +
                    `2️⃣ DEPOIS: Processar as demais ${outrasTabs.length} tabela(s): ${outrasTabs.join(', ')}\n\n` +
                    `Clique OK para continuar com o processamento em duas etapas, ou Cancelar para abortar:`
                );
                
                if (!resposta) {
                    mostrarMensagem('Operação cancelada', 'info');
                    return;
                }
                
                // ETAPA 1: Deletar empresas com modo especial
                console.log('📍 ETAPA 1/2: Deletando empresas (modo especial)...');
                const resultadoEtapa1 = await deletarEmpresasPreservandoMestres();
                
                // ===== GATE STAGE 2: Only proceed if stage 1 succeeded =====
                if (resultadoEtapa1.status !== "success") {
                    const motivo = resultadoEtapa1.status === "cancelled" ? "cancelada" : "falhou";
                    mostrarMensagem(
                        `⚠️ Etapa 1 ${motivo}. Etapa 2 não será executada.\n\n` +
                        `Motivo: ${resultadoEtapa1.message || 'Desconhecido'}`,
                        'info'
                    );
                    return;
                }
                
                console.log(`✅ Etapa 1 concluída: ${resultadoEtapa1.message}`);
                
                // ETAPA 2: Processar demais tabelas normalmente
                console.log('📍 ETAPA 2/2: Processando demais tabelas...');
                
                // Continuar para processar as outras tabelas abaixo
                // (não dar return aqui, deixar o código continuar)
                
                // Remover 'empresas' da lista para processar só as demais
                const tabelasRestantes = outrasTabs;
                
                // Confirmação para as tabelas restantes
                const confirmacaoRestantes = prompt(
                    `ETAPA 2/2 - CONFIRMAÇÃO FINAL:\n\n` +
                    `Você está prestes a DELETAR PERMANENTEMENTE todos os dados de ${tabelasRestantes.length} tabela(s):\n\n` +
                    `${tabelasRestantes.join(', ')}\n\n` +
                    `Digite "CONFIRMAR" (em maiúsculas) para continuar:`
                );
                
                if (confirmacaoRestantes !== 'CONFIRMAR') {
                    mostrarMensagem('Etapa 2 cancelada. Empresas já foram processadas.', 'info');
                    fecharModalLimpeza();
                    carregarTabelasStatus();
                    return;
                }
                
                // Processar tabelas restantes
                await processarLimpezaTabelas(tabelasRestantes);
                return;
                
            } else {
                // Só empresas selecionada, sem outras tabelas
                await deletarEmpresasPreservandoMestres();
                return;
            }
        }
        
        // Confirmação final (para tabelas normais, sem empresas)
        const confirmacao = prompt(
            `CONFIRMAÇÃO FINAL:\n\nVocê está prestes a DELETAR PERMANENTEMENTE todos os dados de ${listTabelas.length} tabela(s):\n\n${listTabelas.join(', ')}\n\nDigite "CONFIRMAR" (em maiúsculas) para continuar:`
        );
        
        if (confirmacao !== 'CONFIRMAR') {
            mostrarMensagem('Limpeza cancelada', 'info');
            return;
        }
        
        // Executar limpeza ATOMICAMENTE com a nova API
        try {
            const response = await fetch('/api/admin/cleanup/execute?confirmar=true', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tabelas_selecionadas: Array.from(tabelasSelecionadas)
                })
            });
            
            if (!response.ok) {
                let errorMsg = 'Erro desconhecido';
                try {
                    const error = await response.json();
                    errorMsg = error.detail || JSON.stringify(error);
                } catch {
                    errorMsg = `Erro HTTP ${response.status}`;
                }
                throw new Error(errorMsg);
            }
            
            const resultado = await response.json();
            
            // Montar mensagem detalhada
            let mensagem = `✅ LIMPEZA CONCLUÍDA COM SUCESSO!\n\n`;
            mensagem += `📊 RESUMO DA OPERAÇÃO:\n`;
            mensagem += `• Total de registros removidos: ${resultado.total_registros_removidos}\n`;
            mensagem += `• Tabelas processadas: ${resultado.tabelas_limpas.length}\n`;
            
            if (resultado.tabelas_auto_adicionadas && resultado.tabelas_auto_adicionadas.length > 0) {
                mensagem += `\n🔧 Tabelas técnicas incluídas automaticamente:\n`;
                resultado.tabelas_auto_adicionadas.forEach(t => mensagem += `  • ${t}\n`);
            }
            
            mensagem += `\n📋 Detalhes:\n`;
            resultado.tabelas_limpas.forEach(t => {
                mensagem += `  • ${t.tabela}: ${t.registros} registros\n`;
            });
            
            alert(mensagem);
            console.log('✅ Limpeza executada com sucesso:', resultado);
            
        } catch (error) {
            throw error;  // Re-throw para catch externo
        }
        
        // Fechar modal e recarregar lista
        fecharModalLimpeza();
        await carregarTabelasStatus();
        
    } catch (error) {
        console.error('Erro ao executar limpeza:', error);
        mostrarMensagem(`Erro ao executar limpeza: ${error.message}`, 'error');
    }
}

// Confirmar limpeza de tabela individual
// MODIFICADO: Agora abre o modal de limpeza com validação de dependências
async function confirmarLimpezaTabela(nomeTabela) {
    // Abrir modal de limpeza com a tabela pré-selecionada
    // O modal irá verificar dependências e mostrar avisos apropriados
    await abrirModalLimpeza(nomeTabela);
    console.log(`📋 Modal de limpeza aberto para tabela: ${nomeTabela}`);
}

// Função auxiliar para processar limpeza de múltiplas tabelas
async function processarLimpezaTabelas(tabelas) {
    try {
        const resultados = {
            sucesso: [],
            erros: []
        };
        
        for (const tabela of tabelas) {
            try {
                const response = await fetch(`/api/admin/cleanup/table/${tabela}`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Erro desconhecido');
                }
                
                const resultado = await response.json();
                resultados.sucesso.push(`${tabela}: ${resultado.registros_removidos} registros removidos`);
                console.log(`✅ ${tabela} limpa com sucesso`);
                
            } catch (error) {
                resultados.erros.push(`${tabela}: ${error.message}`);
                console.error(`❌ Erro ao limpar ${tabela}:`, error);
            }
        }
        
        // Mostrar resumo
        let mensagem = '📊 RESULTADO DA LIMPEZA\n\n';
        
        if (resultados.sucesso.length > 0) {
            mensagem += `✅ SUCESSO (${resultados.sucesso.length} tabelas):\n`;
            resultados.sucesso.forEach(msg => mensagem += `  • ${msg}\n`);
        }
        
        if (resultados.erros.length > 0) {
            mensagem += `\n❌ ERROS (${resultados.erros.length}):\n`;
            resultados.erros.forEach(msg => mensagem += `  • ${msg}\n`);
        }
        
        alert(mensagem);
        fecharModalLimpeza();
        await carregarTabelasStatus();
        
    } catch (error) {
        console.error('Erro ao processar limpeza:', error);
        mostrarMensagem(`Erro ao processar limpeza: ${error.message}`, 'error');
    }
}

// Função especial para deletar empresas preservando dados mestres
// Retorna: {status: "success" | "cancelled" | "error", message?: string, data?: any}
async function deletarEmpresasPreservandoMestres() {
    try {
        // Buscar todas as empresas
        const response = await fetch('/api/empresas');
        if (!response.ok) {
            throw new Error('Erro ao buscar empresas');
        }
        
        const empresas = await response.json();
        
        if (!empresas || empresas.length === 0) {
            mostrarMensagem('Não há empresas cadastradas para deletar', 'info');
            fecharModalLimpeza();
            return {status: "cancelled", message: "Nenhuma empresa cadastrada"};
        }
        
        // Criar mensagem de confirmação com lista de empresas
        let mensagem = `🏢 DELETAR EMPRESAS - MODO ESPECIAL\n\n`;
        mensagem += `Este modo de deleção irá:\n`;
        mensagem += `✅ PRESERVAR dados mestres (categorias, produtos, clientes, fornecedores, contas)\n`;
        mensagem += `❌ DELETAR dados transacionais (transações, planejamento, orçamento)\n`;
        mensagem += `❌ DELETAR dados específicos (CNPJs, impostos, usuários)\n\n`;
        mensagem += `Empresas cadastradas:\n\n`;
        
        empresas.forEach((emp, idx) => {
            mensagem += `${idx + 1}. ${emp.nome} (ID: ${emp.id})\n`;
        });
        
        mensagem += `\n Digite os NÚMEROS das empresas que deseja deletar (separados por vírgula).\n`;
        mensagem += `Exemplo: 1,2 (para deletar empresas 1 e 2)\n`;
        mensagem += `Ou digite "TODAS" para deletar todas as empresas:\n`;
        
        const selecao = prompt(mensagem);
        
        if (!selecao) {
            mostrarMensagem('Operação cancelada', 'info');
            fecharModalLimpeza();
            return {status: "cancelled", message: "Usuário cancelou seleção de empresas"};
        }
        
        let empresasParaDeletar = [];
        
        if (selecao.toUpperCase() === 'TODAS') {
            empresasParaDeletar = empresas;
        } else {
            const numeros = selecao.split(',').map(n => parseInt(n.trim()));
            empresasParaDeletar = numeros
                .filter(num => num >= 1 && num <= empresas.length)
                .map(num => empresas[num - 1]);
        }
        
        if (empresasParaDeletar.length === 0) {
            mostrarMensagem('Nenhuma empresa válida selecionada', 'error');
            fecharModalLimpeza();
            return {status: "cancelled", message: "Seleção inválida"};
        }
        
        // Confirmação final
        const nomes = empresasParaDeletar.map(e => e.nome).join(', ');
        const confirmacao = prompt(
            `⚠️ CONFIRMAÇÃO FINAL\n\nVocê está prestes a deletar ${empresasParaDeletar.length} empresa(s):\n\n${nomes}\n\n` +
            `ATENÇÃO: Dados mestres serão preservados, mas dados transacionais serão DELETADOS PERMANENTEMENTE!\n\n` +
            `Digite "CONFIRMAR" (em maiúsculas) para continuar:`
        );
        
        if (confirmacao !== 'CONFIRMAR') {
            mostrarMensagem('Operação cancelada', 'info');
            fecharModalLimpeza();
            return {status: "cancelled", message: "Usuário não confirmou deleção"};
        }
        
        // Executar deleção empresa por empresa
        const resultados = {
            sucesso: [],
            erros: []
        };
        
        for (const empresa of empresasParaDeletar) {
            try {
                const deleteResponse = await fetch(`/api/admin/empresa/${empresa.id}?confirmar=true`, {
                    method: 'POST'
                });
                
                if (!deleteResponse.ok) {
                    const error = await deleteResponse.json();
                    throw new Error(error.detail || 'Erro desconhecido');
                }
                
                const resultado = await deleteResponse.json();
                resultados.sucesso.push({
                    nome: empresa.nome,
                    resultado: resultado
                });
                console.log(`✅ Empresa ${empresa.nome} deletada com sucesso`, resultado);
                
            } catch (error) {
                resultados.erros.push({
                    nome: empresa.nome,
                    erro: error.message
                });
                console.error(`❌ Erro ao deletar empresa ${empresa.nome}:`, error);
            }
        }
        
        // Mostrar resumo dos resultados
        let mensagemResultado = `🎯 RESULTADO DA OPERAÇÃO\n\n`;
        
        if (resultados.sucesso.length > 0) {
            mensagemResultado += `✅ SUCESSO (${resultados.sucesso.length} empresas):\n`;
            resultados.sucesso.forEach(r => {
                const mestres = Object.keys(r.resultado.dados_mestres_preservados || {}).length;
                const trans = Object.keys(r.resultado.dados_transacionais_deletados || {}).length;
                mensagemResultado += `  • ${r.nome}: ${mestres} tipos de dados mestres preservados, ${trans} tipos transacionais deletados\n`;
            });
        }
        
        if (resultados.erros.length > 0) {
            mensagemResultado += `\n❌ ERROS (${resultados.erros.length}):\n`;
            resultados.erros.forEach(r => {
                mensagemResultado += `  • ${r.nome}: ${r.erro}\n`;
            });
        }
        
        alert(mensagemResultado);
        
        // Fechar modal e recarregar tabela
        fecharModalLimpeza();
        await carregarTabelasStatus();
        
        // Verificar se houve erros (parcial ou total)
        if (resultados.erros.length > 0) {
            // Partial ou total failure = ALL-OR-NOTHING semantics violated
            return {
                status: "error",
                message: `${resultados.erros.length} empresas falharam ao deletar`,
                data: resultados
            };
        }
        
        // Sucesso total
        return {
            status: "success",
            message: `${resultados.sucesso.length} empresas deletadas com sucesso`,
            data: resultados
        };
        
    } catch (error) {
        console.error('Erro ao deletar empresas:', error);
        mostrarMensagem(`Erro ao deletar empresas: ${error.message}`, 'error');
        fecharModalLimpeza();
        return {status: "error", message: error.message};
    }
}

// Função auxiliar para mostrar mensagens
function mostrarMensagem(mensagem, tipo = 'info') {
    // Usar alert simples por enquanto, pode ser melhorado com toasts
    if (tipo === 'error') {
        alert('❌ ' + mensagem);
    } else if (tipo === 'success') {
        alert('✅ ' + mensagem);
    } else {
        alert('ℹ️ ' + mensagem);
    }
}

// 🔴 LIMPEZA COMPLETA DO BANCO DE DADOS (Exceto Usuários)
async function resetarBancoDadosCompleto() {
    try {
        // Confirmação 1: Avisar que é operação irreversível
        const aviso1 = confirm(
            `⚠️ OPERAÇÃO CRÍTICA\n\n` +
            `Você está prestes a DELETAR PERMANENTEMENTE todos os dados do banco de dados,\n` +
            `EXCETO a tabela de usuários.\n\n` +
            `Esta operação:\n` +
            `  • É IRREVERSÍVEL\n` +
            `  • Não pode ser desfeita\n` +
            `  • Vai limpar TODAS as empresas, clientes, transações e registros\n\n` +
            `Tem certeza que deseja continuar?`
        );
        
        if (!aviso1) {
            mostrarMensagem('Operação cancelada', 'info');
            return;
        }
        
        // Confirmação 2: Pedir confirmação por escrito
        const confirmacao = prompt(
            `CONFIRMAÇÃO FINAL:\n\n` +
            `Digite "DELETAR TUDO" (em maiúsculas) para confirmar a limpeza completa do banco:\n\n` +
            `⚠️ AVISO: Todos os dados serão perdidos permanentemente!`
        );
        
        if (confirmacao !== 'DELETAR TUDO') {
            mostrarMensagem('Operação cancelada', 'info');
            return;
        }
        
        // Mostrar status de processamento
        console.log('🔴 INICIANDO LIMPEZA COMPLETA DO BANCO DE DADOS...');
        alert('⏳ Limpeza em andamento... Aguarde (esta operação pode levar alguns segundos)');
        
        // Executar limpeza via API
        const response = await fetch('/api/admin/cleanup/reset-database?confirmar=true', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            let errorMsg = 'Erro desconhecido';
            try {
                const error = await response.json();
                errorMsg = error.detail || JSON.stringify(error);
            } catch {
                errorMsg = `Erro HTTP ${response.status}`;
            }
            throw new Error(errorMsg);
        }
        
        const resultado = await response.json();
        
        // Montar mensagem detalhada de sucesso
        let mensagemSucesso = `✅ LIMPEZA COMPLETA CONCLUÍDA COM SUCESSO!\n\n`;
        mensagemSucesso += `📊 RESUMO DA OPERAÇÃO:\n`;
        mensagemSucesso += `• Total de registros deletados: ${resultado.total_registros_deletados}\n`;
        mensagemSucesso += `• Tabelas processadas: ${resultado.tabelas_processadas}\n\n`;
        mensagemSucesso += `📋 DETALHES POR TABELA:\n`;
        
        resultado.tabelas_deletadas.forEach(tabela => {
            if (tabela.registros > 0) {
                mensagemSucesso += `  • ${tabela.tabela}: ${tabela.registros} registros deletados\n`;
            }
        });
        
        mensagemSucesso += `\n✅ Banco de dados limpo com sucesso!\n`;
        mensagemSucesso += `⚠️ A tabela 'users' foi preservada intacta.`;
        
        alert(mensagemSucesso);
        console.log('✅ Limpeza completa concluída:', resultado);
        
        // Recarregar tabela de status
        await carregarTabelasStatus();
        
    } catch (error) {
        console.error('❌ Erro ao executar limpeza completa:', error);
        mostrarMensagem(`Erro ao executar limpeza: ${error.message}`, 'error');
    }
}
