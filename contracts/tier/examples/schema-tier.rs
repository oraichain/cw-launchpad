use cosmwasm_schema::{export_schema, remove_schemas, schema_for};
use std::{env::current_dir, fs::create_dir_all};

fn main() {
    let current_dir = current_dir().unwrap();
    let mut schema_dir = current_dir;
    schema_dir.push("schema");

    let mut tier_dir = schema_dir.clone();
    tier_dir.push("tier");

    create_dir_all(&tier_dir).unwrap();
    remove_schemas(&tier_dir).unwrap();

    export_schema(&schema_for!(tier::msg::InitMsg), &tier_dir);
    export_schema(&schema_for!(tier::msg::HandleMsg), &tier_dir);
    export_schema(&schema_for!(tier::msg::QueryMsg), &tier_dir);
    export_schema(&schema_for!(tier::msg::HandleAnswer), &tier_dir);
    export_schema(&schema_for!(tier::msg::QueryAnswer), &tier_dir);
}
