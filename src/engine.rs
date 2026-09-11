use crate::model::*;

pub struct BudgetEngine;

impl BudgetEngine {
    /// Calculate summary statistics for a given category based on current config
    pub fn calculate_category_summary(config: &BudgetConfig, cat: &Category) -> CategorySummary {
        let gross_monthly_budget = config.monthly_income * cat.percentage;
        
        let recurring_monthly_cost: f64 = config
            .recurring_expenses
            .iter()
            .filter(|rec| rec.category_id == cat.id)
            .map(|rec| rec.monthly_cost())
            .sum();

        let net_monthly_budget = gross_monthly_budget - recurring_monthly_cost;
        let days_f = config.days_in_month as f64;

        let gross_daily_budget = gross_monthly_budget / days_f;
        let recurring_daily_cost = recurring_monthly_cost / days_f;
        let net_daily_budget = net_monthly_budget / days_f;

        let spent_this_month: f64 = config
            .daily_expenses
            .iter()
            .filter(|exp| exp.category_id == cat.id)
            .map(|exp| exp.amount)
            .sum();

        let current_day_f = config.current_day as f64;
        let accumulated_balance = (net_daily_budget * current_day_f) - spent_this_month;

        CategorySummary {
            category: cat.clone(),
            gross_monthly_budget,
            recurring_monthly_cost,
            net_monthly_budget,
            gross_daily_budget,
            recurring_daily_cost,
            net_daily_budget,
            accumulated_balance,
            spent_this_month,
        }
    }

    /// Returns summaries for all categories in the configuration
    pub fn get_all_summaries(config: &BudgetConfig) -> Vec<CategorySummary> {
        config
            .categories
            .iter()
            .map(|cat| Self::calculate_category_summary(config, cat))
            .collect()
    }

    /// Add a new daily expense
    pub fn add_expense(config: &mut BudgetConfig, expense: DailyExpense) {
        config.daily_expenses.push(expense);
    }

    /// Update an existing daily expense by ID
    pub fn update_expense(config: &mut BudgetConfig, updated_expense: DailyExpense) {
        if let Some(exp) = config.daily_expenses.iter_mut().find(|e| e.id == updated_expense.id) {
            *exp = updated_expense;
        }
    }

    /// Remove an expense by ID
    pub fn remove_expense(config: &mut BudgetConfig, expense_id: &str) {
        config.daily_expenses.retain(|exp| exp.id != expense_id);
    }

    /// Update an existing recurring expense by ID
    pub fn update_recurring(config: &mut BudgetConfig, updated_rec: RecurringExpense) {
        if let Some(rec) = config.recurring_expenses.iter_mut().find(|r| r.id == updated_rec.id) {
            *rec = updated_rec;
        }
    }

    /// Advance the current day by 1. If end of month is reached, trigger settlement.
    pub fn advance_day(config: &mut BudgetConfig) -> Option<MonthSettlement> {
        if config.current_day < config.days_in_month {
            config.current_day += 1;
            None
        } else {
            Some(Self::settle_month(config))
        }
    }

    /// Perform end-of-month settlement: sweep leftover positive balances into funds and reset day
    pub fn settle_month(config: &mut BudgetConfig) -> MonthSettlement {
        let summaries = Self::get_all_summaries(config);

        let mut saved_emergency = 0.0;
        let mut saved_goals = 0.0;
        let mut invested = 0.0;
        let mut total_spent = 0.0;
        let mut victories = 0;
        let mut deficits = 0;

        for summary in &summaries {
            total_spent += summary.spent_this_month;

            if summary.accumulated_balance >= 0.0 {
                victories += 1;
            } else {
                deficits += 1;
            }

            match summary.category.destination_fund {
                FundType::Emergency => {
                    if summary.accumulated_balance > 0.0 {
                        saved_emergency += summary.accumulated_balance;
                    }
                }
                FundType::Goal => {
                    if summary.accumulated_balance > 0.0 {
                        saved_goals += summary.accumulated_balance;
                    }
                }
                FundType::Investment => {
                    // Investment budget goes directly to investment fund
                    invested += summary.gross_monthly_budget;
                }
            }
        }

        config.emergency_fund_total += saved_emergency;
        config.goal_fund_total += saved_goals;
        config.investment_fund_total += invested;

        let settlement = MonthSettlement {
            month_name: "Mes Completat".into(),
            year: 2026,
            total_saved_emergency: saved_emergency,
            total_saved_goals: saved_goals,
            total_invested: invested,
            total_spent,
            victories_count: victories,
            deficits_count: deficits,
        };

        // Reset for new month
        config.current_day = 1;
        config.daily_expenses.clear();

        settlement
    }
}
