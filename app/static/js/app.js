// Bennu Finance - JavaScript Principal
class BennuFinance {
    constructor() {
        this.apiBase = '/api';
        this.init();
    }

    init() {
        // Configurar interceptador de fetch para incluir credenciais
        this.setupFetchInterceptor();
        
        // Verificar autenticação apenas se não estiver na página de login
        if (window.location.pathname !== '/login') {
            this.checkAuth();
        }
    }

    setupFetchInterceptor() {
        // Salvar fetch original com contexto correto
        const originalFetch = window.fetch.bind(window);
        
        // Override fetch para incluir credenciais
        window.fetch = (...args) => {
            if (args[0].startsWith('/api')) {
                const options = args[1] || {};
                options.credentials = 'include';
                options.headers = {
                    'Content-Type': 'application/json',
                    ...options.headers
                };
                args[1] = options;
            }
            return originalFetch(...args);
        };
    }

    async checkAuth() {
        // Evitar múltiplas verificações simultâneas
        if (this.authChecking) {
            return false;
        }
        this.authChecking = true;
        
        try {
            const response = await fetch('/api/auth/user');
            if (!response.ok) {
                // Aguardar um pouco antes de redirecionar para evitar loops
                setTimeout(() => {
                    if (window.location.pathname !== '/login') {
                        console.log('Usuário não autenticado, redirecionando para login...');
                        window.location.replace('/login');
                    }
                }, 500);
                return false;
            }
            this.authChecking = false;
            return true;
        } catch (error) {
            console.error('Erro ao verificar autenticação:', error);
            // Em caso de erro, aguardar antes de redirecionar
            setTimeout(() => {
                if (window.location.pathname !== '/login') {
                    console.log('Erro de autenticação, redirecionando para login...');
                    window.location.replace('/login');
                }
            }, 1000);
            this.authChecking = false;
            return false;
        }
    }

    async apiRequest(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.apiBase}${endpoint}`, options);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            
            return await response.text();
        } catch (error) {
            console.error(`Erro na API ${endpoint}:`, error);
            throw error;
        }
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    formatDate(date) {
        if (!date) return '';
        var str = String(date).substring(0, 10);
        var parts = str.split('-');
        if (parts.length === 3) {
            return parts[2] + '/' + parts[1] + '/' + parts[0];
        }
        return str;
    }

    showNotification(message, type = 'info') {
        // Garantir que a mensagem seja uma string (evita [object Object])
        let displayMessage = message;
        if (typeof message === 'object') {
            displayMessage = message.detail || message.message || message.error || JSON.stringify(message);
        }
        
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${displayMessage}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // Adicionar ao body
        document.body.appendChild(notification);

        // Remover automaticamente após 5 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

// Instanciar aplicação
const app = new BennuFinance();

// Funções globais para modais
function novaTransacao() {
    const modal = document.getElementById('modal-nova-transacao');
    if (modal) {
        modal.style.display = 'block';
        
        // Definir data padrão como hoje
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('data').value = today;
    }
}

function fecharModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Exportar para uso global
window.BennuFinance = BennuFinance;
window.app = app;