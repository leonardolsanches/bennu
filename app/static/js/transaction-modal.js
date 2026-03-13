// Funções compartilhadas para modal de edição de transações
// Utilizado tanto no dashboard quanto na página de transações

// Modal de edição de transação
window.openEditModal = function(transacao) {
    // Criar modal se não existir
    let modal = document.getElementById('edit-transaction-modal');
    if (!modal) {
        modal = window.createEditModal();
        document.body.appendChild(modal);

        // Configurar event listeners - Compatibilidade Chrome 140+
        setupTransactionModalListeners(modal);
    }

    // Preencher dados no modal
    window.populateEditModal(transacao);

    // Mostrar modal
    modal.style.display = 'flex';
};

window.createEditModal = function() {
    const modal = document.createElement('div');
    modal.id = 'edit-transaction-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Editar Transação</h3>
                <button type="button" class="close-modal" data-action="close">&times;</button>
            </div>
            <form id="edit-transaction-form">
                <div class="modal-body">
                    <input type="hidden" id="edit-id" name="id">

                    <div class="form-group">
                        <label for="edit-tipo">Tipo *</label>
                        <select id="edit-tipo" name="tipo" required>
                            <option value="receita">Receita</option>
                            <option value="despesa">Despesa</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="edit-descricao">Descrição *</label>
                        <input type="text" id="edit-descricao" name="descricao" required>
                    </div>

                    <div class="form-group">
                        <label for="edit-valor">Valor *</label>
                        <input type="number" id="edit-valor" name="valor" step="0.01" required>
                    </div>

                    <div class="form-group">
                        <label for="edit-data-lancamento">Data *</label>
                        <input type="date" id="edit-data-lancamento" name="data_lancamento" required>
                    </div>

                    <div class="form-group">
                        <label for="edit-cliente-fornecedor">Cliente/Fornecedor</label>
                        <input type="text" id="edit-cliente-fornecedor" name="cliente_fornecedor">
                    </div>

                    <div class="form-group">
                        <label for="edit-forma-pagamento">Forma Pagamento</label>
                        <select id="edit-forma-pagamento" name="forma_pagamento">
                            <option value="">Selecione...</option>
                            <option value="dinheiro">Dinheiro</option>
                            <option value="pix">PIX</option>
                            <option value="cartao_credito">Cartão Crédito</option>
                            <option value="cartao_debito">Cartão Débito</option>
                            <option value="transferencia">Transferência</option>
                            <option value="boleto">Boleto</option>
                        </select>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-action="close">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar</button>
                </div>
            </form>
        </div>
    `;
    return modal;
};

window.populateEditModal = function(transacao) {
    document.getElementById('edit-id').value = transacao.id;
    document.getElementById('edit-tipo').value = transacao.tipo;
    document.getElementById('edit-descricao').value = transacao.descricao || '';
    document.getElementById('edit-valor').value = Math.abs(transacao.valor) || '';

    // Formatar data para input date
    if (transacao.data_lancamento) {
        document.getElementById('edit-data-lancamento').value = transacao.data_lancamento.substring(0, 10);
    }

    document.getElementById('edit-cliente-fornecedor').value = transacao.cliente_fornecedor || '';
    document.getElementById('edit-forma-pagamento').value = transacao.forma_pagamento || '';
};

window.closeEditModal = function() {
    const modal = document.getElementById('edit-transaction-modal');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.saveTransaction = async function(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const id = formData.get('id');

    // Construir objeto da transação
    const transacao = {
        tipo: formData.get('tipo'),
        descricao: formData.get('descricao'),
        valor: parseFloat(formData.get('valor')),
        data_lancamento: formData.get('data_lancamento'),
        cliente_fornecedor: formData.get('cliente_fornecedor'),
        forma_pagamento: formData.get('forma_pagamento')
    };

    try {
        const response = await fetch(`/api/transacoes/${id}`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(transacao)
        });

        if (!response.ok) {
            throw new Error('Erro ao salvar transação');
        }

        // Fechar modal
        closeEditModal();

        // Recarregar lista de transações dependendo da página atual
        if (window.transacoesPage) {
            await window.transacoesPage.loadTransacoes(window.transacoesPage.pagination.page);
        }

        // Se estivermos no dashboard, recarregar os dados do dashboard  
        if (window.dashboard) {
            // Recarregar dados usando métodos atualizados
            await Promise.all([
                window.dashboard.loadSummaryData(),
                window.dashboard.loadTransactionsData()
            ]);
            window.dashboard.updateCards();
            window.dashboard.loadRecentTransactions();
        }

        // Mostrar notificação de sucesso
        if (window.app && window.app.showNotification) {
            window.app.showNotification('■ Transação atualizada com sucesso!', 'success');
        } else {
            alert('Transação atualizada com sucesso!');
        }

    } catch (error) {
        console.error('❌ Erro ao salvar transação:', error);
        if (window.app && window.app.showNotification) {
            window.app.showNotification('❌ Erro ao salvar transação', 'error');
        } else {
            alert('Erro ao salvar transação');
        }
    }
};

// Função compartilhada para excluir transações
window.excluirTransacao = async function(id) {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

    try {
        const response = await fetch(`/api/transacoes/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            // 🚀 OTIMIZAÇÃO: Invalidar cache global para forçar recarregamento
            if (window.dashboardAllTransactions) {
                window.dashboardAllTransactions = null;
                console.log('🗑️ Cache global invalidado após exclusão');
            }

            // Recarregar dados da página de transações
            if (window.transacoesPage) {
                await window.transacoesPage.loadTransacoes(window.transacoesPage.pagination.page);
            }

            // 🚀 OTIMIZAÇÃO: Recarregar dashboard de forma mais eficiente
            if (window.dashboard) {
                // Invalidar cache e forçar recarga completa
                window.dashboard.allTransactionsLoaded = false;
                await Promise.all([
                    window.dashboard.loadSummaryData(),
                    window.dashboard.loadTransactionsData()
                ]);
                window.dashboard.updateCards();
                window.dashboard.loadRecentTransactions();
            }

            // 🚀 CORREÇÃO: Recarregar dados da página de categorização
            if (typeof loadSummaryCards === 'function' && typeof loadAllTransactionsData === 'function') {
                console.log('🔄 Recarregando dados da página categorizar após exclusão...');
                try {
                    // Recarregar cards de resumo
                    await loadSummaryCards();

                    // Recarregar dados das transações
                    await loadAllTransactionsData();

                    // Recarregar gráficos da aba atual se disponível
                    if (typeof loadChartsForTab === 'function' && window.currentTab) {
                        await loadChartsForTab(window.currentTab);
                    }

                    console.log('✅ Dados da categorização recarregados com sucesso!');
                } catch (error) {
                    console.error('❌ Erro ao recarregar dados da categorização:', error);
                }
            }

            if (window.app && window.app.showNotification) {
                window.app.showNotification('■ Transação excluída com sucesso!', 'success');
            } else {
                alert('Transação excluída com sucesso!');
            }
        } else {
            if (window.app && window.app.showNotification) {
                window.app.showNotification('❌ Erro ao excluir transação', 'error');
            } else {
                alert('Erro ao excluir transação');
            }
        }
    } catch (error) {
        console.error('Erro ao excluir transação:', error);
        if (window.app && window.app.showNotification) {
            window.app.showNotification('❌ Erro ao excluir transação', 'error');
        } else {
            alert('Erro ao excluir transação');
        }
    }
};

// Configurar event listeners para modal de transação - Compatibilidade Chrome 140+
function setupTransactionModalListeners(modal) {
    // Event delegation para botões do modal
    modal.addEventListener('click', (e) => {
        if (e.target.dataset.action === 'close' || e.target.classList.contains('close-modal')) {
            window.closeEditModal();
        }
    });

    // Event listener para o formulário
    const form = modal.querySelector('#edit-transaction-form');
    if (form) {
        form.addEventListener('submit', window.saveTransaction);
    }

    // Fechar modal ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            window.closeEditModal();
        }
    });
}