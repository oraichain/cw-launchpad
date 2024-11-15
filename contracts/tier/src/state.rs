use crate::msg::{ContractStatus, QueryAnswer, SerializedWithdrawals};
use cosmwasm_std::{
    Api, CanonicalAddr, Addr, ReadonlyStorage, StdError, StdResult, Storage, Uint128,
};
use secret_toolkit_storage::{DequeStore, Item, Keymap};
use serde::{Deserialize, Serialize};

static CONFIG_ITEM: Item<Config> = Item::new(b"config");
static WITHDRAWALS_LIST: DequeStore<UserWithdrawal> = DequeStore::new(b"withdraw");

pub fn user_infos() -> Keymap<'static, CanonicalAddr, UserInfo> {
    Keymap::new(b"user_info")
}

pub fn withdrawals_list(address: &CanonicalAddr) -> DequeStore<'static, UserWithdrawal> {
    WITHDRAWALS_LIST.add_suffix(address.as_slice())
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Config {
    pub admin: CanonicalAddr,
    pub validator: Addr,
    pub status: u8,
    pub band_oracle: Addr,
    pub band_code_hash: String,
    pub usd_deposits: Vec<u128>,
}

impl Config {
    pub fn load<S: ReadonlyStorage>(storage: &S) -> StdResult<Self> {
        CONFIG_ITEM.load(storage)
    }

    pub fn save<S: Storage>(&self, storage: &mut S) -> StdResult<()> {
        CONFIG_ITEM.save(storage, self)
    }

    pub fn min_tier(&self) -> u8 {
        self.usd_deposits.len().checked_add(1).unwrap() as u8
    }

    pub fn max_tier(&self) -> u8 {
        1
    }

    pub fn deposit_by_tier(&self, tier: u8) -> u128 {
        let tier_index = tier.checked_sub(1).unwrap();
        self.usd_deposits[tier_index as usize]
    }

    pub fn tier_by_deposit(&self, usd_deposit: u128) -> u8 {
        self.usd_deposits
            .iter()
            .position(|d| *d <= usd_deposit)
            .unwrap_or(self.usd_deposits.len())
            .checked_add(1)
            .unwrap() as u8
    }

    pub fn assert_contract_active(&self) -> StdResult<()> {
        let active = ContractStatus::Active as u8;
        if self.status != active {
            return Err(StdError::generic_err("Contract is not active"));
        }

        Ok(())
    }

    pub fn to_answer<A: Api>(&self, api: &A) -> StdResult<QueryAnswer> {
        let admin = api.human_address(&self.admin)?;
        let min_tier = self.usd_deposits.len().checked_add(1).unwrap() as u8;

        return Ok(QueryAnswer::Config {
            admin,
            min_tier,
            validator: self.validator.clone(),
            status: self.status.into(),
            band_oracle: self.band_oracle.clone(),
            band_code_hash: self.band_code_hash.clone(),
            usd_deposits: self
                .usd_deposits
                .iter()
                .map(|d| Uint128::from(*d))
                .collect(),
        });
    }
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct UserInfo {
    pub tier: u8,
    pub timestamp: u64,
    pub usd_deposit: u128,
    pub scrt_deposit: u128,
}

impl UserInfo {
    pub fn to_answer(&self) -> QueryAnswer {
        QueryAnswer::UserInfo {
            tier: self.tier,
            timestamp: self.timestamp,
            usd_deposit: Uint128(self.usd_deposit),
            scrt_deposit: Uint128(self.scrt_deposit),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct UserWithdrawal {
    pub amount: u128,
    pub claim_time: u64,
    pub timestamp: u64,
}

impl UserWithdrawal {
    pub fn to_serialized(&self) -> SerializedWithdrawals {
        SerializedWithdrawals {
            amount: Uint128(self.amount),
            claim_time: self.claim_time,
            timestamp: self.timestamp,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::{testing::mock_dependencies, Api, Addr};

    fn get_config<A: Api>(api: &A) -> Config {
        let owner = Addr::from("owner");
        let validator = Addr::from("validator");

        Config {
            status: ContractStatus::Stopped as u8,
            admin: api.canonical_address(&owner).unwrap(),
            validator,
            band_oracle: "band_oracle".into(),
            band_code_hash: String::new(),
            usd_deposits: vec![40, 30, 20, 10],
        }
    }

    #[test]
    fn config() {
        let mut deps = mock_dependencies(20, &[]);
        let mut config = get_config(&deps.api);
        assert!(config.assert_contract_active().is_err());

        config.status = ContractStatus::Active as u8;
        assert!(config.assert_contract_active().is_ok());

        config.save(&mut deps.storage).unwrap();

        let loaded_config = Config::load(&deps.storage).unwrap();
        assert_eq!(config, loaded_config);
    }

    #[test]
    fn tier_by_deposit() {
        let deps = mock_dependencies(20, &[]);
        let config = get_config(&deps.api);

        assert_eq!(config.max_tier(), 1);
        assert_eq!(config.min_tier(), 5);

        assert_eq!(config.tier_by_deposit(9), 5);
        assert_eq!(config.tier_by_deposit(10), 4);
        assert_eq!(config.tier_by_deposit(19), 4);
        assert_eq!(config.tier_by_deposit(20), 3);
        assert_eq!(config.tier_by_deposit(29), 3);
        assert_eq!(config.tier_by_deposit(30), 2);
        assert_eq!(config.tier_by_deposit(39), 2);
        assert_eq!(config.tier_by_deposit(40), 1);
    }
}
