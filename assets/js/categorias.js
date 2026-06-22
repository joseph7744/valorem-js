const API_CATEGORIAS = 'http://localhost:3000/api/categorias';
let categorias = [];
let toastTimeoutId = null;

/**
 * Injeta dinamicamente o container de Toast no DOM para blindar contra elemento nulo.
 */
function ensureToastContainer() {
    let toast = document.getElementById('globalToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'globalToast';
        toast.className = 'toast-container';
        toast.innerHTML = `
            <div class="toast-content">
                <span id="globalToastText"></span>
                <button type="button" class="toast-close" aria-label="Fechar">×</button>
            </div>
        `;
        document.body.appendChild(toast);
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.remove('show');
        });
    }
    return toast;
}

function mostrarToast(mensagem, isError = false) {
    const toast = ensureToastContainer();
    toast.classList.toggle('error', isError);
    document.getElementById('globalToastText').textContent = mensagem;
    toast.classList.add('show');

    if (toastTimeoutId) {
        clearTimeout(toastTimeoutId);
    }
    toastTimeoutId = setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

/**
 * Modal de confirmação reativo usando Toast ao invés de alert() nativo.
 * Retorna Promise que resolve com true/false.
 */
function mostrarConfirmacao(mensagem) {
    return new Promise((resolve) => {
        // Cria overlay e modal customizados
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        const modal = document.createElement('div');
        modal.className = 'confirm-modal';
        modal.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 24px;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            font-family: Inter, sans-serif;
        `;

        const title = document.createElement('h3');
        title.textContent = 'Confirmação';
        title.style.cssText = 'margin: 0 0 12px 0; font-size: 18px; color: #1e293b;';

        const message = document.createElement('p');
        message.textContent = mensagem;
        message.style.cssText = 'margin: 0 0 20px 0; color: #64748b; font-size: 14px;';

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 12px; justify-content: flex-end;';

        const btnCancel = document.createElement('button');
        btnCancel.textContent = 'Cancelar';
        btnCancel.style.cssText = `
            padding: 8px 16px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            background: white;
            color: #64748b;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        `;
        btnCancel.addEventListener('click', () => {
            overlay.remove();
            resolve(false);
        });

        const btnConfirm = document.createElement('button');
        btnConfirm.textContent = 'Confirmar';
        btnConfirm.style.cssText = `
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            background: #ef4444;
            color: white;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        `;
        btnConfirm.addEventListener('click', () => {
            overlay.remove();
            resolve(true);
        });

        buttonContainer.appendChild(btnCancel);
        buttonContainer.appendChild(btnConfirm);

        modal.appendChild(title);
        modal.appendChild(message);
        modal.appendChild(buttonContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    });
}

window.addEventListener('load', async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        window.location.href = '../index.html';
        return;
    }
    
    await carregarCategorias();
    renderizarCategorias();
    lucide.createIcons();
});

async function logout() {
    const confirmou = await mostrarConfirmacao('Deseja sair da sua conta?');
    if (!confirmou) return;

    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    window.location.href = '../index.html';
}

/**
 * Carrega categorias da API com header obrigatório 'x-user-id'
 * para eliminar falhas '401 Unauthorized'.
 */
async function carregarCategorias() {
    try {
        const userId = localStorage.getItem('userId');
        // Header obrigatório 'x-user-id' para autenticação no servidor
        const headers = userId ? { 'x-user-id': userId } : {};
        const res = await fetch(API_CATEGORIAS, { headers });
        if (!res.ok) {
            if (res.status === 401) {
                throw new Error('Não autorizado. Faça login novamente.');
            }
            throw new Error('Falha ao buscar categorias');
        }
        categorias = await res.json();
    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        mostrarToast('Erro ao carregar categorias: ' + error.message, true);
    }
}

function renderizarCategorias() {
    const lista = document.getElementById('listaCategorias');
    
    if (!categorias || categorias.length === 0) {
        lista.innerHTML = '<p style="color: var(--text-muted);">Nenhuma categoria registrada.</p>';
        return;
    }
    
    lista.innerHTML = categorias.map(categoria => `
        <div class="category-item">
            <strong>${categoria.nome}</strong>
            <button onclick="removerCategoria(${categoria.id_categoria})">Remover</button>
        </div>
    `).join('');
}

async function adicionarCategoria() {
    const userId = localStorage.getItem('userId');
    const input = document.getElementById('novaCategoria');
    const valor = input.value.trim();
    
    if (!valor) {
        mostrarToast('Digite o nome de uma categoria.', true);
        return;
    }

    try {
        const res = await fetch(API_CATEGORIAS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId
            },
            body: JSON.stringify({ nome: valor })
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Erro ao adicionar categoria');
        }

        const novaCategoria = await res.json();
        categorias.push(novaCategoria);
        input.value = '';
        renderizarCategorias();
        mostrarToast('Categoria adicionada com sucesso!');
    } catch (error) {
        console.error('Erro ao adicionar categoria:', error);
        mostrarToast('Erro: ' + error.message, true);
    }
}

/**
 * Remove categoria com confirmação reativa (Toast ao invés de alert nativo).
 */
async function removerCategoria(idCategoria) {
    const userId = localStorage.getItem('userId');
    
    // Usa confirmação reativa ao invés de alert() nativo
    const confirmou = await mostrarConfirmacao('Deseja remover esta categoria?');
    if (!confirmou) {
        return;
    }

    try {
        const res = await fetch(`${API_CATEGORIAS}/${idCategoria}`, {
            method: 'DELETE',
            headers: { 'x-user-id': userId }
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Erro ao remover categoria');
        }

        categorias = categorias.filter(c => c.id_categoria !== idCategoria);
        renderizarCategorias();
        mostrarToast('Categoria removida com sucesso!');
    } catch (error) {
        console.error('Erro ao remover categoria:', error);
        mostrarToast('Erro: ' + error.message, true);
    }
}
