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
        date: "2026-07-24".into(),
        amount: 10.0,
        category_id: "leisure".into(),
        note: "Dinar amb amics".into(),
    });

    let leisure_after_exp = BudgetEngine::calculate_category_summary(
        &config,
        &config.categories.iter().find(|c| c.id == "leisure").unwrap()
    );
    assert!((leisure_after_exp.accumulated_balance - ((net_daily * 2.0) - 10.0)).abs() < 0.01);
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
    assert_eq!(config.daily_expenses.len(), 0);
}
