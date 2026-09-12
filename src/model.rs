use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Frequency {
    Monthly,
    Quarterly,
    Annually,
}

impl Frequency {
    /// Returns the equivalent monthly cost of an expense
    pub fn to_monthly_cost(&self, amount: f64) -> f64 {
        match self {
            Frequency::Monthly => amount,
            Frequency::Quarterly => amount / 3.0,
            Frequency::Annually => amount / 12.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum FundType {
    Emergency, // Habitatge, Transport, Subministraments
    Goal,      // Oci / Despeses Personals
    Investment, // Estalvi i Inversió
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub percentage: f64, // e.g., 0.30 for 30%
    pub destination_fund: FundType,
    pub icon: String,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecurringExpense {
    pub id: String,
    pub name: String,
    pub amount: f64,
    pub frequency: Frequency,
    pub category_id: String,
}

impl RecurringExpense {
    pub fn monthly_cost(&self) -> f64 {
        self.frequency.to_monthly_cost(self.amount)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyExpense {
    pub id: String,
    pub date: String, // YYYY-MM-DD
    pub amount: f64,
    pub category_id: String,
    pub note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategorySummary {
    pub category: Category,
    pub gross_monthly_budget: f64,
    pub recurring_monthly_cost: f64,
    pub net_monthly_budget: f64,
    pub gross_daily_budget: f64,
    pub recurring_daily_cost: f64,
    pub net_daily_budget: f64,
    pub accumulated_balance: f64,
    pub spent_this_month: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonthSettlement {
    pub month_name: String,
    pub year: i32,
    pub total_saved_emergency: f64,
    pub total_saved_goals: f64,
    pub total_invested: f64,
    pub total_spent: f64,
    pub victories_count: usize,
    pub deficits_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetConfig {
    pub monthly_income: f64,
    pub days_in_month: u32,
    pub current_day: u32,
    pub setup_completed: bool,
    pub categories: Vec<Category>,
    pub recurring_expenses: Vec<RecurringExpense>,
    pub daily_expenses: Vec<DailyExpense>,
    pub emergency_fund_total: f64,
    pub goal_fund_total: f64,
    pub investment_fund_total: f64,
}

impl Default for BudgetConfig {
    fn default() -> Self {
        Self {
            monthly_income: 1323.0,
            days_in_month: 30,
            current_day: 1,
            setup_completed: false,
            categories: vec![
                Category {
                    id: "housing".into(),
                    name: "Habitatge".into(),
                    percentage: 0.30,
                    destination_fund: FundType::Emergency,
                    icon: "🏠".into(),
                    color: "#002b49".into(),
                },
                Category {
                    id: "transport".into(),
                    name: "Transport / Mobilitat".into(),
                    percentage: 0.10,
                    destination_fund: FundType::Emergency,
                    icon: "🚗".into(),
                    color: "#007ea8".into(),
                },
                Category {
                    id: "food".into(),
                    name: "Alimentació bàsica".into(),
                    percentage: 0.10,
                    destination_fund: FundType::Emergency,
                    icon: "🛒".into(),
                    color: "#059669".into(),
                },
                Category {
                    id: "utilities".into(),
                    name: "Subministraments i serveis".into(),
                    percentage: 0.05,
                    destination_fund: FundType::Emergency,
                    icon: "⚡".into(),
                    color: "#d97706".into(),
                },
                Category {
                    id: "leisure".into(),
                    name: "Oci / Despeses personals".into(),
                    percentage: 0.25,
                    destination_fund: FundType::Goal,
                    icon: "🎉".into(),
                    color: "#7c3aed".into(),
                },
                Category {
                    id: "savings".into(),
                    name: "Estalvi i inversions".into(),
                    percentage: 0.20,
                    destination_fund: FundType::Investment,
                    icon: "📈".into(),
                    color: "#0284c7".into(),
                },
            ],
            recurring_expenses: vec![],
            daily_expenses: vec![],
            emergency_fund_total: 0.0,
            goal_fund_total: 0.0,
            investment_fund_total: 0.0,
        }
    }
}
