# CHANGELOG - Valorem v2.0

## [2.0.0] - 2026-05-16

### 🆕 Novas Funcionalidades

#### Autenticação e Autorização
- Página de login com formulário responsivo
- Página de cadastro com validação de email único
- Armazenamento seguro de credenciais com hash SHA-256
- Sistema de autenticação por header `x-user-id`
- Middleware de verificação de autenticação
- Redirecionamento automático para login se não autenticado

#### Tabela Categoria
- Implementação completa da tabela `Categoria` no banco de dados
- Campos de categoria obrigatórios em transações
- CRUD de categorias via API
- Categorias pré-populadas na inicialização
- Integração com filtros de transações

#### Tabela Auditoria
- Implementação da tabela `Auditoria_Valorem`
- TRIGGER automático para despesas acima de R$ 1.000
- Registro automático de eventos importantes

#### Tabela Usuario
- Implementação completa da tabela `Usuario`
- Armazenamento seguro de senhas
- Email único por usuário
- Suporte para múltiplos usuários no sistema

### 🔄 Modificações

#### app.js
- Restruturação completa do servidor Express
- Adição de modelos Sequelize para Usuario, Categoria, Transacao, Auditoria
- Criação de 4 endpoints de autenticação (login/register)
- Criação de 4 endpoints de categorias (CRUD)
- Modificação de endpoints de transações para incluir userId
- Adição de middleware de autenticação
- Criação automática de VIEW `vw_extrato_detalhado`
- Criação automática de TRIGGER `trg_alerta_despesa_alta`
- Migração de banco de `transacoes.sqlite` para `valorem.sqlite`

#### index.html (Dashboard)
- Verificação obrigatória de autenticação ao carregar
- Carregamento de categorias da API
- Atualização de filtros para usar IDs de categoria
- Exibição de nome de categoria ao invés de valor armazenado
- Adição de botão de logout na navegação
- Header `x-user-id` em todas as requisições
- Redirecionamento para login se não autenticado
- Ordenação de transações por data (mais recentes primeiro)

#### cadastro.html (Criar/Editar Transação)
- Verificação obrigatória de autenticação
- Carregamento de categorias da API
- Seletor de categoria obrigatório
- Validação aprimorada de campos
- Armazenamento de `id_categoria` ao invés de string
- Atualização de modo edição para usar API corretamente
- Adição de botão de logout
- Header `x-user-id` em todas as requisições

#### categorias.html (Gerenciamento de Categorias)
- Verificação obrigatória de autenticação
- Carregamento de categorias da API
- Adição de categorias via API
- Remoção de categorias via API
- Exibição dinâmica de categorias
- Adição de botão de logout
- Header `x-user-id` em todas as requisições

### 🆕 Novos Arquivos

#### login.html
- Página de autenticação
- Abas para Login e Cadastro
- Validação de formulários
- Armazenamento de dados de usuário em localStorage
- Redirecionamento automático para dashboard se autenticado
- Interface responsiva e moderna

### 🗑️ Removidos

- Sistema de armazenamento local de categorias em localStorage
- Mapa manual de categorias por transação
- Banco de dados `transacoes.sqlite`

### 🔒 Melhorias de Segurança

- Implementação de autenticação baseada em header
- Validação de propriedade de transação (usuário só pode editar suas transações)
- Hash de senhas com SHA-256
- Isolamento de dados por usuário
- Verificação em todos os endpoints críticos

### 📊 Melhorias de Dados

- Uso de IDs númericos para categorias ao invés de strings
- Melhor integridade referencial com foreign keys
- Auditoria automática de eventos importantes
- Rastreamento de criação e atualização de transações

### 🎨 Melhorias de UX

- Botão de logout integrado em todas as páginas
- Verificação de autenticação antes de qualquer operação
- Mensagens de erro mais descritivas
- Interface consistente em todas as páginas
- Categorias pré-carregadas para melhor experiência

### 🔧 Melhorias Técnicas

- Uso de Sequelize ORM para gerenciamento de banco de dados
- Relacionamentos entre tabelas definidos corretamente
- Middleware de autenticação reutilizável
- Tratamento de erros aprimorado
- Validações lado do servidor

### 📈 Performance

- Queries mais eficientes com JOINs na VIEW
- Índices implícitos em chaves primárias
- Lazy loading de dados necessários

## Dependências

```json
{
  "cors": "^2.8.6",
  "express": "^5.2.1",
  "sequelize": "^6.37.8",
  "sqlite3": "^6.0.1"
}
```

## Notas Importantes

- O banco de dados é criado automaticamente ao iniciar o servidor
- Categorias padrão são criadas na primeira execução
- Senhas são armazenadas com hash SHA-256
- Dados de autenticação são armazenados em localStorage no navegador
- Todos os endpoints protegidos requerem o header `x-user-id`

## Como Migrar

Se você tinha dados anteriores:
1. Faça backup do arquivo `transacoes.sqlite`
2. Delete ou renomeie o arquivo
3. Inicie o servidor (novo banco será criado)
4. Cadastre seus usuários
5. As categorias padrão serão criadas automaticamente
