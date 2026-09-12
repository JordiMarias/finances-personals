use budgeting_app::model::*;
use budgeting_app::engine::BudgetEngine;

fn get_sample_ods_config() -> BudgetConfig {
    let mut config = BudgetConfig::default();
    config.monthly_income = 2200.0;
    config.recurring_expenses = vec![
        RecurringExpense {
            id: "rec_1".into(),
            name: "Amazon Prime".into(),
            amount: 49.90,
            frequency: Frequency::Annually,
            category_id: "leisure".into(),
        },
        RecurringExpense {
            id: "rec_2".into(),
            name: "Sàpiens".into(),
            amount: 60.00,
            frequency: Frequency::Annually,
            category_id: "leisure".into(),
        },
        RecurringExpense {
            id: "rec_3".into(),
            name: "Bicing".into(),
            amount: 35.00,
            frequency: Frequency::Annually,
            category_id: "transport".into(),
        },
        RecurringExpense {
            id: "rec_4".into(),
            name: "Assegurança cotxe".into(),
            amount: 455.00,
            frequency: Frequency::Annually,
            category_id: "transport".into(),
        },
        RecurringExpense {
            id: "rec_5".into(),
            name: "Centre Excursionista Banyoles i FEEC".into(),
            amount: 89.30,
            frequency: Frequency::Annually,
            category_id: "leisure".into(),
        },
        RecurringExpense {
            id: "rec_6".into(),
            name: "Club".into(),
            amount: 40.00,
            frequency: Frequency::Monthly,
            category_id: "leisure".into(),
        },
        RecurringExpense {
            id: "rec_7".into(),
            name: "Netflix".into(),
            amount: 15.00,
            frequency: Frequency::Monthly,
            category_id: "leisure".into(),
        },
        RecurringExpense {
            id: "rec_8".into(),
            name: "TEISA".into(),
            amount: 40.00,
            frequency: Frequency::Monthly,
            category_id: "transport".into(),
        },
        RecurringExpense {
            id: "rec_9".into(),
            name: "T-Mobilitat".into(),
            amount: 22.80,
            frequency: Frequency::Monthly,
            category_id: "transport".into(),
        },
        RecurringExpense {
            id: "rec_10".into(),
            name: "Google One".into(),
            amount: 22.00,
            frequency: Frequency::Monthly,
            category_id: "leisure".into(),
        },
        RecurringExpense {
            id: "rec_11".into(),
            name: "Spotify".into(),
            amount: 3.50,
            frequency: Frequency::Monthly,
            category_id: "leisure".into(),
        },
        RecurringExpense {
            id: "rec_12".into(),
            name: "Telefònica".into(),
            amount: 30.00,
            frequency: Frequency::Monthly,
            category_id: "utilities".into(),
        },
    ];
    config
}

#[test]
fn test_ods_financial_values() {
    let config = get_sample_ods_config();
    let summaries = BudgetEngine::get_all_summaries(&config);

    let get_summary = |id: &str| -> CategorySummary {
        summaries.iter().find(|s| s.category.id == id).unwrap().clone()
    };

    // Housing (30% of 2200 = 660)
    let housing = get_summary("housing");
    assert_eq!(housing.gross_monthly_budget, 660.0);
    assert_eq!(housing.recurring_monthly_cost, 0.0);
    assert_eq!(housing.net_monthly_budget, 660.0);
    assert!((housing.net_daily_budget - 22.0).abs() < 0.01);

    // Transport (10% of 2200 = 220, recurring = 103.6333...)
    let transport = get_summary("transport");
    assert_eq!(transport.gross_monthly_budget, 220.0);
    assert!((transport.recurring_monthly_cost - 103.63).abs() < 0.1);
    assert!((transport.net_monthly_budget - 116.37).abs() < 0.1);
    assert!((transport.net_daily_budget - 3.88).abs() < 0.05);

    // Utilities (5% of 2200 = 110, recurring = 30)
    let utilities = get_summary("utilities");
    assert_eq!(utilities.gross_monthly_budget, 110.0);
    assert_eq!(utilities.recurring_monthly_cost, 30.0);
    assert_eq!(utilities.net_monthly_budget, 80.0);
    assert!((utilities.net_daily_budget - 2.67).abs() < 0.05);

    // Leisure (25% of 2200 = 550, recurring = 97.10)
    let leisure = get_summary("leisure");
    assert_eq!(leisure.gross_monthly_budget, 550.0);
    assert!((leisure.recurring_monthly_cost - 97.10).abs() < 0.1);
    assert!((leisure.net_monthly_budget - 452.90).abs() < 0.1);
    assert!((leisure.net_daily_budget - 15.10).abs() < 0.05);

    // Savings (20% of 2200 = 440)
    let savings = get_summary("savings");
    assert_eq!(savings.gross_monthly_budget, 440.0);
    assert_eq!(savings.recurring_monthly_cost, 0.0);
    assert_eq!(savings.net_monthly_budget, 440.0);
    assert!((savings.net_daily_budget - 14.67).abs() < 0.05);
}

#[test]
fn test_daily_accumulation_and_expense() {
    let mut config = get_sample_ods_config();
    
    // Day 1
    let leisure_summary = BudgetEngine::calculate_category_summary(
        &config,
        &config.categories.iter().find(|c| c.id == "leisure").unwrap()
    );
    let net_daily = leisure_summary.net_daily_budget; // ~15.10
    assert!((leisure_summary.accumulated_balance - net_daily).abs() < 0.01);

    // Advance to Day 2
    BudgetEngine::advance_day(&mut config);
    let leisure_day2 = BudgetEngine::calculate_category_summary(
        &config,
        &config.categories.iter().find(|c| c.id == "leisure").unwrap()
    );
    assert!((leisure_day2.accumulated_balance - (net_daily * 2.0)).abs() < 0.01);

    // Add an expense of 10.00 € on Day 2
    BudgetEngine::add_expense(&mut config, DailyExpense {
        id: "exp_1".into(),
        date: "2026-09-02".into(),
        amount: 10.0,
        category_id: "leisure".into(),
        note: "Dinar amb amics".into(),
    });

    let leisure_after_exp = BudgetEngine::calculate_category_summary_for_date(
        &config,
        &config.categories.iter().find(|c| c.id == "leisure").unwrap(),
        "2026-09-02"
    );
    assert!((leisure_after_exp.accumulated_balance - ((net_daily * 2.0) - 10.0)).abs() < 0.01);
}

#[test]
fn test_billing_cycle_calculations() {
    // Test cycle start day = 1
    let (s1, e1, total1, day1) = BudgetEngine::get_cycle_range("2026-09-12", 1);
    assert_eq!(s1, "2026-09-01");
    assert_eq!(e1, "2026-09-30");
    assert_eq!(total1, 30);
    assert_eq!(day1, 12);

    // Test cycle start day = 25 (date before 25th: 2026-09-12)
    let (s25, e25, total25, day25) = BudgetEngine::get_cycle_range("2026-09-12", 25);
    assert_eq!(s25, "2026-08-25");
    assert_eq!(e25, "2026-09-24");
    assert_eq!(total25, 31); // Aug 25 to Sep 24: 7 days in Aug + 24 days in Sep = 31 days
    assert_eq!(day25, 19); // 7 days in Aug + 12 days in Sep = 19

    // Test cycle start day = 25 (date on or after 25th: 2026-09-25)
    let (s25b, e25b, total25b, day25b) = BudgetEngine::get_cycle_range("2026-09-25", 25);
    assert_eq!(s25b, "2026-09-25");
    assert_eq!(e25b, "2026-10-24");
    assert_eq!(total25b, 30); // Sep 25 to Oct 24: 6 days in Sep + 24 days in Oct = 30 days
    assert_eq!(day25b, 1);
}

#[test]
fn test_past_and_future_expenses() {
    let mut config = get_sample_ods_config();
    config.billing_cycle_start_day = 1;

    // Add a past expense on 2026-09-05
    BudgetEngine::add_expense(&mut config, DailyExpense {
        id: "exp_past".into(),
        date: "2026-09-05".into(),
        amount: 50.0,
        category_id: "food".into(),
        note: "Supermercat passat".into(),
    });

    // Add a future expense on 2026-09-20
    BudgetEngine::add_expense(&mut config, DailyExpense {
        id: "exp_future".into(),
        date: "2026-09-20".into(),
        amount: 30.0,
        category_id: "food".into(),
        note: "Sopar previst".into(),
    });

    let food_cat = config.categories.iter().find(|c| c.id == "food").unwrap();

    // On 2026-09-04 (before past expense): past expense not counted in accumulated balance
    let s_04 = BudgetEngine::calculate_category_summary_for_date(&config, food_cat, "2026-09-04");
    assert_eq!(s_04.spent_today, 0.0);
    assert!((s_04.accumulated_balance - (s_04.net_daily_budget * 4.0)).abs() < 0.01);

    // On 2026-09-12 (after past expense, before future expense): 50€ spent up to date
    let s_12 = BudgetEngine::calculate_category_summary_for_date(&config, food_cat, "2026-09-12");
    assert_eq!(s_12.spent_this_month, 80.0); // Total in cycle
    assert!((s_12.accumulated_balance - ((s_12.net_daily_budget * 12.0) - 50.0)).abs() < 0.01);

    // On 2026-09-20 (on future expense date): both expenses counted
    let s_20 = BudgetEngine::calculate_category_summary_for_date(&config, food_cat, "2026-09-20");
    assert_eq!(s_20.spent_today, 30.0);
    assert!((s_20.accumulated_balance - ((s_20.net_daily_budget * 20.0) - 80.0)).abs() < 0.01);
}

#[test]
fn test_end_of_month_settlement() {
    let mut config = get_sample_ods_config();
    config.current_day = 30; // End of month

    let settlement = BudgetEngine::settle_month(&mut config);

    assert_eq!(settlement.victories_count, 6);
    assert_eq!(settlement.deficits_count, 0);
    assert!(config.emergency_fund_total > 0.0);
    assert!(config.goal_fund_total > 0.0);
    assert_eq!(config.investment_fund_total, 440.0);
    assert_eq!(config.current_day, 1);
}
