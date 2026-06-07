# Contexto Técnico - Valorem (Uso no GitHub Copilot)

## 🗄️ Esquema do Banco Ativo (valorem.sqlite)
* **Usuario**: `id_usuario` (PK), `nome`, `email`, `senha`
* **Categoria**: `id_categoria` (PK), `nome`
* **Transacao**: `id` (PK), `descricao`, `valor` (Double absoluto positivo), `data` (DATE), `tipo` ('despesa' ou 'receita'), `id_categoria` (FK), `id_usuario` (FK)

## 📊 Regras Contábeis de Business Intelligence (BI)
1. **Saldo Atual**: Soma histórica acumulada de receitas menos despesas (nunca reseta no mês).
2. **Gráfico de Linha (Evolução)**: Deve ser acumulado dia a dia em formato de escada (Run-Rate).
3. **Previsão de Gastos**: Projeção linear baseada no dia atual: Previsao = (Gastos Acumulados / Dia Atual) * Dias do Mês.

## 🔒 Diretrizes de Integração
* `const USE_MOCK = false;` (Sempre consumir a API real).
* Enviar obrigatoriamente o cabeçalho `'x-user-id'` em todos os métodos HTTP (GET, POST, PUT, DELETE).
* Evitar o bug do fuso horário tratando datas com: `new Date(dataInput + 'T12:00:00').toISOString().split('T')[0]`.
* Usar o método `mostrarToast()` para notificações. O container deve ser gerado dinamicamente para evitar elementos nulos no DOM.