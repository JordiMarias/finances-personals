use crate::model::BudgetConfig;
use serde_json;

pub struct StorageManager;

impl StorageManager {
    /// Serialize BudgetConfig to JSON string
    pub fn to_json(config: &BudgetConfig) -> Result<String, String> {
        serde_json::to_string_pretty(config).map_err(|e| e.to_string())
    }

    /// Deserialize BudgetConfig from JSON string
    pub fn from_json(json_str: &str) -> Result<BudgetConfig, String> {
        serde_json::from_str(json_str).map_err(|e| e.to_string())
    }
}
