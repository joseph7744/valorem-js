const API_URL = 'http://localhost:3000/api/transacoes';
const API_CATEGORIAS = 'http://localhost:3000/api/categorias';
let categorias = [];

window.addEventListener('load', async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        window.location.href = 'login.html';
        return;
    }

    await carregarCategorias();
    popularSelectCategoria();

    const dadosEdicao = localStorage.getItem('editarTransacao');
    if (dadosEdicao) {
        const transacao = JSON.parse(dadosEdicao);
        document.getElementById('despesaId').value = transacao.id;
        document.getElementById('descricao').value = transacao.descricao;
        document.getElementById('valor').value = transacao.valor;
        document.getElementById('data').value = sanitizeDateString(transacao.data);
        document.getElementById('tipo').value = transacao.tipo;
        document.getElementById('categoria').value = transacao.id_categoria;
        document.getElementById('pageSubtitle').textContent = 'Editar Transação';
        localStorage.removeItem('editarTransacao');
    }

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

function sanitizeDateString(value) {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

async function carregarCategorias() {
    try {
        const userId = localStorage.getItem('userId');
        const res = await fetch(API_CATEGORIAS, { headers: userId ? { 'x-user-id': userId } : {} });
        if (!res.ok) throw new Error('Erro ao buscar categorias');
        categorias = await res.json();
    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        mostrarToast('Erro ao carregar categorias', true);
    }
}

function popularSelectCategoria() {
    const select = document.getElementById('categoria');
    select.innerHTML = `
        <option value="" disabled selected>Selecione uma categoria</option>
    ` + categorias.map(c => `
        <option value="${c.id_categoria}">${c.nome}</option>
    `).join('');
}

async function salvar() {
    const userId = localStorage.getItem('userId');
    const id = document.getElementById('despesaId').value;
    const desc = document.getElementById('descricao').value.trim();
    const val = document.getElementById('valor').value;
    const data = sanitizeDateString(document.getElementById('data').value);
    const tipo = document.getElementById('tipo').value;
    const idCategoria = document.getElementById('categoria').value;

    if (!desc) {
        mostrarToast('Preencha a descrição', true);
        return;
    }
    if (!val || parseFloat(val) <= 0) {
        mostrarToast('Preencha um valor válido', true);
        return;
    }
    if (!data) {
        mostrarToast('Preencha a data', true);
        return;
    }

    if (tipo === 'despesa' && !idCategoria) {
        mostrarToast('Selecione uma categoria para despesas', true);
        return;
    }

    const corpo = {
        descricao: desc,
        valor: parseFloat(val),
        data: data,
        tipo: tipo,
        id_categoria: tipo === 'despesa' ? parseInt(idCategoria, 10) : null
    };

    const config = {
        method: id ? 'PUT' : 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId
        },
        body: JSON.stringify(corpo)
    };

    try {
        const url = id ? `${API_URL}/${id}` : API_URL;
        const res = await fetch(url, config);

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Erro ao salvar');
        }

        if (id) {
            mostrarToast('Transação atualizada com sucesso!');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            mostrarToast('Transação cadastrada com sucesso!');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        }
    } catch (error) {
        mostrarToast(error.message, true);
    }
}

function mostrarToast(mensagem, isError = false) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = mensagem;
    toast.classList.toggle('error', isError);
    
    const icon = toast.querySelector('i');
    icon.setAttribute('data-lucide', isError ? 'x-circle' : 'check');
    lucide.createIcons();
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function formatarValor(valor) {
    return parseFloat(valor).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatarDataBR(data) {
    const parts = data.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
