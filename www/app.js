// ==========================================================================
// Gestor de Finances Personals - Application Controller
// ==========================================================================

const SMI_DEFAULT_INCOME = 1323.00; // Salari Mínim Interprofessional (SMI) en 12 pagues

function getCleanDefaultState() {
    return {
        monthly_income: SMI_DEFAULT_INCOME,
        days_in_month: 30,
        current_day: 1,
        setup_completed: false,
        categories: [
            { id: "housing", name: "Habitatge", percentage: 0.30, destination_fund: "Emergency", icon: "🏠", color: "#002b49" },
            { id: "transport", name: "Transport / Mobilitat", percentage: 0.10, destination_fund: "Emergency", icon: "🚗", color: "#007ea8" },
            { id: "food", name: "Alimentació bàsica", percentage: 0.10, destination_fund: "Emergency", icon: "🛒", color: "#059669" },
            { id: "utilities", name: "Subministraments i serveis", percentage: 0.05, destination_fund: "Emergency", icon: "⚡", color: "#d97706" },
            { id: "leisure", name: "Oci / Despeses personals", percentage: 0.25, destination_fund: "Goal", icon: "🎉", color: "#7c3aed" },
            { id: "savings", name: "Estalvi i inversions", percentage: 0.20, destination_fund: "Investment", icon: "📈", color: "#0284c7" }
        ],
        recurring_expenses: [],
        daily_expenses: [],
        emergency_fund_total: 0.0,
        goal_fund_total: 0.0,
        investment_fund_total: 0.0
    };
}

let state = getCleanDefaultState();

// Helper: Format Currency in European Catalan standard (ex: 1.323,00 €)
function formatCurrency(amount) {
    return (amount || 0).toLocaleString('ca-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + ' €';
}

// Helper: Monthly cost of a recurring expense
function getMonthlyCost(rec) {
    if (rec.frequency === 'Annually') return rec.amount / 12.0;
    if (rec.frequency === 'Quarterly') return rec.amount / 3.0;
    return rec.amount;
}

// Calculate Summaries for all categories
function calculateCategorySummaries() {
    const summaries = [];
    const days = state.days_in_month || 30;
    const currentDay = state.current_day || 1;

    state.categories.forEach(cat => {
        const grossMonthly = state.monthly_income * cat.percentage;
        const recMonthly = state.recurring_expenses
            .filter(r => r.category_id === cat.id)
            .reduce((sum, r) => sum + getMonthlyCost(r), 0.0);
        
        const netMonthly = grossMonthly - recMonthly;
        const grossDaily = grossMonthly / days;
        const recDaily = recMonthly / days;
        const netDaily = netMonthly / days;

        const spentThisMonth = state.daily_expenses
            .filter(e => e.category_id === cat.id)
            .reduce((sum, e) => sum + e.amount, 0.0);

        const accumulatedBalance = (netDaily * currentDay) - spentThisMonth;

        summaries.push({
            category: cat,
            grossMonthly,
            recMonthly,
            netMonthly,
            grossDaily,
            recDaily,
            netDaily,
            accumulatedBalance,
            spentThisMonth
        });
    });

    return summaries;
}

// Persist state in LocalStorage
function saveState() {
    localStorage.setItem('gestor_finances_personals_state', JSON.stringify(state));
    renderApp();
}

// Load state from LocalStorage
function loadStateFromStorage() {
    const saved = localStorage.getItem('gestor_finances_personals_state') || localStorage.getItem('budgeting_quest_state');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state = Object.assign(getCleanDefaultState(), parsed);
        } catch (e) {
            console.error('Error carregant estat:', e);
        }
    }
}

// ==========================================================================
// Backup & Restore (JSON File Export & Import)
// ==========================================================================

function exportStateToFile() {
    const jsonString = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const now = new Date().toISOString().split('T')[0];
    const a = document.createElement('a');
    a.href = url;
    a.download = `finances_personals_backup_${now}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importStateFromFile(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (typeof data.monthly_income !== 'number' || !Array.isArray(data.categories)) {
                alert("El fitxer seleccionat no té el format vàlid del Gestor de Finances.");
                return;
            }

            state = Object.assign(getCleanDefaultState(), data);
            state.setup_completed = true; // Ensure dashboard opens
            saveState();
            closeAllModals();
            alert("✅ S'han importat correctament totes les dades del fitxer.");
        } catch (err) {
            alert("Error en llegir el fitxer JSON: " + err.message);
        }
    };
    reader.readAsText(file);
}

// ==========================================================================
// Interactive Percentage Allocation Rendering & Updating
// ==========================================================================

const DEFAULT_PERCENTAGES = {
    housing: 0.30,
    transport: 0.10,
    food: 0.10,
    utilities: 0.05,
    leisure: 0.25,
    savings: 0.20
};

function renderAllocationTable(tbodyId, badgeId, incomeVal, isConfig = false) {
    const tbody = document.getElementById(tbodyId);
    const badge = document.getElementById(badgeId);
    if (!tbody) return;

    tbody.innerHTML = '';
    let totalPct = 0;

    state.categories.forEach((cat, index) => {
        const pctValue = Math.round(cat.percentage * 100);
        totalPct += pctValue;
        const grossMonth = incomeVal * cat.percentage;
        const grossDay = grossMonth / (state.days_in_month || 30);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 1.15rem;">${cat.icon}</span>
                    <strong style="color: var(--navy-primary);">${cat.name}</strong>
                </div>
            </td>
            <td>
                <div class="pct-input-group">
                    <input type="number" min="0" max="100" step="1" 
                           class="pct-input" 
                           data-cat-id="${cat.id}" 
                           data-target-table="${tbodyId}"
                           value="${pctValue}">
                    <span style="font-weight: 700; color: var(--text-muted);">%</span>
                </div>
            </td>
            <td style="font-variant-numeric: tabular-nums; font-weight: 600; color: var(--text-primary);">
                ${formatCurrency(grossMonth)}
            </td>
            <td style="font-variant-numeric: tabular-nums; color: var(--text-muted);">
                ${formatCurrency(grossDay)}/dia
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (badge) {
        badge.textContent = `Total: ${totalPct}%`;
        if (totalPct === 100) {
            badge.className = 'pct-badge';
            badge.style.color = 'var(--status-success)';
            badge.style.background = 'var(--status-success-bg)';
            badge.style.borderColor = 'var(--status-success-border)';
        } else {
            badge.className = 'pct-badge warning';
            badge.style.color = 'var(--status-warning)';
            badge.style.background = 'var(--status-warning-bg)';
            badge.style.borderColor = 'var(--status-warning-border)';
        }
    }

    // Attach input listeners
    tbody.querySelectorAll('.pct-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const catId = e.target.getAttribute('data-cat-id');
            let val = parseFloat(e.target.value);
            if (isNaN(val) || val < 0) val = 0;
            
            const cat = state.categories.find(c => c.id === catId);
            if (cat) {
                cat.percentage = val / 100.0;
            }

            const currentIncome = isConfig ? 
                parseFloat(document.getElementById('cfgIncome').value) || state.monthly_income :
                parseFloat(document.getElementById('onboardIncome').value) || state.monthly_income;

            renderAllocationTable(tbodyId, badgeId, currentIncome, isConfig);
        });
    });
}

function resetDefaultPercentages() {
    state.categories.forEach(cat => {
        if (DEFAULT_PERCENTAGES[cat.id] !== undefined) {
            cat.percentage = DEFAULT_PERCENTAGES[cat.id];
        }
    });
}

// ==========================================================================
// Main Application Rendering
// ==========================================================================

function renderApp() {
    loadStateFromStorage();

    // Onboarding status
    const onboardOverlay = document.getElementById('onboardingScreen');
    if (!state.setup_completed) {
        onboardOverlay.classList.add('active');
        const incomeInput = document.getElementById('onboardIncome');
        if (incomeInput && (!incomeInput.value || parseFloat(incomeInput.value) <= 0)) {
            incomeInput.value = (state.monthly_income || SMI_DEFAULT_INCOME).toFixed(2);
        }
        const curIncome = parseFloat(incomeInput.value) || SMI_DEFAULT_INCOME;
        renderAllocationTable('onboardCategoriesTableBody', 'onboardTotalPctBadge', curIncome, false);
        renderOnboardRecTable();
    } else {
        onboardOverlay.classList.remove('active');
    }

    // Header values & Simulator
    document.getElementById('dayIndicator').textContent = `Dia ${state.current_day} de ${state.days_in_month}`;

    const summaries = calculateCategorySummaries();

    // Summary KPI metrics
    const totalRecMonthly = state.recurring_expenses.reduce((s, r) => s + getMonthlyCost(r), 0.0);
    const totalNetDaily = summaries.reduce((s, c) => s + c.netDaily, 0.0);
    const positiveCount = summaries.filter(s => s.accumulatedBalance >= 0.0).length;

    document.getElementById('valIncome').textContent = formatCurrency(state.monthly_income);
    document.getElementById('valRecurring').textContent = formatCurrency(totalRecMonthly);
    document.getElementById('valDailyTotal').textContent = formatCurrency(totalNetDaily) + '/dia';

    const valStreak = document.getElementById('valStreak');
    const valStreakSub = document.getElementById('valStreakSub');
    if (positiveCount === summaries.length) {
        valStreak.textContent = `${positiveCount}/${summaries.length} en Superàvit`;
        valStreak.className = 'card-value text-emerald';
        valStreakSub.textContent = 'Totes les partides sota control';
    } else {
        const deficitCount = summaries.length - positiveCount;
        valStreak.textContent = `${positiveCount}/${summaries.length} en Superàvit`;
        valStreak.className = 'card-value text-amber';
        valStreakSub.textContent = `${deficitCount} partida(es) en dèficit temporal`;
    }

    // Render Category Cards Grid
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = '';

    summaries.forEach(s => {
        const isPositive = s.accumulatedBalance >= 0.0;
        const pctFormatted = Math.round(s.category.percentage * 100);
        const card = document.createElement('div');
        card.className = 'category-card';

        // Calculation of progress percentage for monthly consumption
        const spentPct = s.netMonthly > 0 ? Math.min(100, Math.max(0, (s.spentThisMonth / s.netMonthly) * 100)) : 0;
        const isOverlimit = s.accumulatedBalance < 0.0;

        card.innerHTML = `
            <div>
                <div class="cat-top">
                    <div class="cat-info">
                        <div class="cat-icon-badge">${s.category.icon}</div>
                        <div class="cat-names">
                            <h3>${s.category.name}</h3>
                            <div class="cat-pct">${pctFormatted}% del Sou (${formatCurrency(s.grossMonthly)}/mes)</div>
                        </div>
                    </div>
                    <div class="cat-status-pill ${isPositive ? '' : 'negative'}">
                        ${isPositive ? 'En Superàvit' : 'Excedit'}
                    </div>
                </div>

                <div class="cat-balance-box">
                    <div class="label">Saldo Acumulat Disponible</div>
                    <div class="amount" style="color: ${isPositive ? 'var(--status-success)' : 'var(--status-danger)'};">
                        ${formatCurrency(s.accumulatedBalance)}
                    </div>
                </div>

                <div class="cat-metrics-row">
                    <span>Límit Diari Net:</span>
                    <span class="val">${formatCurrency(s.netDaily)}/dia</span>
                </div>
                <div class="cat-metrics-row">
                    <span>Despeses Recurrents:</span>
                    <span class="val">${formatCurrency(s.recMonthly)}/mes</span>
                </div>
                <div class="cat-metrics-row">
                    <span>Gastat aquest mes:</span>
                    <span class="val" style="color: ${s.spentThisMonth > 0 ? 'var(--text-primary)' : 'var(--text-muted)'};">
                        ${formatCurrency(s.spentThisMonth)}
                    </span>
                </div>

                <div class="cat-progress-container">
                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">
                        <span>Consum mensual net</span>
                        <span>${spentPct.toFixed(0)}%</span>
                    </div>
                    <div class="cat-progress-bar">
                        <div class="cat-progress-fill ${isOverlimit ? 'overlimit' : ''}" style="width: ${spentPct}%;"></div>
                    </div>
                </div>
            </div>

            <div class="cat-card-actions">
                <button class="btn btn-outline btn-sm" style="width: 100%;" onclick="openAddExpenseForCat('${s.category.id}')">
                    + Anotar Despesa
                </button>
            </div>
        `;
        grid.appendChild(card);
    });

    // Funds
    document.getElementById('fundEmergency').textContent = formatCurrency(state.emergency_fund_total);
    document.getElementById('fundGoal').textContent = formatCurrency(state.goal_fund_total);
    document.getElementById('fundInvestment').textContent = formatCurrency(state.investment_fund_total);

    // Expense History Table
    renderExpensesTable();

    // Config Dialog Tables & Fields
    document.getElementById('cfgIncome').value = state.monthly_income;
    renderRecurringTable();
    populateCategoryDropdowns();
}

// ==========================================================================
// Dropdowns & Forms Rendering
// ==========================================================================

function populateCategoryDropdowns() {
    const selects = [
        document.getElementById('expCategory'),
        document.getElementById('recCategory'),
        document.getElementById('onboardRecCat')
    ];

    selects.forEach(sel => {
        if (!sel) return;
        const curVal = sel.value;
        sel.innerHTML = '';
        state.categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = `${cat.icon} ${cat.name} (${Math.round(cat.percentage * 100)}%)`;
            sel.appendChild(opt);
        });
        if (curVal) sel.value = curVal;
    });
}

function renderExpensesTable() {
    const tbody = document.getElementById('expensesTableBody');
    tbody.innerHTML = '';

    if (state.daily_expenses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">No hi ha moviments diaris registrats per a aquest període.</td></tr>`;
        return;
    }

    // Sort by date/id descending
    const sorted = [...state.daily_expenses].reverse();

    sorted.forEach(exp => {
        const cat = state.categories.find(c => c.id === exp.category_id) || { name: 'Altres', icon: '🏷️' };
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span style="font-weight: 600; color: var(--text-primary);">${exp.date || 'Dia ' + state.current_day}</span></td>
            <td><span class="cell-badge">${cat.icon} ${cat.name}</span></td>
            <td>${exp.note || '-'}</td>
            <td class="cell-amount">${formatCurrency(exp.amount)}</td>
            <td style="text-align: right;">
                <button class="btn btn-outline btn-sm" onclick="editExpense('${exp.id}')">✏️ Editar</button>
                <button class="btn btn-ghost btn-sm" onclick="deleteExpense('${exp.id}')" style="color: var(--status-danger);">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderRecurringTable() {
    const tbody = document.getElementById('recurringTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (state.recurring_expenses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 18px;">Sense despeses recurrents configurades.</td></tr>`;
        return;
    }

    state.recurring_expenses.forEach(rec => {
        const cat = state.categories.find(c => c.id === rec.category_id) || { name: 'Altres', icon: '🏷️' };
        const freqText = rec.frequency === 'Annually' ? 'Anual' : (rec.frequency === 'Quarterly' ? 'Trimestral' : 'Mensual');
        const monthly = getMonthlyCost(rec);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${rec.name}</strong></td>
            <td>${formatCurrency(rec.amount)}</td>
            <td><span class="card-badge" style="background: var(--blue-subtle);">${freqText}</span></td>
            <td style="font-weight: 600;">${formatCurrency(monthly)}/mes</td>
            <td><span class="cell-badge">${cat.icon} ${cat.name}</span></td>
            <td style="text-align: right;">
                <button class="btn btn-outline btn-sm" onclick="editRecurring('${rec.id}')">✏️ Editar</button>
                <button class="btn btn-ghost btn-sm" onclick="deleteRecurring('${rec.id}')" style="color: var(--status-danger);">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderOnboardRecTable() {
    const tbody = document.getElementById('onboardRecTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (state.recurring_expenses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 14px;">No hi ha cap despesa recurrent afegida. Podeu continuar o afegir-ne a sota.</td></tr>`;
        return;
    }

    state.recurring_expenses.forEach(rec => {
        const cat = state.categories.find(c => c.id === rec.category_id) || { name: 'Altres', icon: '🏷️' };
        const freqText = rec.frequency === 'Annually' ? 'Anual' : (rec.frequency === 'Quarterly' ? 'Trimestral' : 'Mensual');
        const monthly = getMonthlyCost(rec);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${rec.name}</strong></td>
            <td>${formatCurrency(rec.amount)}</td>
            <td>${freqText}</td>
            <td>${formatCurrency(monthly)}/mes</td>
            <td>${cat.icon} ${cat.name}</td>
            <td>
                <button class="btn btn-ghost btn-sm" onclick="deleteRecurring('${rec.id}')" style="color: var(--status-danger);">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================================================
// Operations: Daily Expenses (Add, Edit, Delete)
// ==========================================================================

function openAddExpenseForCat(catId) {
    document.getElementById('expEditId').value = '';
    document.getElementById('expAmount').value = '';
    document.getElementById('expNote').value = '';
    document.getElementById('modalExpenseTitle').textContent = 'Registrar Nova Despesa Diària';
    
    populateCategoryDropdowns();
    if (catId) {
        document.getElementById('expCategory').value = catId;
    }

    document.getElementById('modalExpense').classList.add('active');
    setTimeout(() => document.getElementById('expAmount').focus(), 50);
}

function editExpense(id) {
    const exp = state.daily_expenses.find(e => e.id === id);
    if (!exp) return;

    document.getElementById('expEditId').value = exp.id;
    populateCategoryDropdowns();
    document.getElementById('expCategory').value = exp.category_id;
    document.getElementById('expAmount').value = exp.amount;
    document.getElementById('expNote').value = exp.note;
    document.getElementById('modalExpenseTitle').textContent = 'Modificar Despesa Diària';

    document.getElementById('modalExpense').classList.add('active');
}

function deleteExpense(id) {
    if (confirm("Segur que voleu eliminar aquest moviment?")) {
        state.daily_expenses = state.daily_expenses.filter(e => e.id !== id);
        saveState();
    }
}

// ==========================================================================
// Operations: Recurring Expenses (Add, Edit, Delete)
// ==========================================================================

function editRecurring(id) {
    const rec = state.recurring_expenses.find(r => r.id === id);
    if (!rec) return;

    document.getElementById('recEditId').value = rec.id;
    document.getElementById('recName').value = rec.name;
    document.getElementById('recAmount').value = rec.amount;
    document.getElementById('recFreq').value = rec.frequency;
    document.getElementById('recCategory').value = rec.category_id;

    document.getElementById('recFormTitle').textContent = 'Modificar Despesa Recurrent';
    document.getElementById('btnSubmitRecurring').textContent = 'Actualitzar Recurrent';
}

function deleteRecurring(id) {
    if (confirm("Segur que voleu eliminar aquesta despesa recurrent?")) {
        state.recurring_expenses = state.recurring_expenses.filter(r => r.id !== id);
        saveState();
        renderOnboardRecTable();
    }
}

// ==========================================================================
// Time Simulation & Month Settlement
// ==========================================================================

function advanceDay() {
    if (state.current_day < state.days_in_month) {
        state.current_day += 1;
        saveState();
    } else {
        settleMonth();
    }
}

function settleMonth() {
    const summaries = calculateCategorySummaries();
    let emergencySurplus = 0.0;
    let goalSurplus = 0.0;
    let investmentTotal = 0.0;
    let totalSpent = 0.0;
    let victories = 0;
    let deficits = 0;

    summaries.forEach(s => {
        totalSpent += s.spentThisMonth;
        if (s.accumulatedBalance >= 0.0) {
            victories += 1;
        } else {
            deficits += 1;
        }

        if (s.category.destination_fund === 'Emergency') {
            if (s.accumulatedBalance > 0.0) emergencySurplus += s.accumulatedBalance;
        } else if (s.category.destination_fund === 'Goal') {
            if (s.accumulatedBalance > 0.0) goalSurplus += s.accumulatedBalance;
        } else if (s.category.destination_fund === 'Investment') {
            investmentTotal += s.grossMonthly;
        }
    });

    state.emergency_fund_total += emergencySurplus;
    state.goal_fund_total += goalSurplus;
    state.investment_fund_total += investmentTotal;

    // Reset cycle
    state.current_day = 1;
    state.daily_expenses = [];
    saveState();

    // Show Settlement Banner
    const container = document.getElementById('settlementContainer');
    container.style.display = 'block';
    container.innerHTML = `
        <div class="settlement-card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3>🎉 Liquidació i Tancament de Període Mensual</h3>
                <button class="btn btn-secondary btn-sm" onclick="document.getElementById('settlementContainer').style.display='none'">✕ Tancar</button>
            </div>
            <p style="color: #e0f2fe; margin-top: -6px;">S'han traslladat els romanents positius als vostres fons consolidats i s'ha iniciat el nou mes.</p>
            <div class="settlement-grid">
                <div class="settlement-tile">
                    <div class="lbl">Fons d'Emergència (+ Sobrant)</div>
                    <div class="val">+${formatCurrency(emergencySurplus)}</div>
                </div>
                <div class="settlement-tile">
                    <div class="lbl">Fons d'Objectius & Projectes</div>
                    <div class="val">+${formatCurrency(goalSurplus)}</div>
                </div>
                <div class="settlement-tile">
                    <div class="lbl">Fons d'Estalvi i Inversió</div>
                    <div class="val">+${formatCurrency(investmentTotal)}</div>
                </div>
                <div class="settlement-tile">
                    <div class="lbl">Partides en Superàvit</div>
                    <div class="val" style="color: #34d399;">${victories} / ${summaries.length}</div>
                </div>
            </div>
        </div>
    `;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
}

// ==========================================================================
// Event Listeners Initialization
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadStateFromStorage();
    renderApp();

    // Onboarding Salary Input listener
    const onboardIncomeInput = document.getElementById('onboardIncome');
    if (onboardIncomeInput) {
        onboardIncomeInput.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value) || 0;
            state.monthly_income = val;
            renderAllocationTable('onboardCategoriesTableBody', 'onboardTotalPctBadge', val, false);
        });
    }

    // Reset default percentages in Onboarding & Config
    const btnResetPcts = document.getElementById('btnResetDefaultPcts');
    if (btnResetPcts) {
        btnResetPcts.addEventListener('click', () => {
            resetDefaultPercentages();
            const val = parseFloat(onboardIncomeInput.value) || state.monthly_income;
            renderAllocationTable('onboardCategoriesTableBody', 'onboardTotalPctBadge', val, false);
        });
    }

    const btnCfgResetPcts = document.getElementById('btnCfgResetPcts');
    if (btnCfgResetPcts) {
        btnCfgResetPcts.addEventListener('click', () => {
            resetDefaultPercentages();
            const val = parseFloat(document.getElementById('cfgIncome').value) || state.monthly_income;
            renderAllocationTable('cfgCategoriesTableBody', 'cfgTotalPctBadge', val, true);
        });
    }

    // Onboarding Wizard Navigation
    document.getElementById('btnGoToStep2').addEventListener('click', () => {
        const income = parseFloat(document.getElementById('onboardIncome').value);
        if (isNaN(income) || income <= 0) {
            alert("Si us plau, introduïu un salari net mensual vàlid.");
            return;
        }
        state.monthly_income = income;
        populateCategoryDropdowns();
        renderOnboardRecTable();

        document.getElementById('onboardingStep1').classList.remove('active');
        document.getElementById('onboardingStep2').classList.add('active');
    });

    document.getElementById('btnBackToStep1').addEventListener('click', () => {
        document.getElementById('onboardingStep2').classList.remove('active');
        document.getElementById('onboardingStep1').classList.add('active');
    });

    document.getElementById('btnFinishOnboarding').addEventListener('click', () => {
        state.setup_completed = true;
        saveState();
    });

    // Form Add Recurring during Onboarding
    document.getElementById('formOnboardAddRec').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('onboardRecName').value.trim();
        const amount = parseFloat(document.getElementById('onboardRecAmount').value);
        const freq = document.getElementById('onboardRecFreq').value;
        const catId = document.getElementById('onboardRecCat').value;

        if (!name || isNaN(amount) || amount <= 0) return;

        state.recurring_expenses.push({
            id: 'rec_' + Date.now(),
            name,
            amount,
            frequency: freq,
            category_id: catId
        });

        document.getElementById('onboardRecName').value = '';
        document.getElementById('onboardRecAmount').value = '';
        renderOnboardRecTable();
    });

    // Header Actions
    document.getElementById('btnAdvanceDay').addEventListener('click', advanceDay);

    document.getElementById('btnOpenExpenseModal').addEventListener('click', () => openAddExpenseForCat(null));

    document.getElementById('btnOpenConfigModal').addEventListener('click', () => {
        document.getElementById('cfgIncome').value = state.monthly_income;
        renderAllocationTable('cfgCategoriesTableBody', 'cfgTotalPctBadge', state.monthly_income, true);
        renderRecurringTable();
        populateCategoryDropdowns();
        document.getElementById('modalConfig').classList.add('active');
    });

    // Close Modals
    document.getElementById('btnCloseExpenseModal').addEventListener('click', () => {
        document.getElementById('modalExpense').classList.remove('active');
    });
    document.getElementById('btnCancelExpense').addEventListener('click', () => {
        document.getElementById('modalExpense').classList.remove('active');
    });
    document.getElementById('btnCloseConfigModal').addEventListener('click', () => {
        document.getElementById('modalConfig').classList.remove('active');
    });

    // Save Expense Form Submit
    document.getElementById('formExpense').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('expEditId').value;
        const catId = document.getElementById('expCategory').value;
        const amount = parseFloat(document.getElementById('expAmount').value);
        const note = document.getElementById('expNote').value.trim();

        if (isNaN(amount) || amount <= 0) return;

        if (id) {
            const exp = state.daily_expenses.find(e => e.id === id);
            if (exp) {
                exp.category_id = catId;
                exp.amount = amount;
                exp.note = note;
            }
        } else {
            state.daily_expenses.push({
                id: 'exp_' + Date.now(),
                date: `Dia ${state.current_day}`,
                amount,
                category_id: catId,
                note
            });
        }

        saveState();
        document.getElementById('modalExpense').classList.remove('active');
    });

    // Save Income in Config Modal
    document.getElementById('btnSaveIncome').addEventListener('click', () => {
        const val = parseFloat(document.getElementById('cfgIncome').value);
        if (!isNaN(val) && val >= 0) {
            state.monthly_income = val;
            saveState();
            renderAllocationTable('cfgCategoriesTableBody', 'cfgTotalPctBadge', state.monthly_income, true);
            alert("✅ Sou net mensual actualitzat correctament.");
        }
    });

    // Save Percentages in Config Modal
    const btnSavePercentages = document.getElementById('btnSavePercentages');
    if (btnSavePercentages) {
        btnSavePercentages.addEventListener('click', () => {
            saveState();
            alert("✅ Percentatges de les partides actualitzats correctament.");
        });
    }

    // Add Recurring in Config Modal
    document.getElementById('formAddRecurring').addEventListener('submit', (e) => {
        e.preventDefault();
        const editId = document.getElementById('recEditId').value;
        const name = document.getElementById('recName').value.trim();
        const amount = parseFloat(document.getElementById('recAmount').value);
        const freq = document.getElementById('recFreq').value;
        const catId = document.getElementById('recCategory').value;

        if (!name || isNaN(amount) || amount <= 0) return;

        if (editId) {
            const rec = state.recurring_expenses.find(r => r.id === editId);
            if (rec) {
                rec.name = name;
                rec.amount = amount;
                rec.frequency = freq;
                rec.category_id = catId;
            }
            document.getElementById('recEditId').value = '';
            document.getElementById('recFormTitle').textContent = 'Afegir Nova Despesa Recurrent';
            document.getElementById('btnSubmitRecurring').textContent = '+ Guardar Recurrent';
        } else {
            state.recurring_expenses.push({
                id: 'rec_' + Date.now(),
                name,
                amount,
                frequency: freq,
                category_id: catId
            });
        }

        document.getElementById('recName').value = '';
        document.getElementById('recAmount').value = '';
        saveState();
        renderRecurringTable();
    });

    // Restart Onboarding Button
    document.getElementById('btnRestartOnboarding').addEventListener('click', () => {
        if (confirm("Voleu tornar a obrir l'assistent de configuració inicial?")) {
            state.setup_completed = false;
            saveState();
            closeAllModals();
            document.getElementById('onboardingStep2').classList.remove('active');
            document.getElementById('onboardingStep1').classList.add('active');
        }
    });

    // Reset All Data Button
    document.getElementById('btnResetAllData').addEventListener('click', () => {
        if (confirm("⚠️ Atenció: Això esborrarà totes les dades i reiniciarà l'aplicació de zero. Voleu continuar?")) {
            localStorage.removeItem('gestor_finances_personals_state');
            localStorage.removeItem('budgeting_quest_state');
            state = getCleanDefaultState();
            renderApp();
            closeAllModals();
        }
    });

    // Clear Expense History Button
    document.getElementById('btnClearExpenses').addEventListener('click', () => {
        if (confirm("Voleu netejar totes les despeses diàries registrades?")) {
            state.daily_expenses = [];
            saveState();
        }
    });

    // Backup & Restore File Trigger Handlers
    const globalFileInput = document.getElementById('globalFileInputImport');
    globalFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            importStateFromFile(e.target.files[0]);
            globalFileInput.value = ''; // Reset
        }
    });

    const triggerImport = () => globalFileInput.click();

    document.getElementById('btnHeaderExport').addEventListener('click', exportStateToFile);
    document.getElementById('btnHeaderImport').addEventListener('click', triggerImport);
    document.getElementById('btnModalExport').addEventListener('click', exportStateToFile);
    document.getElementById('btnModalImport').addEventListener('click', triggerImport);
    document.getElementById('btnOnboardImport').addEventListener('click', triggerImport);
});
