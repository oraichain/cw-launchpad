use cosmwasm_schema::{export_schema, remove_schemas, schema_for};
use std::{env::current_dir, fs::create_dir_all};

fn main() {
    let current_dir = current_dir().unwrap();
    let mut schema_dir = current_dir;
    schema_dir.push("schema");

    let mut ido_dir = schema_dir.clone();
    ido_dir.push("ido");

    create_dir_all(&ido_dir).unwrap();
    remove_schemas(&ido_dir).unwrap();

    export_schema(&schema_for!(ido::msg::InstantiateMsg), &ido_dir);
    export_schema(&schema_for!(ido::msg::ExecuteMsg), &ido_dir);
    export_schema(&schema_for!(ido::msg::QueryMsg), &ido_dir);
    export_schema(&schema_for!(ido::msg::HandleAnswer), &ido_dir);
    export_schema(&schema_for!(ido::msg::QueryAnswer), &ido_dir);
}
