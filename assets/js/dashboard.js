const API_URL = 'http://localhost:3000/api/transacoes';
const API_CATEGORIAS = 'http://localhost:3000/api/categorias';
const API_AUDIT = 'http://localhost:3000/api/auditoria';
const CATEGORY_COLOR_PALETTE = ['#f97316', '#2563eb', '#8b5cf6', '#10b981', '#ef4444', '#f59e0b', '#0ea5e9', '#14b8a6', '#ec4899', '#7c3aed'];
let toastTimeoutId = null;
let CURRENT_AUDIT_LOGS = [];

function getDefaultCategoryColor(id) {
    const numericId = Number(id) || 0;
    return CATEGORY_COLOR_PALETTE[numericId % CATEGORY_COLOR_PALETTE.length];
}

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
        console.error('Falha ao buscar dados da API:', err);
        throw err;
    }
}

async function fetchAuditLogs() {
    const userId = localStorage.getItem('userId');
    const headers = userId ? { 'x-user-id': userId } : {};
    const res = await fetch(API_AUDIT, { headers });
    if (!res.ok) throw new Error('Erro ao buscar logs de auditoria');
    return await res.json();
}

function formatAuditDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
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
        id_categoria: raw.id_categoria != null ? Number(raw.id_categoria) : null
    };
}

function normalizeCategory(raw) {
    const id_categoria = raw.id_categoria != null ? Number(raw.id_categoria) : Number(raw.id || 0);
    return {
        id_categoria: Number.isNaN(id_categoria) ? null : id_categoria,
        nome: raw.nome || raw.name || '',
        limite: Number(raw.limite || raw.limit || 0),
        cor: raw.cor || raw.color || getDefaultCategoryColor(id_categoria)
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

/**
 * Constrói distribuição de categorias, EXCLUINDO receitas e categorias de receita.
 * Garante acurácia BI: apenas despesas legítimas aparecem no gráfico de donut.
 */
function buildCategoryDistribution(transacoes, categories, monthKey) {
    const totals = categories
        .filter(category => {
            const lowerName = String(category.nome).toLowerCase();
            return !(lowerName.includes('receita') || lowerName.includes('salário') || lowerName.includes('salario'));
        })
        .map(category => {
            const categoryId = Number(category.id_categoria);
            const total = transacoes
                .filter(item => 
                    getMonthKey(item.data) === monthKey && 
                    item.tipo === 'despesa' && 
                    Number(item.id_categoria) === categoryId
                )
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

/**
 * Calcula previsão de gastos usando fórmula linear ponderada:
 * Previsao = (Gastos Acumulados / Dia Atual) * Dias do Mês
 */
function buildForecast(transacoes, monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    const monthDays = daysInMonth(year, month);
    const today = new Date();
    const isCurrentMonth = getMonthKey(today.toISOString().slice(0, 10)) === monthKey;
    const currentDay = isCurrentMonth ? today.getDate() : monthDays;
    
    const despesasNoMes = transacoes
        .filter(item => getMonthKey(item.data) === monthKey && item.tipo === 'despesa')
        .reduce((sum, item) => sum + Math.abs(Number(item.valor)), 0);
    
    // Fórmula linear ponderada: (Gastos Acumulados / Dia Atual) * Dias do Mês
    const forecast = currentDay > 0 ? (despesasNoMes / currentDay) * monthDays : 0;
    const mediaDiaria = currentDay > 0 ? despesasNoMes / currentDay : 0;
    
    return {
        forecast,
        mediaDiaria,
        diasRestantes: Math.max(0, monthDays - currentDay),
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
            label: 'Percentual de economia',
            value: `${savingsRate.toFixed(1)}%`,
            description: `Percentual de economia mensal.`,
            badge: { text: allTimeTotals.saldo >= 0 ? 'Saudável' : 'Atenção', type: allTimeTotals.saldo >= 0 ? 'success' : 'danger' }
        }
    ];

    const kpiContainer = document.getElementById('kpiCards');
    if (kpiContainer) {
        kpiContainer.style.display = 'grid';
        kpiContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(240px, 1fr))';
        kpiContainer.style.justifyItems = 'stretch';
        kpiContainer.style.gap = '18px';
        kpiContainer.innerHTML = cards.map(card => `
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

    const currentLinePath = currentPoints.reduce((path, point, index) => {
        const x = padding + index * stepX;
        const y = height - padding - (point.value / maxValue) * (height - padding * 2);
        if (index === 0) {
            return `M ${x.toFixed(2)} ${y.toFixed(2)}`;
        }
        const prevPoint = currentPoints[index - 1];
        const prevY = height - padding - (prevPoint.value / maxValue) * (height - padding * 2);
        return `${path} L ${x.toFixed(2)} ${prevY.toFixed(2)} L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }, '');

    const previousLinePath = previousPoints.reduce((path, point, index) => {
        const x = padding + index * stepX;
        const y = height - padding - (point.value / maxValue) * (height - padding * 2);
        if (index === 0) {
            return `M ${x.toFixed(2)} ${y.toFixed(2)}`;
        }
        const prevPoint = previousPoints[index - 1];
        const prevY = height - padding - (prevPoint.value / maxValue) * (height - padding * 2);
        return `${path} L ${x.toFixed(2)} ${prevY.toFixed(2)} L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }, '');

    const areaPath = `${currentLinePath} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;

    const xLabels = currentPoints.map((point, index) => {
        const x = padding + index * stepX;
        return `<text x="${x.toFixed(2)}" y="${height - padding + 22}" fill="var(--text-muted)" font-size="11" text-anchor="middle">${point.label}</text>`;
    }).join('');

    return `
        <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Evolução dos gastos em formato de escada">
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

/**
 * Renderiza gráfico de linha em formato de escada (Run-Rate acumulada),
 * comparando mês corrente com o anterior.
 */
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
            <div><span class="legend-chip legend-current"></span> Mês atual (Run-Rate acumulado)</div>
            <div><span class="legend-chip legend-previous"></span> Mês anterior (Run-Rate acumulado)</div>
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

    const gradient = distribution.reduce((segments, item) => {
        const start = segments.offset;
        const end = start + (item.total / totalSpend) * 100;
        segments.css.push(`${item.cor} ${start}% ${end}%`);
        segments.offset = end;
        return segments;
    }, { css: [], offset: 0 }).css.join(', ');

    chartContainer.innerHTML = `
        <div class="donut-chart" role="img" aria-label="Distribuição de gastos por categoria (excluídas receitas)" style="background-image: conic-gradient(${gradient});">
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

    if (!alertsList) return;

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
        window.location.href = 'index.html';
    }
}

function handleEdit(id) {
    (async () => {
        try {
            const userId = localStorage.getItem('userId');
            const res = await fetch(`${API_URL}/${id}`, { headers: userId ? { 'x-user-id': userId } : {} });
            if (!res.ok) throw new Error('Falha ao buscar transação para edição');
            const tx = await res.json();
            const payload = normalizeTransaction(tx);
            localStorage.setItem('editarTransacao', JSON.stringify(payload));
            window.location.href = 'cadastro.html';
        } catch (err) {
            console.error('Erro ao preparar edição:', err);
            mostrarToast('Não foi possível carregar a transação para edição.', true);
        }
    })();
}

async function handleDelete(id) {
    if (!confirm('Deseja excluir esta transação?')) return;

    try {
        const userId = localStorage.getItem('userId');
        const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE', headers: userId ? { 'x-user-id': userId } : {} });
        if (res.ok) {
            const apiResult = await fetchDataFromApi();
            if (apiResult) {
                CURRENT_CATEGORIES = apiResult.categories.map(normalizeCategory);
                CURRENT_TRANSACTIONS = apiResult.transacoes.map(normalizeTransaction);
                renderKpiCards(CURRENT_TRANSACTIONS, CURRENT_CATEGORIES);
                renderTrendChart(CURRENT_TRANSACTIONS);
                renderDonutChart(CURRENT_TRANSACTIONS, CURRENT_CATEGORIES);
                renderAlerts(CURRENT_TRANSACTIONS, CURRENT_CATEGORIES);
                renderTransactionsTable(CURRENT_TRANSACTIONS, CURRENT_CATEGORIES);
                mostrarToast('Transação excluída com sucesso!');
                return;
            }
        } else {
            throw new Error('API delete falhou');
        }
    } catch (err) {
        console.error('Exclusão via API falhou:', err);
        mostrarToast('Não foi possível excluir a transação.', true);
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        window.location.href = 'index.html';
        return;
    }

    let categories = [];
    let transacoes = [];
    let auditLogs = [];
    
    try {
        const apiResult = await fetchDataFromApi();
        if (apiResult && Array.isArray(apiResult.categories) && Array.isArray(apiResult.transacoes)) {
            categories = apiResult.categories.map(normalizeCategory);
            transacoes = apiResult.transacoes.map(normalizeTransaction);
            console.log('Dashboard BI carregado com dados da API');
        }
    } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err);
        const fallback = document.createElement('div');
        fallback.className = 'empty-state';
        fallback.textContent = 'Erro de conexão com o servidor. Verifique a API.';
        document.getElementById('app')?.appendChild(fallback) || document.body.appendChild(fallback);
        return;
    }

    try {
        const apiAudit = await fetchAuditLogs();
        if (Array.isArray(apiAudit)) {
            auditLogs = apiAudit;
        }
    } catch (err) {
        console.warn('Falha ao carregar logs de auditoria:', err);
    }

    CURRENT_CATEGORIES = categories;
    CURRENT_TRANSACTIONS = transacoes;
    CURRENT_AUDIT_LOGS = auditLogs;

    populateFilterOptions(categories);
    document.getElementById('filterCategory').addEventListener('change', () => renderTransactionsTable(transacoes, categories));
    document.getElementById('filterPeriod').addEventListener('change', () => renderTransactionsTable(transacoes, categories));

    try {
        renderKpiCards(transacoes, categories);
        renderTrendChart(transacoes);
        renderDonutChart(transacoes, categories);
        renderAlerts(transacoes, categories);
        renderAuditLogs(auditLogs);
        renderTransactionsTable(transacoes, categories);
    } catch (error) {
        console.error('Dashboard load failed:', error);
        const fallback = document.createElement('div');
        fallback.className = 'empty-state';
        fallback.textContent = 'Erro ao carregar o dashboard.';
        document.getElementById('app')?.appendChild(fallback) || document.body.appendChild(fallback);
    }
    window.lucide?.createIcons?.();
});

function renderAuditLogs(logs) {
    const container = document.getElementById('auditLogsList');
    if (!container) return;
    if (!Array.isArray(logs) || logs.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhum alerta de auditoria encontrado.</div>';
        return;
    }
    container.innerHTML = logs.map(log => `
        <div class="audit-card">
            <div class="audit-card-header">
                <span>${formatAuditDate(log.data_log)}</span>
            </div>
            <p>${log.mensagem}</p>
        </div>
    `).join('');
}
