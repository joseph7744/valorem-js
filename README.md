# Valorem - Gestão de Fluxo Financeiro

## 📋 Alterações Realizadas

### 1. **Banco de Dados (app.js)**
- ✅ Criado schema com tabelas: `Usuario`, `Categoria`, `Transacao`, `Auditoria_Valorem`
- ✅ Implementada autenticação com hash de senha (SHA-256)
- ✅ Adicionada VIEW `vw_extrato_detalhado` para consultas detalhadas
- ✅ Criado TRIGGER `trg_alerta_despesa_alta` para monitorar despesas acima de R$ 1.000

### 2. **Autenticação (login.html - NOVO)**
- ✅ Página de login e cadastro (abas alternáveis)
- ✅ Cadastro de novos usuários com validação de email único
- ✅ Login com email e senha
- ✅ Armazenamento seguro do ID do usuário em localStorage
- ✅ Redirecionamento automático para dashboard quando autenticado

### 3. **Dashboard (index.html)**
- ✅ Verificação obrigatória de autenticação
- ✅ Carregamento de categorias da API
- ✅ Filtros por categoria e mês funcionais
- ✅ Exibição do nome da categoria em cada transação
- ✅ Botão de logout integrado no menu
- ✅ Todas as requisições incluem header de autenticação `x-user-id`

### 4. **Cadastro de Transações (cadastro.html)**
- ✅ Verificação obrigatória de autenticação
- ✅ Carregamento dinâmico de categorias da API
- ✅ Campo obrigatório de seleção de categoria
- ✅ Modo de edição com integração com banco de dados
- ✅ Validações aprimoradas
- ✅ Logout integrado no menu

### 5. **Gerenciamento de Categorias (categorias.html)**
- ✅ Verificação obrigatória de autenticação
- ✅ Listagem dinâmica de categorias da API
- ✅ Adição de novas categorias via API
- ✅ Remoção de categorias via API
- ✅ Logout integrado no menu

## 🚀 Como Usar

### Instalação das Dependências
```bash
npm install
```

### Iniciar o Servidor
```bash
node app.js
```
O servidor rodará em `http://localhost:3000`

### Acessar a Aplicação
1. Abra `http://localhost:3000/login.html` no navegador
2. Escolha entre **Login** ou **Cadastro**
3. Para novo usuário: Preencha nome, email e senha (mín. 6 caracteres)
4. Para usuário existente: Use email e senha cadastrados
5. Após autenticação, você será redirecionado para o Dashboard

## 📊 Funcionalidades Implementadas

### Autenticação
- Login com email e senha
- Cadastro de novos usuários
- Verificação de autenticação em todas as páginas
- Logout seguro (limpa dados do localStorage)

### Transações
- Criar transações com categoria obrigatória
- Editar transações existentes
- Excluir transações
- Filtrar por categoria e mês
- Visualizar totais (receitas, despesas, saldo)

### Categorias
- Visualizar todas as categorias disponíveis
- Adicionar novas categorias
- Remover categorias existentes
- Categorias pré-carregadas no banco de dados

### Segurança
- Middleware de autenticação em todos os endpoints protegidos
- Senhas armazenadas com hash SHA-256
- Isolamento de dados por usuário
- Validação de proprietário de transação

## 🗄️ Schema do Banco de Dados

### Tabela Usuario
```sql
- id_usuario (PK)
- nome
- email (UNIQUE)
- senha (hashed)
```

### Tabela Categoria
```sql
- id_categoria (PK)
- nome (UNIQUE)
```

### Tabela Transacao
```sql
- id (PK)
- descricao
- valor
- data
- tipo (despesa/receita)
- createdAt
- updatedAt
- id_categoria (FK)
- id_usuario (FK)
```

### Tabela Auditoria_Valorem
```sql
- id_log (PK)
- mensagem
- data_log
```

## 📡 Endpoints da API

### Autenticação
- `POST /api/auth/register` - Cadastrar novo usuário
- `POST /api/auth/login` - Fazer login

### Categorias
- `GET /api/categorias` - Listar todas as categorias
- `POST /api/categorias` - Criar nova categoria (requer autenticação)
- `PUT /api/categorias/:id` - Atualizar categoria (requer autenticação)
- `DELETE /api/categorias/:id` - Deletar categoria (requer autenticação)

### Transações
- `GET /api/transacoes` - Listar transações do usuário (requer autenticação)
- `GET /api/transacoes/saldo` - Obter saldo total (requer autenticação)
- `POST /api/transacoes` - Criar transação (requer autenticação)
- `PUT /api/transacoes/:id` - Editar transação (requer autenticação)
- `DELETE /api/transacoes/:id` - Deletar transação (requer autenticação)

## 🔐 Autenticação

Todos os endpoints protegidos requerem o header:
```
x-user-id: <id_do_usuario>
```

## 📝 Categorias Padrão

As seguintes categorias são criadas automaticamente:
- Alimentação
- Transporte
- Saúde
- Educação
- Entretenimento
- Moradia
- Utilities
- Outros

## 💾 Banco de Dados

Arquivo: `valorem.sqlite`

O banco é criado e sincronizado automaticamente ao iniciar o servidor.

## 🛠️ Tecnologias Utilizadas

- **Backend:** Express.js + Sequelize
- **Database:** SQLite3
- **Frontend:** HTML5, CSS3, JavaScript vanilla
- **UI Framework:** Lucide Icons
- **Font:** Inter (Google Fonts)

## ✅ Testes Recomendados

1. Cadastre um novo usuário
2. Faça login com o usuário cadastrado
3. Crie uma nova categoria
4. Cadastre uma transação com a categoria criada
5. Edite e delete a transação
6. Verifique os filtros e totais no dashboard
7. Faça logout e tente acessar diretamente uma página (deve redirecionar para login)

## 📞 Suporte

Para dúvidas ou problemas, verifique:
- Console do navegador (F12 > Console)
- Terminal onde o servidor está rodando
- Verifique se o servidor está na porta 3000
