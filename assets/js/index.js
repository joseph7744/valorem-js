// Elements
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginMessage = document.getElementById('loginMessage');
const registerMessage = document.getElementById('registerMessage');

// Tab switching
loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
    loginMessage.textContent = '';
    loginMessage.className = 'message';
});

registerTab.addEventListener('click', () => {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
    registerMessage.textContent = '';
    registerMessage.className = 'message';
});

// LOGIN FORM
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const senha = document.getElementById('loginSenha').value;

    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro no login');
        }

        localStorage.setItem('userId', data.id_usuario);
        localStorage.setItem('userName', data.nome);
        localStorage.setItem('userEmail', data.email);

        loginMessage.textContent = '✅ Login realizado com sucesso!';
        loginMessage.className = 'message success';

        setTimeout(() => {
            window.location.href = 'pages/dashboard.html';
        }, 1500);
    } catch (error) {
        loginMessage.textContent = '❌ ' + error.message;
        loginMessage.className = 'message error';
    }
});

// REGISTER FORM
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('registerNome').value;
    const email = document.getElementById('registerEmail').value;
    const senha = document.getElementById('registerSenha').value;
    const senhaConfirm = document.getElementById('registerSenhaConfirm').value;

    if (senha !== senhaConfirm) {
        registerMessage.textContent = '❌ As senhas não correspondem';
        registerMessage.className = 'message error';
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro no cadastro');
        }

        localStorage.setItem('userId', data.id_usuario);
        localStorage.setItem('userName', data.nome);
        localStorage.setItem('userEmail', data.email);

        registerMessage.textContent = '✅ Cadastro realizado com sucesso!';
        registerMessage.className = 'message success';

        setTimeout(() => {
            window.location.href = 'pages/dashboard.html';
        }, 1500);
    } catch (error) {
        registerMessage.textContent = '❌ ' + error.message;
        registerMessage.className = 'message error';
    }
});

// Renderizar ícones
lucide.createIcons();

// Verificar se já está autenticado
window.addEventListener('load', () => {
    const userId = localStorage.getItem('userId');
    if (userId) {
        window.location.href = 'pages/dashboard.html';
    }
});