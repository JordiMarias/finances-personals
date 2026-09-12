// ==========================================================================
// Gestor de Finances Personals - Application Controller (Calendar & WebAssembly Engine)
// ==========================================================================

import init, {
    wasm_get_default_config,
    wasm_get_all_summaries,
    wasm_get_summaries_for_date,
    wasm_get_cycle_info,
    wasm_update_billing_cycle_day,
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
    wasm_settle_month
} from './pkg/budgeting_app.js';

let state = null;
let wasmInitialized = false;

// Helper: Get today's local date as YYYY-MM-DD
export function getTodayDateStr() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Current viewed date in the dashboard (defaults to today)
let selectedDate = getTodayDateStr();

// Helper: Format Currency in European Catalan standard (ex: 1.323,00 €)
export function formatCurrency(amount) {
    return (amount || 0).toLocaleString('ca-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + ' €';
}

// Date Formatter: Convert ISO YYYY-MM-DD to European Catalan standard dd/mm/aaaa
export function formatDateDDMMYYYY(isoStr) {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length !== 3) return isoStr;
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
}

// Date Parser: Convert dd/mm/aaaa to ISO YYYY-MM-DD
export function isoFromDDMMYYYY(ddmmyyyyStr) {
    if (!ddmmyyyyStr) return '';
    const clean = ddmmyyyyStr.trim().replace(/-/g, '/');
    const parts = clean.split('/');
    if (parts.length === 3) {
        const d = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        if (parseInt(m, 10) >= 1 && parseInt(m, 10) <= 12 && parseInt(d, 10) >= 1 && parseInt(d, 10) <= 31) {
            return `${y}-${m}-${d}`;
        }
    }
    return '';
}

// Date Navigation Helper: Shift a YYYY-MM-DD date by offsetDays (+1, -1, etc.)
export function shiftDate(dateStr, offsetDays) {
    const parts = dateStr.split('-');
    if (parts.length < 3) return getTodayDateStr();
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    d.setDate(d.getDate() + offsetDays);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper: Format Long Date in Catalan with dd/mm/aaaa (e.g. "Dissabte, 12/09/2026")
export function formatDateLong(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const weekday = d.toLocaleDateString('ca-ES', { weekday: 'short' });
    const formattedDate = formatDateDDMMYYYY(dateStr);
    return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${formattedDate}`;
}

// Helper: Format Date Range in dd/mm format (e.g. "25/08 - 24/09")
export function formatDateRange(startStr, endStr) {
    if (!startStr || !endStr) return '';
    const p1 = startStr.split('-');
    const p2 = endStr.split('-');
    if (p1.length !== 3 || p2.length !== 3) return `${startStr} - ${endStr}`;
    return `${p1[2]}/${p1[1]} - ${p2[2]}/${p2[1]}`;
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
        investment_fund_total: 0.0,
        billing_cycle_start_day: 1
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
            if (typeof state.billing_cycle_start_day !== 'number') {
                state.billing_cycle_start_day = 1;
            }
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
// Category Button Tiles Grid Selector (Interactive Buttons)
// ==========================================================================

function renderCategorySelector(gridId, hiddenInputId, errorMsgId, selectedCatId = null) {
    const grid = document.getElementById(gridId);
    const hiddenInput = document.getElementById(hiddenInputId);
    const errorMsg = document.getElementById(errorMsgId);
    if (!grid || !hiddenInput || !state || !state.categories) return;

    grid.innerHTML = '';
    hiddenInput.value = selectedCatId || '';

    state.categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `category-choice-btn ${cat.id === selectedCatId ? 'selected' : ''}`;
        btn.setAttribute('data-cat-id', cat.id);
        btn.style.setProperty('--cat-accent', cat.color || '#007ea8');

        btn.innerHTML = `
            <span class="choice-icon">${cat.icon}</span>
            <span class="choice-name">${cat.name}</span>
            <span class="choice-pct">${Math.round(cat.percentage * 100)}%</span>
        `;

        btn.addEventListener('click', () => {
            // Remove selected class from all buttons in this grid
            grid.querySelectorAll('.category-choice-btn').forEach(b => b.classList.remove('selected'));
            // Select this button
            btn.classList.add('selected');
            hiddenInput.value = cat.id;
            if (errorMsg) errorMsg.style.display = 'none';
        });

        grid.appendChild(btn);
    });
}

// ==========================================================================
// Backup & Restore (JSON File Export & Import)
// ==========================================================================

export function exportStateToFile() {
    const jsonString = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const now = getTodayDateStr();
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
            state.setup_completed = true;
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
        const grossDay = grossMonth / 30.0;

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
    state = JSON.parse(wasm_reset_default_percentages(JSON.stringify(state)));
    const currentIncome = isConfig ?
        parseFloat(document.getElementById('cfgIncome').value) || state.monthly_income :
        parseFloat(document.getElementById('onboardIncome').value) || state.monthly_income;
    renderAllocationTable(tbodyId, badgeId, currentIncome, isConfig);
}

// ==========================================================================
// Main Application Rendering (Driven by Rust WASM & Calendar Date)
// ==========================================================================

function renderApp() {
    if (!wasmInitialized || !state) return;

    if (!selectedDate) {
        selectedDate = getTodayDateStr();
    }

    // Onboarding status (if user explicitly requested wizard)
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

    // Update Calendar Date Display & Picker
    const todayStr = getTodayDateStr();
    const isToday = (selectedDate === todayStr);
    const dateLabel = document.getElementById('dateDisplayLabel');
    if (dateLabel) {
        const formatted = formatDateLong(selectedDate);
        dateLabel.textContent = `📅 ${formatted}${isToday ? ' (Avui)' : ''}`;
    }

    const datePicker = document.getElementById('datePickerInput');
    if (datePicker) {
        datePicker.value = selectedDate;
    }

    // Query Rust WASM engine for the selected target date
    const summariesJson = wasm_get_summaries_for_date(JSON.stringify(state), selectedDate);
    const summaries = JSON.parse(summariesJson);

    if (summaries && summaries.length > 0) {
        const first = summaries[0];
        const cycleBadge = document.getElementById('cycleIndicatorBadge');
        if (cycleBadge) {
            const rangeStr = formatDateRange(first.cycle_start_date, first.cycle_end_date);
            cycleBadge.textContent = `Cicle: ${rangeStr} (Dia ${first.day_of_cycle} de ${first.total_cycle_days})`;
        }
    }

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
        valStreakSub.textContent = 'Totes les partides sota control en aquesta data';
    } else {
        const deficitCount = summaries.length - positiveCount;
        valStreak.textContent = `${positiveCount}/${summaries.length} en Superàvit`;
        valStreak.className = 'card-value text-amber';
        valStreakSub.textContent = `${deficitCount} partida(es) en dèficit a ${formatDateDDMMYYYY(selectedDate)}`;
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
                    <div class="label">Saldo Acumulat a la Data</div>
                    <div class="amount" style="color: ${isPositive ? 'var(--status-success)' : 'var(--status-danger)'};">
                        ${formatCurrency(s.accumulated_balance)}
                    </div>
                </div>

                <div class="cat-metrics-row">
                    <span>Límit Diari Net:</span>
                    <span class="val">${formatCurrency(s.net_daily_budget)}/dia</span>
                </div>
                <div class="cat-metrics-row">
                    <span>Gastat el ${formatDateDDMMYYYY(selectedDate)}:</span>
                    <span class="val" style="color: ${s.spent_today > 0 ? 'var(--navy-accent)' : 'var(--text-muted)'}; font-weight: ${s.spent_today > 0 ? '700' : '400'};">
                        ${formatCurrency(s.spent_today)}
                    </span>
                </div>
                <div class="cat-metrics-row">
                    <span>Gastat en aquest cicle:</span>
                    <span class="val" style="color: ${s.spent_this_month > 0 ? 'var(--text-primary)' : 'var(--text-muted)'};">
                        ${formatCurrency(s.spent_this_month)}
                    </span>
                </div>

                <div class="cat-progress-container">
                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">
                        <span>Consum del cicle actiu</span>
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

    // Funds
    document.getElementById('fundEmergency').textContent = formatCurrency(state.emergency_fund_total);
    document.getElementById('fundGoal').textContent = formatCurrency(state.goal_fund_total);
    document.getElementById('fundInvestment').textContent = formatCurrency(state.investment_fund_total);

    // Expense History Table
    renderExpensesTable();

    // Config Dialog Tables & Fields
    document.getElementById('cfgIncome').value = state.monthly_income;
    if (document.getElementById('cfgBillingCycleDay')) {
        document.getElementById('cfgBillingCycleDay').value = state.billing_cycle_start_day || 1;
    }
    renderRecurringTable();
    renderCategorySelector('recCategoryGrid', 'recCategory', 'recCategoryError', null);
}

// ==========================================================================
// Dropdowns & Forms Rendering
// ==========================================================================

function renderExpensesTable() {
    const tbody = document.getElementById('expensesTableBody');
    if (!tbody || !state) return;
    tbody.innerHTML = '';

    if (!state.daily_expenses || state.daily_expenses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">No hi ha moviments registrats.</td></tr>`;
        return;
    }

    const todayStr = getTodayDateStr();

    // Sort by date descending
    const sorted = [...state.daily_expenses].sort((a, b) => {
        if (a.date < b.date) return 1;
        if (a.date > b.date) return -1;
        return 0;
    });

    sorted.forEach(exp => {
        const cat = state.categories.find(c => c.id === exp.category_id) || { name: 'Altres', icon: '🏷️' };
        
        let dateTag = '';
        if (exp.date === todayStr) {
            dateTag = ' <span class="card-badge" style="background: var(--status-success-bg); color: var(--status-success); font-size: 0.7rem;">Avui</span>';
        } else if (exp.date > todayStr) {
            dateTag = ' <span class="card-badge" style="background: var(--blue-subtle); color: var(--blue-accent); font-size: 0.7rem;">Futura</span>';
        }

        const isSelectedDate = (exp.date === selectedDate);
        const displayDate = formatDateDDMMYYYY(exp.date);

        const tr = document.createElement('tr');
        if (isSelectedDate) {
            tr.style.backgroundColor = 'rgba(0, 126, 168, 0.06)';
        }

        tr.innerHTML = `
            <td>
                <span style="font-weight: 600; color: var(--text-primary); cursor: pointer;" onclick="window.selectDateDirectly('${exp.date}')" title="Saltar a aquesta data">
                    ${displayDate}
                </span>
                ${dateTag}
            </td>
            <td><span class="cell-badge">${cat.icon} ${cat.name}</span></td>
            <td>${exp.note || '-'}</td>
            <td class="cell-amount">${formatCurrency(exp.amount)}</td>
            <td style="text-align: right;">
                <button class="btn btn-outline btn-sm" onclick="window.editExpense('${exp.id}')">✏️</button>
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
                <button class="btn btn-outline btn-sm" onclick="window.editRecurring('${rec.id}')">✏️</button>
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

    renderCategorySelector('onboardRecCatGrid', 'onboardRecCat', 'onboardRecCatError', null);
}

// ==========================================================================
// Operations: Daily Expenses (Delegated to Rust WASM with Real Dates)
// ==========================================================================

export function openAddExpenseForCat(catId) {
    document.getElementById('expEditId').value = '';
    document.getElementById('expAmount').value = '';
    document.getElementById('expNote').value = '';
    
    const curIsoDate = selectedDate || getTodayDateStr();
    document.getElementById('expDate').value = curIsoDate;
    document.getElementById('expDateText').value = formatDateDDMMYYYY(curIsoDate);
    document.getElementById('modalExpenseTitle').textContent = 'Registrar Nova Despesa';
    
    const err = document.getElementById('expCategoryError');
    if (err) err.style.display = 'none';

    // Render category buttons (no default selected if catId is null, preselected if catId passed)
    renderCategorySelector('expCategoryGrid', 'expCategory', 'expCategoryError', catId);

    document.getElementById('modalExpense').classList.add('active');
    setTimeout(() => document.getElementById('expAmount').focus(), 50);
}

export function editExpense(id) {
    const exp = state.daily_expenses.find(e => e.id === id);
    if (!exp) return;

    document.getElementById('expEditId').value = exp.id;
    document.getElementById('expAmount').value = exp.amount;
    document.getElementById('expNote').value = exp.note;
    
    const isoDate = exp.date || selectedDate || getTodayDateStr();
    document.getElementById('expDate').value = isoDate;
    document.getElementById('expDateText').value = formatDateDDMMYYYY(isoDate);
    document.getElementById('modalExpenseTitle').textContent = 'Modificar Despesa';

    const err = document.getElementById('expCategoryError');
    if (err) err.style.display = 'none';

    renderCategorySelector('expCategoryGrid', 'expCategory', 'expCategoryError', exp.category_id);

    document.getElementById('modalExpense').classList.add('active');
}

export function deleteExpense(id) {
    if (confirm("Segur que voleu eliminar aquest moviment?")) {
        state = JSON.parse(wasm_remove_expense(JSON.stringify(state), id));
        saveState();
    }
}

export function selectDateDirectly(targetDate) {
    if (targetDate) {
        selectedDate = targetDate;
        renderApp();
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

    const err = document.getElementById('recCategoryError');
    if (err) err.style.display = 'none';

    renderCategorySelector('recCategoryGrid', 'recCategory', 'recCategoryError', rec.category_id);

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
// Interactive Tutorial / Guide Controller
// ==========================================================================
let currentTutorialStep = 1;
const TOTAL_TUTORIAL_STEPS = 5;

export function showTutorialStep(stepNum) {
    currentTutorialStep = Math.max(1, Math.min(TOTAL_TUTORIAL_STEPS, stepNum));
    
    // Update slide visibility
    for (let i = 1; i <= TOTAL_TUTORIAL_STEPS; i++) {
        const slide = document.getElementById(`tutSlide${i}`);
        if (slide) {
            slide.classList.toggle('active', i === currentTutorialStep);
        }
    }

    // Update progress indicator dots
    document.querySelectorAll('.tutorial-step-indicator').forEach(ind => {
        const s = parseInt(ind.getAttribute('data-step'), 10);
        ind.classList.remove('active', 'completed');
        if (s === currentTutorialStep) {
            ind.classList.add('active');
        } else if (s < currentTutorialStep) {
            ind.classList.add('completed');
        }
    });

    // Update step counter text
    const counter = document.getElementById('tutStepCounter');
    if (counter) {
        counter.textContent = `Pas ${currentTutorialStep} de ${TOTAL_TUTORIAL_STEPS}`;
    }

    // Update navigation buttons
    const btnPrev = document.getElementById('btnTutPrev');
    if (btnPrev) {
        btnPrev.style.visibility = currentTutorialStep === 1 ? 'hidden' : 'visible';
    }

    const btnNext = document.getElementById('btnTutNext');
    if (btnNext) {
        btnNext.textContent = currentTutorialStep === TOTAL_TUTORIAL_STEPS ? 'Començar! 🚀' : 'Següent ➡️';
    }
}

export function openTutorial(startStep = 1) {
    showTutorialStep(startStep);
    const modal = document.getElementById('modalTutorial');
    if (modal) modal.classList.add('active');
}

export function closeTutorial() {
    const modal = document.getElementById('modalTutorial');
    if (modal) modal.classList.remove('active');
}

// ==========================================================================
// Privacy & Data Custody Controller
// ==========================================================================
export function openPrivacyModal() {
    const modal = document.getElementById('modalPrivacy');
    if (modal) modal.classList.add('active');
}

export function closePrivacyModal() {
    const modal = document.getElementById('modalPrivacy');
    if (modal) modal.classList.remove('active');
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
window.selectDateDirectly = selectDateDirectly;
window.openTutorial = openTutorial;
window.closeTutorial = closeTutorial;
window.openPrivacyModal = openPrivacyModal;
window.closePrivacyModal = closePrivacyModal;

// ==========================================================================
// Event Listeners & Application Bootstrapping
// ==========================================================================

async function bootstrap() {
    try {
        // Initialize Rust WebAssembly module
        await init();
        wasmInitialized = true;
        console.log("🦀 Motor financer en Rust (WebAssembly) amb suport de calendari i botons de categoria inicialitzat.");

        loadStateFromStorage();
        selectedDate = getTodayDateStr();
        renderApp();

        // Calendar Navigation Listeners
        const btnPrevDay = document.getElementById('btnPrevDay');
        if (btnPrevDay) {
            btnPrevDay.addEventListener('click', () => {
                selectedDate = shiftDate(selectedDate, -1);
                renderApp();
            });
        }

        const btnNextDay = document.getElementById('btnNextDay');
        if (btnNextDay) {
            btnNextDay.addEventListener('click', () => {
                selectedDate = shiftDate(selectedDate, 1);
                renderApp();
            });
        }

        const btnToday = document.getElementById('btnToday');
        if (btnToday) {
            btnToday.addEventListener('click', () => {
                selectedDate = getTodayDateStr();
                renderApp();
            });
        }

        // Calendar Box Click -> Trigger Native Calendar Picker Popover
        const dateTrigger = document.getElementById('btnOpenCalendarTrigger');
        const datePicker = document.getElementById('datePickerInput');
        if (dateTrigger && datePicker) {
            dateTrigger.addEventListener('click', (e) => {
                try {
                    if (typeof datePicker.showPicker === 'function') {
                        datePicker.showPicker();
                    } else {
                        datePicker.focus();
                        datePicker.click();
                    }
                } catch (err) {
                    datePicker.focus();
                    datePicker.click();
                }
            });

            datePicker.addEventListener('change', (e) => {
                if (e.target.value) {
                    selectedDate = e.target.value;
                    renderApp();
                }
            });
        }

        // Modal Expense Date Picker & Text Input Sync (dd/mm/aaaa)
        const expDateText = document.getElementById('expDateText');
        const expDate = document.getElementById('expDate');
        const btnPickExpDate = document.getElementById('btnPickExpDate');

        if (expDateText && expDate) {
            expDateText.addEventListener('input', (e) => {
                const val = e.target.value;
                const iso = isoFromDDMMYYYY(val);
                if (iso) {
                    expDate.value = iso;
                }
            });

            expDate.addEventListener('change', (e) => {
                if (e.target.value) {
                    expDateText.value = formatDateDDMMYYYY(e.target.value);
                }
            });

            if (btnPickExpDate) {
                btnPickExpDate.addEventListener('click', () => {
                    try {
                        if (typeof expDate.showPicker === 'function') {
                            expDate.showPicker();
                        } else {
                            expDate.focus();
                            expDate.click();
                        }
                    } catch (err) {
                        expDate.focus();
                        expDate.click();
                    }
                });
            }
        }

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

        // Form Add Recurring during Onboarding (Validation for category selection)
        document.getElementById('formOnboardAddRec').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('onboardRecName').value.trim();
            const amount = parseFloat(document.getElementById('onboardRecAmount').value);
            const freq = document.getElementById('onboardRecFreq').value;
            const catId = document.getElementById('onboardRecCat').value;

            if (!catId) {
                const err = document.getElementById('onboardRecCatError');
                if (err) err.style.display = 'block';
                return;
            }

            if (!name || isNaN(amount) || amount <= 0) return;

            state = JSON.parse(wasm_add_recurring(JSON.stringify(state), name, amount, freq, catId));

            document.getElementById('onboardRecName').value = '';
            document.getElementById('onboardRecAmount').value = '';
            renderOnboardRecTable();
        });

        // Modal Action Triggers
        document.getElementById('btnOpenExpenseModal').addEventListener('click', () => openAddExpenseForCat(null));

        document.getElementById('btnOpenConfigModal').addEventListener('click', () => {
            document.getElementById('cfgIncome').value = state.monthly_income;
            if (document.getElementById('cfgBillingCycleDay')) {
                document.getElementById('cfgBillingCycleDay').value = state.billing_cycle_start_day || 1;
            }
            renderAllocationTable('cfgCategoriesTableBody', 'cfgTotalPctBadge', state.monthly_income, true);
            renderRecurringTable();
            renderCategorySelector('recCategoryGrid', 'recCategory', 'recCategoryError', null);
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

        // Privacy & Tutorial Modal Handlers
        const btnHeaderPrivacy = document.getElementById('btnHeaderPrivacy');
        if (btnHeaderPrivacy) btnHeaderPrivacy.addEventListener('click', openPrivacyModal);

        const btnOnboardPrivacy = document.getElementById('btnOnboardPrivacy');
        if (btnOnboardPrivacy) btnOnboardPrivacy.addEventListener('click', openPrivacyModal);

        const btnClosePrivacyModal = document.getElementById('btnClosePrivacyModal');
        if (btnClosePrivacyModal) btnClosePrivacyModal.addEventListener('click', closePrivacyModal);

        const btnGotItPrivacy = document.getElementById('btnGotItPrivacy');
        if (btnGotItPrivacy) btnGotItPrivacy.addEventListener('click', closePrivacyModal);

        const btnPrivacyExport = document.getElementById('btnPrivacyExport');
        if (btnPrivacyExport) btnPrivacyExport.addEventListener('click', () => {
            exportStateToFile();
            closePrivacyModal();
        });

        const btnHeaderTutorial = document.getElementById('btnHeaderTutorial');
        if (btnHeaderTutorial) btnHeaderTutorial.addEventListener('click', () => openTutorial(1));

        const btnOnboardTutorial = document.getElementById('btnOnboardTutorial');
        if (btnOnboardTutorial) btnOnboardTutorial.addEventListener('click', () => openTutorial(1));

        const btnCloseTutorialModal = document.getElementById('btnCloseTutorialModal');
        if (btnCloseTutorialModal) btnCloseTutorialModal.addEventListener('click', closeTutorial);

        const btnTutPrev = document.getElementById('btnTutPrev');
        if (btnTutPrev) {
            btnTutPrev.addEventListener('click', () => {
                if (currentTutorialStep > 1) {
                    showTutorialStep(currentTutorialStep - 1);
                }
            });
        }

        const btnTutNext = document.getElementById('btnTutNext');
        if (btnTutNext) {
            btnTutNext.addEventListener('click', () => {
                if (currentTutorialStep < TOTAL_TUTORIAL_STEPS) {
                    showTutorialStep(currentTutorialStep + 1);
                } else {
                    closeTutorial();
                }
            });
        }

        document.querySelectorAll('.tutorial-step-indicator').forEach(ind => {
            ind.addEventListener('click', () => {
                const s = parseInt(ind.getAttribute('data-step'), 10);
                if (!isNaN(s)) {
                    showTutorialStep(s);
                }
            });
        });

        // Close modal on backdrop click
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    backdrop.classList.remove('active');
                }
            });
        });

        // Save Expense Form Submit (Validation for category selection & dd/mm/aaaa date)
        document.getElementById('formExpense').addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('expEditId').value;
            const catId = document.getElementById('expCategory').value;
            const amount = parseFloat(document.getElementById('expAmount').value);
            const note = document.getElementById('expNote').value.trim();
            const textDateVal = document.getElementById('expDateText').value;
            
            // Obligate category selection
            if (!catId) {
                const err = document.getElementById('expCategoryError');
                if (err) {
                    err.style.display = 'block';
                    err.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            // Parse date from dd/mm/aaaa or fallback to input
            let finalIsoDate = isoFromDDMMYYYY(textDateVal);
            if (!finalIsoDate) {
                finalIsoDate = document.getElementById('expDate').value || selectedDate || getTodayDateStr();
            }

            if (isNaN(amount) || amount <= 0) return;

            if (id) {
                state = JSON.parse(wasm_update_expense(JSON.stringify(state), id, catId, amount, note, finalIsoDate));
            } else {
                state = JSON.parse(wasm_add_expense(JSON.stringify(state), catId, amount, note, finalIsoDate));
            }

            saveState();
            document.getElementById('modalExpense').classList.remove('active');
        });

        // Save Income in Config Modal
        document.getElementById('btnSaveIncome').addEventListener('click', () => {
            const val = parseFloat(document.getElementById('cfgIncome').value);
            if (!isNaN(val) && val >= 0) {
                state = JSON.parse(wasm_update_income(JSON.stringify(state), val));
                saveState();
                renderAllocationTable('cfgCategoriesTableBody', 'cfgTotalPctBadge', state.monthly_income, true);
                alert("✅ Sou net mensual actualitzat correctament.");
            }
        });

        // Save Billing Cycle Start Day in Config Modal
        const btnSaveBillingCycle = document.getElementById('btnSaveBillingCycle');
        if (btnSaveBillingCycle) {
            btnSaveBillingCycle.addEventListener('click', () => {
                const dayVal = parseInt(document.getElementById('cfgBillingCycleDay').value, 10);
                if (!isNaN(dayVal) && dayVal >= 1 && dayVal <= 28) {
                    state = JSON.parse(wasm_update_billing_cycle_day(JSON.stringify(state), dayVal));
                    saveState();
                    alert(`✅ Dia d'inici del cicle de facturació establert al dia ${dayVal} de cada mes.`);
                } else {
                    alert("Si us plau, introduïu un dia vàlid entre l'1 i el 28.");
                }
            });
        }

        // Save Percentages in Config Modal
        const btnSavePercentages = document.getElementById('btnSavePercentages');
        if (btnSavePercentages) {
            btnSavePercentages.addEventListener('click', () => {
                saveState();
                alert("✅ Percentatges de les partides actualitzats correctament.");
            });
        }

        // Add / Update Recurring in Config Modal (with category button validation)
        document.getElementById('formAddRecurring').addEventListener('submit', (e) => {
            e.preventDefault();
            const editId = document.getElementById('recEditId').value;
            const name = document.getElementById('recName').value.trim();
            const amount = parseFloat(document.getElementById('recAmount').value);
            const freq = document.getElementById('recFreq').value;
            const catId = document.getElementById('recCategory').value;

            if (!catId) {
                const err = document.getElementById('recCategoryError');
                if (err) err.style.display = 'block';
                return;
            }

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
            renderCategorySelector('recCategoryGrid', 'recCategory', 'recCategoryError', null);
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
                selectedDate = getTodayDateStr();
                renderApp();
                closeAllModals();
            }
        });

        // Clear Expense History Button
        document.getElementById('btnClearExpenses').addEventListener('click', () => {
            if (confirm("Voleu netejar totes les despeses registrades?")) {
                state = JSON.parse(wasm_clear_expenses(JSON.stringify(state)));
                saveState();
            }
        });

        // Backup & Restore File Trigger Handlers
        const globalFileInput = document.getElementById('globalFileInputImport');
        globalFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                importStateFromFile(e.target.files[0]);
                globalFileInput.value = '';
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
