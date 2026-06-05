const API_CATEGORIAS = 'http://localhost:3000/api/categorias';
let categorias = [];
let toastTimeoutId = null;

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
        toast.querySelector('.toast-close').addEventListener('click', () => toast.classList.remove('show'));
    }
    return toast;
}

function mostrarToast(mensagem, isError = false) {
    const toast = ensureToastContainer();
    toast.classList.toggle('error', isError);
    toast.querySelector('#globalToastText').textContent = mensagem;
    toast.classList.add('show');

    if (toastTimeoutId) {
        clearTimeout(toastTimeoutId);
    }
    toastTimeoutId = setTimeout(() => toast.classList.remove('show'), 3500);
}

window.addEventListener('load', async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        window.location.href = 'login.html';
        return;
    }
    
    await carregarCategorias();
    renderizarCategorias();
    lucide.createIcons();
});

function logout() {
    if (confirm('Deseja sair da sua conta?')) {
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        window.location.href = 'login.html';
    }
}

async function carregarCategorias() {
    try {
        const userId = localStorage.getItem('userId');
        const headers = userId ? { 'x-user-id': userId } : {};
        const res = await fetch(API_CATEGORIAS, { headers });
        if (!res.ok) throw new Error('Falha ao buscar categorias');
        categorias = await res.json();
    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        mostrarToast('Erro ao carregar categorias', true);
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
        mostrarToast('Erro: ' + error.message, true);
    }
}

async function removerCategoria(idCategoria) {
    const userId = localStorage.getItem('userId');
    
    if (!confirm('Deseja remover esta categoria?')) {
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
        mostrarToast('Erro: ' + error.message, true);
    }
}
