// ==========================================================================
// Gestor de Finances Personals - Application Controller (WebAssembly Engine)
// ==========================================================================

import init, {
    wasm_get_default_config,
    wasm_get_all_summaries,
    wasm_add_expense,
    wasm_update_expense,
    wasm_remove_expense,
    wasm_clear_expenses,
    wasm_update_income,
    wasm_update_category_percentage,
    wasm_reset_default_percentages,
    wasm_add_recurring,
    wasm_update_recurring,
    wasm_remove_recurring,
    wasm_advance_day_with_settlement,
    wasm_settle_month
} from './pkg/budgeting_app.js';

let state = null;
let wasmInitialized = false;

// Helper: Format Currency in European Catalan standard (ex: 1.323,00 €)
export function formatCurrency(amount) {
    return (amount || 0).toLocaleString('ca-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + ' €';
}

// Load default state directly from Rust WASM
function getCleanDefaultState() {
    if (wasmInitialized) {
        return JSON.parse(wasm_get_default_config());
    }
    return {
        monthly_income: 1323.00,
        days_in_month: 30,
        current_day: 1,
        setup_completed: true,
        categories: [],
        recurring_expenses: [],
        daily_expenses: [],
        emergency_fund_total: 0.0,
        goal_fund_total: 0.0,
        investment_fund_total: 0.0
    };
}

// Persist state in LocalStorage
function saveState() {
    localStorage.setItem('gestor_finances_personals_state', JSON.stringify(state));
    renderApp();
}

// Load state from LocalStorage or Rust WASM Default
function loadStateFromStorage() {
    const saved = localStorage.getItem('gestor_finances_personals_state') || localStorage.getItem('budgeting_quest_state');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state = Object.assign(getCleanDefaultState(), parsed);
            return;
        } catch (e) {
            console.error('Error carregant estat des de LocalStorage:', e);
        }
    }
    state = getCleanDefaultState();
}

// Helper: Monthly cost of a recurring expense
function getRecurringMonthlyCost(rec) {
    if (rec.frequency === 'Annually') return rec.amount / 12.0;
    if (rec.frequency === 'Quarterly') return rec.amount / 3.0;
    return rec.amount;
}

// ==========================================================================
// Backup & Restore (JSON File Export & Import)
// ==========================================================================

export function exportStateToFile() {
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

export function importStateFromFile(file) {
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

function renderAllocationTable(tbodyId, badgeId, incomeVal, isConfig = false) {
    const tbody = document.getElementById(tbodyId);
    const badge = document.getElementById(badgeId);
    if (!tbody || !state || !state.categories) return;

    tbody.innerHTML = '';
    let totalPct = 0;

    state.categories.forEach((cat) => {
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
            
            // Delegate percentage update to Rust WASM
            state = JSON.parse(wasm_update_category_percentage(JSON.stringify(state), catId, val / 100.0));

            const currentIncome = isConfig ? 
                parseFloat(document.getElementById('cfgIncome').value) || state.monthly_income :
                parseFloat(document.getElementById('onboardIncome').value) || state.monthly_income;

            renderAllocationTable(tbodyId, badgeId, currentIncome, isConfig);
        });
    });
}

function resetDefaultPercentages(tbodyId, badgeId, isConfig = false) {
    // Delegate reset to Rust WASM
    state = JSON.parse(wasm_reset_default_percentages(JSON.stringify(state)));
    const currentIncome = isConfig ?
        parseFloat(document.getElementById('cfgIncome').value) || state.monthly_income :
        parseFloat(document.getElementById('onboardIncome').value) || state.monthly_income;
    renderAllocationTable(tbodyId, badgeId, currentIncome, isConfig);
}

// ==========================================================================
// Main Application Rendering (Driven by Rust WASM Summaries)
// ==========================================================================

function renderApp() {
    if (!wasmInitialized || !state) return;

    // Onboarding status
    const onboardOverlay = document.getElementById('onboardingScreen');
    if (!state.setup_completed) {
        onboardOverlay.classList.add('active');
        const incomeInput = document.getElementById('onboardIncome');
        if (incomeInput && (!incomeInput.value || parseFloat(incomeInput.value) <= 0)) {
            incomeInput.value = (state.monthly_income || 1323.00).toFixed(2);
        }
        const curIncome = parseFloat(incomeInput.value) || 1323.00;
        renderAllocationTable('onboardCategoriesTableBody', 'onboardTotalPctBadge', curIncome, false);
        renderOnboardRecTable();
    } else {
        onboardOverlay.classList.remove('active');
    }

    // Header values & Simulator
    document.getElementById('dayIndicator').textContent = `Dia ${state.current_day} de ${state.days_in_month}`;

    // Get 100% of calculation summaries from Rust WebAssembly
    const summariesJson = wasm_get_all_summaries(JSON.stringify(state));
    const summaries = JSON.parse(summariesJson);

    // Summary KPI metrics
    const totalRecMonthly = summaries.reduce((sum, s) => sum + s.recurring_monthly_cost, 0.0);
    const totalNetDaily = summaries.reduce((sum, s) => sum + s.net_daily_budget, 0.0);
    const positiveCount = summaries.filter(s => s.accumulated_balance >= 0.0).length;

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
        const isPositive = s.accumulated_balance >= 0.0;
        const pctFormatted = Math.round(s.category.percentage * 100);
        const card = document.createElement('div');
        card.className = 'category-card';

        // Monthly net progress percentage
        const spentPct = s.net_monthly_budget > 0 ? 
            Math.min(100, Math.max(0, (s.spent_this_month / s.net_monthly_budget) * 100)) : 0;
        const isOverlimit = s.accumulated_balance < 0.0;

        card.innerHTML = `
            <div>
                <div class="cat-top">
                    <div class="cat-info">
                        <div class="cat-icon-badge">${s.category.icon}</div>
                        <div class="cat-names">
                            <h3>${s.category.name}</h3>
                            <div class="cat-pct">${pctFormatted}% del Sou (${formatCurrency(s.gross_monthly_budget)}/mes)</div>
                        </div>
                    </div>
                    <div class="cat-status-pill ${isPositive ? '' : 'negative'}">
                        ${isPositive ? 'En Superàvit' : 'Excedit'}
                    </div>
                </div>

                <div class="cat-balance-box">
                    <div class="label">Saldo Acumulat Disponible</div>
                    <div class="amount" style="color: ${isPositive ? 'var(--status-success)' : 'var(--status-danger)'};">
                        ${formatCurrency(s.accumulated_balance)}
                    </div>
                </div>

                <div class="cat-metrics-row">
                    <span>Límit Diari Net:</span>
                    <span class="val">${formatCurrency(s.net_daily_budget)}/dia</span>
                </div>
                <div class="cat-metrics-row">
                    <span>Despeses Recurrents:</span>
                    <span class="val">${formatCurrency(s.recurring_monthly_cost)}/mes</span>
                </div>
                <div class="cat-metrics-row">
                    <span>Gastat aquest mes:</span>
                    <span class="val" style="color: ${s.spent_this_month > 0 ? 'var(--text-primary)' : 'var(--text-muted)'};">
                        ${formatCurrency(s.spent_this_month)}
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
                <button class="btn btn-outline btn-sm" style="width: 100%;" onclick="window.openAddExpenseForCat('${s.category.id}')">
                    + Anotar Despesa
                </button>
            </div>
        `;
        grid.appendChild(card);
    });

    // Funds (Calculated and held in Rust state)
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
        if (!sel || !state || !state.categories) return;
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
    if (!tbody || !state) return;
    tbody.innerHTML = '';

    if (!state.daily_expenses || state.daily_expenses.length === 0) {
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
                <button class="btn btn-outline btn-sm" onclick="window.editExpense('${exp.id}')">✏️ Editar</button>
                <button class="btn btn-ghost btn-sm" onclick="window.deleteExpense('${exp.id}')" style="color: var(--status-danger);">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderRecurringTable() {
    const tbody = document.getElementById('recurringTableBody');
    if (!tbody || !state) return;
    tbody.innerHTML = '';

    if (!state.recurring_expenses || state.recurring_expenses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 18px;">Sense despeses recurrents configurades.</td></tr>`;
        return;
    }

    state.recurring_expenses.forEach(rec => {
        const cat = state.categories.find(c => c.id === rec.category_id) || { name: 'Altres', icon: '🏷️' };
        const freqText = rec.frequency === 'Annually' ? 'Anual' : (rec.frequency === 'Quarterly' ? 'Trimestral' : 'Mensual');
        const monthly = getRecurringMonthlyCost(rec);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${rec.name}</strong></td>
            <td>${formatCurrency(rec.amount)}</td>
            <td><span class="card-badge" style="background: var(--blue-subtle);">${freqText}</span></td>
            <td style="font-weight: 600;">${formatCurrency(monthly)}/mes</td>
            <td><span class="cell-badge">${cat.icon} ${cat.name}</span></td>
            <td style="text-align: right;">
                <button class="btn btn-outline btn-sm" onclick="window.editRecurring('${rec.id}')">✏️ Editar</button>
                <button class="btn btn-ghost btn-sm" onclick="window.deleteRecurring('${rec.id}')" style="color: var(--status-danger);">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderOnboardRecTable() {
    const tbody = document.getElementById('onboardRecTableBody');
    if (!tbody || !state) return;
    tbody.innerHTML = '';

    if (!state.recurring_expenses || state.recurring_expenses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 14px;">No hi ha cap despesa recurrent afegida. Podeu continuar o afegir-ne a sota.</td></tr>`;
        return;
    }

    state.recurring_expenses.forEach(rec => {
        const cat = state.categories.find(c => c.id === rec.category_id) || { name: 'Altres', icon: '🏷️' };
        const freqText = rec.frequency === 'Annually' ? 'Anual' : (rec.frequency === 'Quarterly' ? 'Trimestral' : 'Mensual');
        const monthly = getRecurringMonthlyCost(rec);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${rec.name}</strong></td>
            <td>${formatCurrency(rec.amount)}</td>
            <td><span class="card-badge" style="background: var(--blue-subtle);">${freqText}</span></td>
            <td style="font-weight: 600;">${formatCurrency(monthly)}/mes</td>
            <td><span class="cell-badge">${cat.icon} ${cat.name}</span></td>
            <td style="text-align: right;">
                <button class="btn btn-ghost btn-sm" onclick="window.deleteRecurring('${rec.id}')" style="color: var(--status-danger);" title="Eliminar">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================================================
// Operations: Daily Expenses (Delegated to Rust WASM)
// ==========================================================================

export function openAddExpenseForCat(catId) {
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

export function editExpense(id) {
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

export function deleteExpense(id) {
    if (confirm("Segur que voleu eliminar aquest moviment?")) {
        state = JSON.parse(wasm_remove_expense(JSON.stringify(state), id));
        saveState();
    }
}

// ==========================================================================
// Operations: Recurring Expenses (Delegated to Rust WASM)
// ==========================================================================

export function editRecurring(id) {
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

export function deleteRecurring(id) {
    if (confirm("Segur que voleu eliminar aquesta despesa recurrent?")) {
        state = JSON.parse(wasm_remove_recurring(JSON.stringify(state), id));
        saveState();
        renderOnboardRecTable();
    }
}

// ==========================================================================
// Time Simulation & Month Settlement (Calculated exclusively in Rust)
// ==========================================================================

function displaySettlementCard(settlement) {
    const container = document.getElementById('settlementContainer');
    if (!container) return;
    container.style.display = 'block';
    container.innerHTML = `
        <div class="settlement-card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3>🎉 Liquidació i Tancament de Període Mensual</h3>
                <button class="btn btn-secondary btn-sm" onclick="document.getElementById('settlementContainer').style.display='none'">✕ Tancar</button>
            </div>
            <p style="color: #e0f2fe; margin-top: -6px;">El motor financer en Rust ha transferit els romanents positius als vostres fons consolidats.</p>
            <div class="settlement-grid">
                <div class="settlement-tile">
                    <div class="lbl">Fons d'Emergència (+ Sobrant)</div>
                    <div class="val">+${formatCurrency(settlement.total_saved_emergency)}</div>
                </div>
                <div class="settlement-tile">
                    <div class="lbl">Fons d'Objectius & Projectes</div>
                    <div class="val">+${formatCurrency(settlement.total_saved_goals)}</div>
                </div>
                <div class="settlement-tile">
                    <div class="lbl">Fons d'Estalvi i Inversió</div>
                    <div class="val">+${formatCurrency(settlement.total_invested)}</div>
                </div>
                <div class="settlement-tile">
                    <div class="lbl">Partides en Superàvit</div>
                    <div class="val" style="color: #34d399;">${settlement.victories_count} / ${state.categories.length}</div>
                </div>
            </div>
        </div>
    `;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function advanceDay() {
    // Advance day with settlement calculation directly inside Rust WASM
    const res = JSON.parse(wasm_advance_day_with_settlement(JSON.stringify(state)));
    state = res.config;
    saveState();

    if (res.settlement) {
        displaySettlementCard(res.settlement);
    }
}

function settleMonthManually() {
    // Settle month directly inside Rust WASM
    const res = JSON.parse(wasm_settle_month(JSON.stringify(state)));
    state = res.config;
    saveState();
    displaySettlementCard(res.settlement);
}

function closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
}

// Global exposure for inline HTML event handlers
window.openAddExpenseForCat = openAddExpenseForCat;
window.editExpense = editExpense;
window.deleteExpense = deleteExpense;
window.editRecurring = editRecurring;
window.deleteRecurring = deleteRecurring;

// ==========================================================================
// Event Listeners & Application Bootstrapping
// ==========================================================================

async function bootstrap() {
    try {
        // Initialize Rust WebAssembly module
        await init();
        wasmInitialized = true;
        console.log("🦀 Motor financer en Rust (WebAssembly) inicialitzat correctament.");

        loadStateFromStorage();
        renderApp();

        // Onboarding Salary Input listener
        const onboardIncomeInput = document.getElementById('onboardIncome');
        if (onboardIncomeInput) {
            onboardIncomeInput.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value) || 0;
                state = JSON.parse(wasm_update_income(JSON.stringify(state), val));
                renderAllocationTable('onboardCategoriesTableBody', 'onboardTotalPctBadge', val, false);
            });
        }

        // Reset default percentages in Onboarding & Config
        const btnResetPcts = document.getElementById('btnResetDefaultPcts');
        if (btnResetPcts) {
            btnResetPcts.addEventListener('click', () => {
                resetDefaultPercentages('onboardCategoriesTableBody', 'onboardTotalPctBadge', false);
            });
        }

        const btnCfgResetPcts = document.getElementById('btnCfgResetPcts');
        if (btnCfgResetPcts) {
            btnCfgResetPcts.addEventListener('click', () => {
                resetDefaultPercentages('cfgCategoriesTableBody', 'cfgTotalPctBadge', true);
            });
        }

        // Onboarding Wizard Navigation
        document.getElementById('btnGoToStep2').addEventListener('click', () => {
            const income = parseFloat(document.getElementById('onboardIncome').value);
            if (isNaN(income) || income <= 0) {
                alert("Si us plau, introduïu un salari net mensual vàlid.");
                return;
            }
            state = JSON.parse(wasm_update_income(JSON.stringify(state), income));
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

            // Add recurring using Rust WASM
            state = JSON.parse(wasm_add_recurring(JSON.stringify(state), name, amount, freq, catId));

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

        // Save Expense Form Submit (Rust WASM)
        document.getElementById('formExpense').addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('expEditId').value;
            const catId = document.getElementById('expCategory').value;
            const amount = parseFloat(document.getElementById('expAmount').value);
            const note = document.getElementById('expNote').value.trim();

            if (isNaN(amount) || amount <= 0) return;

            if (id) {
                state = JSON.parse(wasm_update_expense(JSON.stringify(state), id, catId, amount, note, `Dia ${state.current_day}`));
            } else {
                state = JSON.parse(wasm_add_expense(JSON.stringify(state), catId, amount, note, `Dia ${state.current_day}`));
            }

            saveState();
            document.getElementById('modalExpense').classList.remove('active');
        });

        // Save Income in Config Modal (Rust WASM)
        document.getElementById('btnSaveIncome').addEventListener('click', () => {
            const val = parseFloat(document.getElementById('cfgIncome').value);
            if (!isNaN(val) && val >= 0) {
                state = JSON.parse(wasm_update_income(JSON.stringify(state), val));
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

        // Add / Update Recurring in Config Modal (Rust WASM)
        document.getElementById('formAddRecurring').addEventListener('submit', (e) => {
            e.preventDefault();
            const editId = document.getElementById('recEditId').value;
            const name = document.getElementById('recName').value.trim();
            const amount = parseFloat(document.getElementById('recAmount').value);
            const freq = document.getElementById('recFreq').value;
            const catId = document.getElementById('recCategory').value;

            if (!name || isNaN(amount) || amount <= 0) return;

            if (editId) {
                state = JSON.parse(wasm_update_recurring(JSON.stringify(state), editId, name, amount, freq, catId));
                document.getElementById('recEditId').value = '';
                document.getElementById('recFormTitle').textContent = 'Afegir Nova Despesa Recurrent';
                document.getElementById('btnSubmitRecurring').textContent = '+ Guardar Recurrent';
            } else {
                state = JSON.parse(wasm_add_recurring(JSON.stringify(state), name, amount, freq, catId));
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

        // Clear Expense History Button (Rust WASM)
        document.getElementById('btnClearExpenses').addEventListener('click', () => {
            if (confirm("Voleu netejar totes les despeses diàries registrades?")) {
                state = JSON.parse(wasm_clear_expenses(JSON.stringify(state)));
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

    } catch (err) {
        console.error("Error durant la inicialització de WebAssembly:", err);
    }
}

// Start application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}
