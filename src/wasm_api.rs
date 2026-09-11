use wasm_bindgen::prelude::*;
use crate::model::*;
use crate::engine::BudgetEngine;
use crate::storage::StorageManager;

#[wasm_bindgen]
pub fn wasm_get_default_config() -> String {
    let config = BudgetConfig::default();
    StorageManager::to_json(&config).unwrap_or_default()
}

#[wasm_bindgen]
pub fn wasm_get_all_summaries(config_json: &str) -> String {
    if let Ok(config) = StorageManager::from_json(config_json) {
        let summaries = BudgetEngine::get_all_summaries(&config);
        serde_json::to_string(&summaries).unwrap_or_default()
    } else {
        "[]".to_string()
    }
}

#[wasm_bindgen]
pub fn wasm_add_expense(config_json: &str, category_id: &str, amount: f64, note: &str, date: &str) -> String {
    if let Ok(mut config) = StorageManager::from_json(config_json) {
        let new_expense = DailyExpense {
            id: format!("exp_{}", config.daily_expenses.len() + 1),
            date: date.to_string(),
            amount,
            category_id: category_id.to_string(),
            note: note.to_string(),
        };
        BudgetEngine::add_expense(&mut config, new_expense);
        StorageManager::to_json(&config).unwrap_or_default()
    } else {
        config_json.to_string()
    }
}

#[wasm_bindgen]
pub fn wasm_update_expense(config_json: &str, expense_id: &str, category_id: &str, amount: f64, note: &str, date: &str) -> String {
    if let Ok(mut config) = StorageManager::from_json(config_json) {
        let updated = DailyExpense {
            id: expense_id.to_string(),
            date: date.to_string(),
            amount,
            category_id: category_id.to_string(),
            note: note.to_string(),
        };
        BudgetEngine::update_expense(&mut config, updated);
        StorageManager::to_json(&config).unwrap_or_default()
    } else {
        config_json.to_string()
    }
}

#[wasm_bindgen]
pub fn wasm_remove_expense(config_json: &str, expense_id: &str) -> String {
    if let Ok(mut config) = StorageManager::from_json(config_json) {
        BudgetEngine::remove_expense(&mut config, expense_id);
        StorageManager::to_json(&config).unwrap_or_default()
    } else {
        config_json.to_string()
    }
}

#[wasm_bindgen]
pub fn wasm_advance_day(config_json: &str) -> String {
    if let Ok(mut config) = StorageManager::from_json(config_json) {
        let _settlement = BudgetEngine::advance_day(&mut config);
        StorageManager::to_json(&config).unwrap_or_default()
    } else {
        config_json.to_string()
    }
}

#[wasm_bindgen]
pub fn wasm_update_income(config_json: &str, new_income: f64) -> String {
    if let Ok(mut config) = StorageManager::from_json(config_json) {
        config.monthly_income = new_income;
        StorageManager::to_json(&config).unwrap_or_default()
    } else {
        config_json.to_string()
    }
}

#[wasm_bindgen]
pub fn wasm_add_recurring(config_json: &str, name: &str, amount: f64, frequency_str: &str, category_id: &str) -> String {
    if let Ok(mut config) = StorageManager::from_json(config_json) {
        let freq = match frequency_str {
            "Annually" => Frequency::Annually,
            "Quarterly" => Frequency::Quarterly,
            _ => Frequency::Monthly,
        };
        let new_rec = RecurringExpense {
            id: format!("rec_{}", config.recurring_expenses.len() + 1),
            name: name.to_string(),
            amount,
            frequency: freq,
            category_id: category_id.to_string(),
        };
        config.recurring_expenses.push(new_rec);
        StorageManager::to_json(&config).unwrap_or_default()
    } else {
        config_json.to_string()
    }
}

#[wasm_bindgen]
pub fn wasm_remove_recurring(config_json: &str, rec_id: &str) -> String {
    if let Ok(mut config) = StorageManager::from_json(config_json) {
        config.recurring_expenses.retain(|r| r.id != rec_id);
        StorageManager::to_json(&config).unwrap_or_default()
    } else {
        config_json.to_string()
    }
}
