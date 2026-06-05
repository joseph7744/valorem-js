const USE_MOCK = false;
const API_URL = 'http://localhost:3000/api/transacoes';
const API_CATEGORIAS = 'http://localhost:3000/api/categorias';
let toastTimeoutId = null;

async function fetchDataFromApi() {
    const userId = localStorage.getItem('userId');
    const headers = userId ? { 'x-user-id': userId } : {};
    try {
        const [resCat, resTrans] = await Promise.all([
            fetch(API_CATEGORIAS, { headers }),
            fetch(API_URL, { headers })
        ]);
        if (!resCat.ok || !resTrans.ok) throw new Error('API retornou erro');
        const categories = await resCat.json();
        const transacoes = await resTrans.json();
        return { categories, transacoes };
    } catch (err) {
        console.warn('Falha ao buscar dados da API, usando mock:', err);
        return null;
    }
}

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
        window.lucide?.createIcons?.();
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

function sanitizeDateString(value) {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDateParts(dateString) {
    const sanitized = sanitizeDateString(dateString);
    const parts = sanitized.split('-');
    return {
        year: parseInt(parts[0], 10) || 0,
        month: parseInt(parts[1], 10) || 0,
        day: parseInt(parts[2], 10) || 0
    };
}

function formatarData(dataString) {
    const { year, month, day } = parseDateParts(dataString);
    if (!year || !month || !day) return '-';
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

const MOCK_CATEGORIES = [
    { id_categoria: 1, nome: 'Alimentação', limite: 1200, cor: '#f97316' },
    { id_categoria: 2, nome: 'Transporte', limite: 700, cor: '#2563eb' },
    { id_categoria: 3, nome: 'Lazer', limite: 450, cor: '#8b5cf6' },
    { id_categoria: 4, nome: 'Contas Fixas', limite: 2200, cor: '#10b981' },
    { id_categoria: 5, nome: 'Saúde', limite: 550, cor: '#ef4444' }
];

const MOCK_TRANSACOES = [
    { id: 101, descricao: 'Supermercado', tipo: 'despesa', valor: 320.50, data: '2026-06-02', id_categoria: 1 },
    { id: 102, descricao: 'Assinatura streaming', tipo: 'despesa', valor: 49.90, data: '2026-06-03', id_categoria: 3 },
    { id: 103, descricao: 'Pagamento energia', tipo: 'despesa', valor: 180.35, data: '2026-06-05', id_categoria: 4 },
    { id: 104, descricao: 'Jantar executivo', tipo: 'despesa', valor: 230.00, data: '2026-06-07', id_categoria: 1 },
    { id: 105, descricao: 'Ticket transporte', tipo: 'despesa', valor: 120.00, data: '2026-06-08', id_categoria: 2 },
    { id: 106, descricao: 'Consulta médica', tipo: 'despesa', valor: 285.90, data: '2026-06-09', id_categoria: 5 },
    { id: 107, descricao: 'Venda de ativos', tipo: 'receita', valor: 950.00, data: '2026-06-06', id_categoria: null },
    { id: 108, descricao: 'Freelance UX', tipo: 'receita', valor: 1400.00, data: '2026-05-28', id_categoria: null },
    { id: 109, descricao: 'Aluguel', tipo: 'despesa', valor: 1800.00, data: '2026-06-01', id_categoria: 4 },
    { id: 110, descricao: 'Lanche rápido', tipo: 'despesa', valor: 38.70, data: '2026-06-10', id_categoria: 1 },
    { id: 111, descricao: 'Cinema', tipo: 'despesa', valor: 78.00, data: '2026-05-20', id_categoria: 3 },
    { id: 112, descricao: 'Gasolina', tipo: 'despesa', valor: 260.00, data: '2026-06-04', id_categoria: 2 }
];

// Runtime state
let CURRENT_TRANSACTIONS = [];
let CURRENT_CATEGORIES = [];

function formatarValor(valor) {
    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatarData(dataString) {
    const { year, month, day } = parseDateParts(dataString);
    if (!year || !month || !day) return '-';
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

function getMonthKey(dataString) {
    const { year, month } = parseDateParts(dataString);
    return year && month ? `${String(year)}-${String(month).padStart(2, '0')}` : '';
}

function getDayFromDate(dataString) {
    return parseDateParts(dataString).day || 0;
}

function normalizeTransaction(raw) {
    return {
        id: raw.id || null,
        descricao: raw.descricao || raw.description || '',
        tipo: raw.tipo || 'despesa',
        valor: Math.abs(Number(raw.valor || raw.amount || 0)),
        data: sanitizeDateString(raw.data || raw.data_formatada || raw.created_at || ''),
        id_categoria: raw.id_categoria || null
    };
}

function normalizeCategory(raw) {
    return {
        id_categoria: raw.id_categoria || raw.id || null,
        nome: raw.nome || raw.name || '',
        limite: Number(raw.limite || raw.limit || 0),
        cor: raw.cor || raw.color || '#64748b'
    };
}

function getMonthLabel(monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${monthNames[month - 1]} ${year}`;
}

function getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getPreviousMonthKey() {
    const now = new Date();
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`;
}

function isMonthInProgress(monthKey) {
    const now = new Date();
    const currentMonthKey = getCurrentMonthKey();
    const monthDays = daysInMonth(now.getFullYear(), now.getMonth() + 1);
    return monthKey === currentMonthKey && now.getDate() < monthDays;
}

function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

function calcularTotais(transacoes) {
    const receitas = transacoes
        .filter(item => item.tipo === 'receita')
        .reduce((sum, item) => sum + Math.abs(Number(item.valor)), 0);
    const despesas = transacoes
        .filter(item => item.tipo === 'despesa')
        .reduce((sum, item) => sum + Math.abs(Number(item.valor)), 0);
    return { receitas, despesas, saldo: receitas - despesas };
}

function buildTimeSeries(transacoes, monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    const totalDays = daysInMonth(year, month);
    const series = Array.from({ length: totalDays }, (_, index) => ({
        dia: index + 1,
        valor: 0,
        acumulado: 0
    }));

    transacoes
        .filter(item => getMonthKey(item.data) === monthKey && (item.tipo === 'despesa' || Number(item.valor) < 0))
        .forEach(item => {
            const dia = getDayFromDate(item.data);
            if (dia >= 1 && dia <= totalDays) {
                series[dia - 1].valor += Math.abs(Number(item.valor));
            }
        });

    series.reduce((acc, item) => {
        item.acumulado = acc + item.valor;
        return item.acumulado;
    }, 0);

    return series;
}

function alignTimeSeries(referenceSeries, comparisonSeries) {
    const aligned = comparisonSeries.slice(0, referenceSeries.length);
    if (aligned.length < referenceSeries.length) {
        const lastValue = aligned.length ? aligned[aligned.length - 1].acumulado : 0;
        while (aligned.length < referenceSeries.length) {
            aligned.push({
                dia: aligned.length + 1,
                valor: 0,
                acumulado: lastValue
            });
        }
    }
    return aligned;
}

function isRevenueTransaction(item, categories) {
    if (!item) return false;
    if (item.tipo === 'receita') return true;
    const categoryId = item.id_categoria;
    if (!categoryId || !Array.isArray(categories)) return false;
    const category = categories.find(cat => cat.id_categoria === categoryId);
    if (!category || !category.nome) return false;
    const lowerName = String(category.nome).toLowerCase();
    return lowerName.includes('salário') || lowerName.includes('salario') || lowerName.includes('investimento') || lowerName.includes('receita');
}

function buildCategoryDistribution(transacoes, categories, monthKey) {
    const totals = categories.map(category => {
        const total = transacoes
            .filter(item => getMonthKey(item.data) === monthKey && item.id_categoria === category.id_categoria && !isRevenueTransaction(item, categories))
            .reduce((sum, item) => sum + Math.abs(Number(item.valor)), 0);
        return { ...category, total };
    });
    const overall = totals.reduce((sum, item) => sum + item.total, 0);
    return totals
        .filter(item => item.total > 0)
        .map(item => ({
            ...item,
            percentual: overall ? Number(((item.total / overall) * 100).toFixed(1)) : 0
        }));
}

function buildBudgetAlerts(transacoes, categories, monthKey) {
    return categories
        .map(category => {
            const gasto = transacoes
                .filter(item => item.tipo === 'despesa' && item.id_categoria === category.id_categoria && getMonthKey(item.data) === monthKey)
                .reduce((sum, item) => sum + Number(item.valor), 0);
            return {
                ...category,
                gasto,
                percentual: category.limite ? (gasto / category.limite) * 100 : 0
            };
        })
        .filter(item => item.percentual >= 80)
        .sort((a, b) => b.percentual - a.percentual);
}

function buildForecast(transacoes, monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    const monthDays = daysInMonth(year, month);
    const today = new Date();
    const isCurrentMonth = getMonthKey(today.toISOString().slice(0, 10)) === monthKey;
    const currentDay = isCurrentMonth ? today.getDate() : monthDays;
    const despesasNoMes = transacoes
        .filter(item => getMonthKey(item.data) === monthKey && (item.tipo === 'despesa' || Number(item.valor) < 0))
        .reduce((sum, item) => sum + Math.abs(Number(item.valor)), 0);
    const average = currentDay ? despesasNoMes / currentDay : 0;
    return {
        forecast: average * monthDays,
        mediaDiaria: average,
        diasRestantes: monthDays - currentDay,
        isCurrentMonth
    };
}

function renderKpiCards(transacoes, categories) {
    const currentMonth = getCurrentMonthKey();
    const previousMonth = getPreviousMonthKey();
    const today = new Date();

    const allTimeTotals = calcularTotais(transacoes);
    const currentTotals = calcularTotais(transacoes.filter(item => getMonthKey(item.data) === currentMonth));
    const previousTotals = calcularTotais(transacoes.filter(item => getMonthKey(item.data) === previousMonth));
    const savingsRate = currentTotals.receitas ? ((currentTotals.receitas - currentTotals.despesas) / currentTotals.receitas) * 100 : 0;
    const spendingChange = previousTotals.despesas ? ((currentTotals.despesas - previousTotals.despesas) / previousTotals.despesas) * 100 : 0;
    const forecastData = buildForecast(transacoes, currentMonth);
    const forecast = forecastData.forecast;
    const monthInProgress = forecastData.isCurrentMonth && today.getDate() < daysInMonth(today.getFullYear(), today.getMonth() + 1);

    const budgetLimit = categories.reduce((sum, category) => sum + Number(category.limite || category.limit || 0), 0);
    const spendingPercent = budgetLimit ? Math.min((currentTotals.despesas / budgetLimit) * 100, 100) : 0;

    const cards = [
        {
            label: 'Saldo Atual',
            value: formatarValor(allTimeTotals.saldo),
            description: 'Saldo acumulado histórico de receitas menos despesas.',
            badge: { text: allTimeTotals.saldo >= 0 ? 'Saudável' : 'Atenção', type: allTimeTotals.saldo >= 0 ? 'success' : 'danger' }
        },
        {
            label: 'Gastos do mês',
            value: formatarValor(currentTotals.despesas),
            description: `${spendingChange >= 0 ? '↑' : '↓'} ${Math.abs(spendingChange).toFixed(1)}% vs mês anterior`,
            badge: { text: 'Comparativo', type: 'info' },
            progress: spendingPercent,
            progressLabel: budgetLimit ? `${spendingPercent.toFixed(0)}% do orçamento` : 'Orçamento global não definido'
        },
        {
            label: 'Taxa de Poupança',
            value: `${savingsRate.toFixed(1)}%`,
            description: `Taxa de poupança mensal.${monthInProgress ? ' Em curso.' : ''}`,
            badge: { text: monthInProgress ? 'Em curso' : (savingsRate >= 0 ? 'Performance' : 'Redução'), type: monthInProgress ? 'warning' : (savingsRate >= 0 ? 'success' : 'danger') }
        },
        {
            label: 'Previsão de gastos',
            value: formatarValor(forecast),
            description: 'Forecast linear ponderado pelo dia do mês atual.',
            badge: { text: 'Forecast', type: 'warning' }
        }
    ];

    document.getElementById('kpiCards').innerHTML = cards.map(card => `
        <article class="metric-card">
            <div class="metric-label">${card.label}</div>
            <div class="metric-value">${card.value}</div>
            <div class="metric-meta">
                <span>${card.description}</span>
                <span class="badge badge-${card.badge.type}">${card.badge.text}</span>
            </div>
            ${card.progress ? `<div class="budget-progress"><div class="budget-progress-bar"><div class="budget-progress-fill" style="width: ${card.progress}%"></div></div><span class="budget-progress-text">${card.progressLabel}</span></div>` : ''}
        </article>
    `).join('');
}

function createTrendSvg(currentPoints, previousPoints, currentColor, previousColor, fillColor) {
    if (!currentPoints.length) {
        return '<div class="empty-state">Sem série temporal disponível.</div>';
    }

    const width = 560;
    const height = 260;
    const padding = 28;
    const maxValue = Math.max(
        1,
        ...currentPoints.map(point => point.value),
        ...previousPoints.map(point => point.value)
    );
    const stepX = (width - padding * 2) / Math.max(currentPoints.length - 1, 1);

    const currentLinePath = currentPoints.map((point, index) => {
        const x = padding + index * stepX;
        const y = height - padding - (point.value / maxValue) * (height - padding * 2);
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');

    const previousLinePath = previousPoints.map((point, index) => {
        const x = padding + index * stepX;
        const y = height - padding - (point.value / maxValue) * (height - padding * 2);
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');

    const areaPath = `${currentLinePath} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;

    const xLabels = currentPoints.map((point, index) => {
        const x = padding + index * stepX;
        return `<text x="${x.toFixed(2)}" y="${height - padding + 22}" fill="var(--text-muted)" font-size="11" text-anchor="middle">${point.label}</text>`;
    }).join('');

    return `
        <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Evolução dos gastos">
            <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="${fillColor}" stop-opacity="0.28" />
                    <stop offset="100%" stop-color="${fillColor}" stop-opacity="0" />
                </linearGradient>
            </defs>
            <g opacity="0.35">
                <line x1="${padding}" y1="${padding}" x2="${width - padding}" y2="${padding}" stroke="rgba(148,163,184,0.3)" />
                <line x1="${padding}" y1="${height / 2}" x2="${width - padding}" y2="${height / 2}" stroke="rgba(148,163,184,0.2)" />
                <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="rgba(148,163,184,0.2)" />
            </g>
            <path d="${areaPath}" fill="url(#trendGradient)" />
            <path d="${previousLinePath}" fill="none" stroke="${previousColor}" stroke-width="2" stroke-dasharray="6 6" opacity="0.75" />
            <path d="${currentLinePath}" fill="none" stroke="${currentColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
            ${currentPoints.map((point, index) => {
                const x = padding + index * stepX;
                const y = height - padding - (point.value / maxValue) * (height - padding * 2);
                return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4" fill="${currentColor}" />`;
            }).join('')}
            ${xLabels}
        </svg>
    `;
}

function renderTrendChart(transacoes) {
    const currentMonth = getCurrentMonthKey();
    const previousMonth = getPreviousMonthKey();
    const currentSeries = buildTimeSeries(transacoes, currentMonth);
    const previousSeries = buildTimeSeries(transacoes, previousMonth);
    const alignedPrevious = alignTimeSeries(currentSeries, previousSeries);

    const currentPoints = currentSeries.map(item => ({ label: String(item.dia), value: item.acumulado }));
    const previousPoints = alignedPrevious.map(item => ({ label: String(item.dia), value: item.acumulado }));
    const chartContainer = document.getElementById('spendingTrendChart');
    chartContainer.innerHTML = `
        <div class="trend-legend">
            <div><span class="legend-chip legend-current"></span> Mês atual (acumulado)</div>
            <div><span class="legend-chip legend-previous"></span> Mês anterior (run-rate acumulado)</div>
        </div>
        <div class="chart-surface">${createTrendSvg(currentPoints, previousPoints, '#2563eb', '#94a3b8', '#93c5fd')}</div>
    `;
}

function renderDonutChart(transacoes, categories) {
    const currentMonth = getCurrentMonthKey();
    const distribution = buildCategoryDistribution(transacoes, categories, currentMonth);
    const totalSpend = distribution.reduce((sum, item) => sum + item.total, 0);
    const chartContainer = document.getElementById('categoryDonutChart');
    const legendContainer = document.getElementById('categoryLegend');

    if (!distribution.length) {
        chartContainer.innerHTML = '<div class="empty-state">Sem gastos categorizados para o mês atual.</div>';
        legendContainer.innerHTML = '';
        return;
    }

    const gradient = distribution.reduce((segments, item, index) => {
        const start = segments.offset;
        const size = (item.total / totalSpend) * 100;
        segments.css += `${item.cor} ${start}% , ${item.cor} ${start + size}%${index < distribution.length - 1 ? ', ' : ''}`;
        segments.offset += size;
        return segments;
    }, { css: '', offset: 0 }).css;

    chartContainer.innerHTML = `
        <div class="donut-chart" role="img" aria-label="Distribuição de gastos por categoria" style="background: conic-gradient(${gradient});">
            <div class="donut-center">
                <strong>${formatarValor(totalSpend)}</strong>
                Total
            </div>
        </div>
    `;

    legendContainer.innerHTML = distribution.map(item => `
        <span>
            <span style="background:${item.cor};"></span>
            ${item.nome} • ${item.percentual}%
        </span>
    `).join('');
}

function renderAlerts(transacoes, categories) {
    const currentMonth = getCurrentMonthKey();
    const alerts = buildBudgetAlerts(transacoes, categories, currentMonth);
    const alertsList = document.getElementById('alertsList');

    if (!alerts.length) {
        alertsList.innerHTML = '<div class="empty-state">Nenhuma categoria atingiu 80% do limite.</div>';
        return;
    }

    alertsList.innerHTML = alerts.map(alert => `
        <article class="alert-card">
            <div class="alert-info">
                <strong>${alert.nome}</strong>
                <span>${formatarValor(alert.gasto)} de ${formatarValor(alert.limite)}</span>
                <span>${alert.percentual.toFixed(0)}% do limite usado</span>
            </div>
            <div class="alert-chip"><i data-lucide="alert-triangle"></i>${alert.percentual.toFixed(0)}%</div>
        </article>
    `).join('');
    window.lucide?.createIcons?.();
}

function renderTransactionsTable(transacoes, categories) {
    const tbody = document.querySelector('#transactionsTable tbody');
    if (!tbody) return;
    let rows = applyFilters(transacoes);

    // If filters are too restrictive or not set, fallback to latest transactions
    if ((!rows || rows.length === 0) && Array.isArray(transacoes) && transacoes.length) {
        rows = transacoes.slice().sort((a, b) => new Date(b.data) - new Date(a.data));
    }

    if (!rows || rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhuma transação encontrada.</td></tr>';
        return;
    }

    tbody.innerHTML = rows.slice(0, 12).map(item => {
        const category = categories.find(cat => cat.id_categoria === item.id_categoria) || { nome: 'Outros' };
        return `
            <tr>
                <td>${formatarData(item.data)}</td>
                <td>${item.descricao}</td>
                <td>${category.nome}</td>
                <td class="text-right ${item.tipo === 'receita' ? 'valor-receita' : 'valor-despesa'}">${formatarValor(item.valor)}</td>
                <td class="action-cell">
                    <button class="action-btn btn-editar" onclick="handleEdit(${item.id})" title="Editar">
                        <i data-lucide="edit-2" style="width:16px"></i>
                    </button>
                    <button class="action-btn btn-excluir" onclick="handleDelete(${item.id})" title="Excluir">
                        <i data-lucide="trash-2" style="width:16px"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // render icons for dynamically added buttons
    window.lucide?.createIcons?.();
}

function populateFilterOptions(categories) {
    const categorySelect = document.getElementById('filterCategory');
    const periodSelect = document.getElementById('filterPeriod');
    const now = new Date();
    const currentMonthKey = `${now.getFullYear().toString().padStart(4, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthKey = `${previous.getFullYear().toString().padStart(4, '0')}-${(previous.getMonth() + 1).toString().padStart(2, '0')}`;

    categorySelect.innerHTML = `
        <option value="">Todas as categorias</option>
        ${categories.map(category => `<option value="${category.id_categoria}">${category.nome}</option>`).join('')}
    `;



    periodSelect.innerHTML = `
        <option value="all">Todos os meses</option>
        <option value="${currentMonthKey}">${getMonthLabel(currentMonthKey)}</option>
        <option value="${previousMonthKey}">${getMonthLabel(previousMonthKey)}</option>
    `;
    periodSelect.value = 'all';
}

function applyFilters(transacoes) {
    const categoryValue = document.getElementById('filterCategory').value;
    const periodValue = document.getElementById('filterPeriod').value;
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setDate(now.getDate() - 30);

    return transacoes.filter(item => {
        const categoryMatch = !categoryValue || item.id_categoria === Number(categoryValue);
        let periodMatch = true;

        if (periodValue === 'all') {
            periodMatch = true;
        } else {
            periodMatch = getMonthKey(item.data) === periodValue;
        }

        return categoryMatch && periodMatch;
    }).sort((a, b) => new Date(b.data) - new Date(a.data));
}

function logout() {
    if (confirm('Deseja sair da sua conta?')) {
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        window.location.href = 'login.html';
    }
}

// Editar transação: salva no localStorage e redireciona para o formulário
function handleEdit(id) {
    // If API available, fetch fresh record to ensure DB-backed edit
    (async () => {
        try {
            if (!USE_MOCK) {
                const userId = localStorage.getItem('userId');
                const res = await fetch(`${API_URL}/${id}`, { headers: userId ? { 'x-user-id': userId } : {} });
                if (!res.ok) throw new Error('Falha ao buscar transação para edição');
                const tx = await res.json();
                const payload = normalizeTransaction(tx);
                localStorage.setItem('editarTransacao', JSON.stringify(payload));
                window.location.href = 'cadastro.html';
                return;
            }

            // Fallback: use local CURRENT_TRANSACTIONS for mock
            const txLocal = CURRENT_TRANSACTIONS.find(t => t.id === id) || null;
            if (!txLocal) {
                mostrarToast('Transação não encontrada para edição', true);
                return;
            }
            localStorage.setItem('editarTransacao', JSON.stringify({
                id: txLocal.id,
                descricao: txLocal.descricao,
                valor: txLocal.valor,
                data: txLocal.data,
                tipo: txLocal.tipo,
                id_categoria: txLocal.id_categoria
            }));
            window.location.href = 'cadastro.html';
        } catch (err) {
            console.error('Erro ao preparar edição:', err);
            mostrarToast('Não foi possível carregar a transação para edição.', true);
        }
    })();
}

// Excluir transação: confirma e remove (API ou mock)
async function handleDelete(id) {
    if (!confirm('Deseja excluir esta transação?')) return;

    // Try API deletion first; if it fails, fallback to local removal (mock)
    try {
        const userId = localStorage.getItem('userId');
        const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE', headers: userId ? { 'x-user-id': userId } : {} });
        if (res.ok) {
            // refresh from API to ensure DB state
            const apiResult = await fetchDataFromApi();
            if (apiResult) {
                CURRENT_CATEGORIES = apiResult.categories;
                CURRENT_TRANSACTIONS = apiResult.transacoes;
                renderKpiCards(CURRENT_TRANSACTIONS, CURRENT_CATEGORIES);
                renderTrendChart(CURRENT_TRANSACTIONS);
                renderDonutChart(CURRENT_TRANSACTIONS, CURRENT_CATEGORIES);
                renderAlerts(CURRENT_TRANSACTIONS, CURRENT_CATEGORIES);
                renderTransactionsTable(CURRENT_TRANSACTIONS, CURRENT_CATEGORIES);
                return;
            }
        } else {
            // If API returned non-ok, throw to fallback
            throw new Error('API delete falhou');
        }
    } catch (err) {
        console.warn('Exclusão via API falhou, aplicando fallback local:', err);
        // fallback to local removal
        CURRENT_TRANSACTIONS = CURRENT_TRANSACTIONS.filter(t => t.id !== id);
        renderKpiCards(CURRENT_TRANSACTIONS, CURRENT_CATEGORIES);
        renderTrendChart(CURRENT_TRANSACTIONS);
        renderDonutChart(CURRENT_TRANSACTIONS, CURRENT_CATEGORIES);
        renderAlerts(CURRENT_TRANSACTIONS, CURRENT_CATEGORIES);
        renderTransactionsTable(CURRENT_TRANSACTIONS, CURRENT_CATEGORIES);
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('userId');
    if (!userId && !USE_MOCK) {
        window.location.href = 'login.html';
        return;
    }

    // Try fetching from API; fallback to mock data if API unavailable
    let categories = MOCK_CATEGORIES;
    let transacoes = MOCK_TRANSACOES;
    const apiResult = await fetchDataFromApi();
    if (apiResult && Array.isArray(apiResult.categories) && Array.isArray(apiResult.transacoes)) {
        categories = apiResult.categories.map(normalizeCategory);
        transacoes = apiResult.transacoes.map(normalizeTransaction);
        console.log('Dashboard BI carregado com dados da API');
    } else {
        console.log('Usando dados mock para o dashboard');
    }

    // persist current state for handlers
    CURRENT_CATEGORIES = categories;
    CURRENT_TRANSACTIONS = transacoes;

    populateFilterOptions(categories);
    document.getElementById('filterCategory').addEventListener('change', () => renderTransactionsTable(transacoes, categories));
    document.getElementById('filterPeriod').addEventListener('change', () => renderTransactionsTable(transacoes, categories));

    try {
        renderKpiCards(transacoes, categories);
        renderTrendChart(transacoes);
        renderDonutChart(transacoes, categories);
        renderAlerts(transacoes, categories);
        renderTransactionsTable(transacoes, categories);
    } catch (error) {
        console.error('Dashboard load failed:', error);
        const fallback = document.createElement('div');
        fallback.className = 'empty-state';
        fallback.textContent = 'Ocorreu um problema ao carregar o dashboard. Verifique o console.';
        document.body.appendChild(fallback);
    }
});