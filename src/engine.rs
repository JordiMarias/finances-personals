use crate::model::*;

pub struct BudgetEngine;

impl BudgetEngine {
    /// Determines if a year is a leap year
    pub fn is_leap_year(year: i32) -> bool {
        (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
    }

    /// Returns the number of days in a given year and month
    pub fn days_in_month(year: i32, month: u32) -> u32 {
        match month {
            1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
            4 | 6 | 9 | 11 => 30,
            2 => if Self::is_leap_year(year) { 29 } else { 28 },
            _ => 30,
        }
    }

    /// Parses a YYYY-MM-DD date string
    pub fn parse_date(date_str: &str) -> Option<(i32, u32, u32)> {
        let parts: Vec<&str> = date_str.split('-').collect();
        if parts.len() == 3 {
            let y: i32 = parts[0].parse().ok()?;
            let m: u32 = parts[1].parse().ok()?;
            let d: u32 = parts[2].parse().ok()?;
            if (1..=12).contains(&m) && (1..=31).contains(&d) {
                return Some((y, m, d));
            }
        }
        None
    }

    /// Formats year, month, day into YYYY-MM-DD
    pub fn format_date(year: i32, month: u32, day: u32) -> String {
        format!("{:04}-{:02}-{:02}", year, month, day)
    }

    /// Converts a Gregorian date into an absolute day count (Rata Die)
    pub fn date_to_days(year: i32, month: u32, day: u32) -> i64 {
        let y = year as i64;
        let m = month as i64;
        let d = day as i64;
        let (y_adj, m_adj) = if m <= 2 { (y - 1, m + 12) } else { (y, m) };
        365 * y_adj + y_adj / 4 - y_adj / 100 + y_adj / 400 + (153 * (m_adj + 1)) / 5 + d - 306
    }

    /// Returns the number of days between two YYYY-MM-DD dates (d2 - d1)
    pub fn days_between(d1: &str, d2: &str) -> i64 {
        if let (Some((y1, m1, day1)), Some((y2, m2, day2))) = (Self::parse_date(d1), Self::parse_date(d2)) {
            Self::date_to_days(y2, m2, day2) - Self::date_to_days(y1, m1, day1)
        } else {
            0
        }
    }

    /// Calculates the billing cycle range (cycle_start, cycle_end, total_cycle_days, day_of_cycle)
    /// for any given date and billing cycle start day (1..=28).
    pub fn get_cycle_range(date_str: &str, billing_start_day: u32) -> (String, String, u32, u32) {
        let start_day = billing_start_day.clamp(1, 28);
        let (y, m, d) = Self::parse_date(date_str).unwrap_or((2026, 9, 12));

        let (cycle_start, cycle_end) = if start_day == 1 {
            let total_m_days = Self::days_in_month(y, m);
            (Self::format_date(y, m, 1), Self::format_date(y, m, total_m_days))
        } else if d >= start_day {
            // Cycle starts this month on start_day, ends next month on start_day - 1
            let (next_y, next_m) = if m == 12 { (y + 1, 1) } else { (y, m + 1) };
            let end_day = start_day - 1;
            (
                Self::format_date(y, m, start_day),
                Self::format_date(next_y, next_m, end_day),
            )
        } else {
            // Cycle started last month on start_day, ends this month on start_day - 1
            let (prev_y, prev_m) = if m == 1 { (y - 1, 12) } else { (y, m - 1) };
            let max_prev_days = Self::days_in_month(prev_y, prev_m);
            let actual_start_day = start_day.min(max_prev_days);
            let end_day = start_day - 1;
            (
                Self::format_date(prev_y, prev_m, actual_start_day),
                Self::format_date(y, m, end_day),
            )
        };

        let total_days = (Self::days_between(&cycle_start, &cycle_end) + 1).max(1) as u32;
        let day_of_cycle = (Self::days_between(&cycle_start, date_str) + 1).clamp(1, total_days as i64) as u32;

        (cycle_start, cycle_end, total_days, day_of_cycle)
    }

    /// Calculate summary for a specific category at a target date
    pub fn calculate_category_summary_for_date(
        config: &BudgetConfig,
        cat: &Category,
        target_date: &str,
    ) -> CategorySummary {
        let (cycle_start, cycle_end, total_cycle_days, day_of_cycle) =
            Self::get_cycle_range(target_date, config.billing_cycle_start_day);

        let gross_monthly_budget = config.monthly_income * cat.percentage;

        let recurring_monthly_cost: f64 = config
            .recurring_expenses
            .iter()
            .filter(|rec| rec.category_id == cat.id)
            .map(|rec| rec.monthly_cost())
            .sum();

        let net_monthly_budget = gross_monthly_budget - recurring_monthly_cost;
        let days_f = total_cycle_days as f64;

        let gross_daily_budget = gross_monthly_budget / days_f;
        let recurring_daily_cost = recurring_monthly_cost / days_f;
        let net_daily_budget = net_monthly_budget / days_f;

        // Total spent within the entire cycle
        let spent_this_month: f64 = config
            .daily_expenses
            .iter()
            .filter(|exp| {
                exp.category_id == cat.id
                    && exp.date.as_str() >= cycle_start.as_str()
                    && exp.date.as_str() <= cycle_end.as_str()
            })
            .map(|exp| exp.amount)
            .sum();

        // Total spent specifically on the target date
        let spent_today: f64 = config
            .daily_expenses
            .iter()
            .filter(|exp| exp.category_id == cat.id && exp.date == target_date)
            .map(|exp| exp.amount)
            .sum();

        // Total spent in this cycle up to the target date
        let spent_up_to_target: f64 = config
            .daily_expenses
            .iter()
            .filter(|exp| {
                exp.category_id == cat.id
                    && exp.date.as_str() >= cycle_start.as_str()
                    && exp.date.as_str() <= target_date
            })
            .map(|exp| exp.amount)
            .sum();

        // Accumulated balance accrued up to this day in the cycle
        let accumulated_balance = (net_daily_budget * day_of_cycle as f64) - spent_up_to_target;

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
            spent_today,
            cycle_start_date: cycle_start,
            cycle_end_date: cycle_end,
            day_of_cycle,
            total_cycle_days,
            target_date: target_date.to_string(),
        }
    }

    /// Calculate summary statistics for a given category (default legacy signature)
    pub fn calculate_category_summary(config: &BudgetConfig, cat: &Category) -> CategorySummary {
        let target_date = format!("2026-09-{:02}", config.current_day.clamp(1, 30));
        Self::calculate_category_summary_for_date(config, cat, &target_date)
    }

    /// Returns summaries for all categories for a specific date
    pub fn get_all_summaries_for_date(config: &BudgetConfig, target_date: &str) -> Vec<CategorySummary> {
        config
            .categories
            .iter()
            .map(|cat| Self::calculate_category_summary_for_date(config, cat, target_date))
            .collect()
    }

    /// Returns summaries for all categories (default legacy signature)
    pub fn get_all_summaries(config: &BudgetConfig) -> Vec<CategorySummary> {
        let target_date = format!("2026-09-{:02}", config.current_day.clamp(1, 30));
        Self::get_all_summaries_for_date(config, &target_date)
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

        config.current_day = 1;
        settlement
    }
}
