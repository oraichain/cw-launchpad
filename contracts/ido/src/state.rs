use crate::msg::{PaymentMethod, PurchaseAnswer, QueryAnswer};
use cosmwasm_std::{Api, CanonicalAddr, StdResult, Storage, Uint128};
use cw_storage_plus::{AppendStore, DequeStore, Item, Keymap};
use serde::{Deserialize, Serialize};
use std::cmp::min;

static CONFIG_KEY: Item<Config> = Item::new(b"config");
static PURCHASES: DequeStore<Purchase> = DequeStore::new(b"purchases");
static ARCHIVED_PURCHASES: AppendStore<Purchase> = AppendStore::new(b"archive");
static ACTIVE_IDOS: Keymap<u32, bool> = Keymap::new(b"active_idos");
static IDO_TO_INFO: Keymap<u32, UserInfo> = Keymap::new(b"ido2info");
static OWNER_TO_IDOS: AppendStore<u32> = AppendStore::new(b"owner2idos");

pub fn ido_whitelist(ido_id: u32) -> Keymap<'static, CanonicalAddr, bool> {
    Keymap::new(b"whitelist").add_suffix(&ido_id.to_le_bytes())
}

pub fn active_ido_list(user: &CanonicalAddr) -> Keymap<u32, bool> {
    ACTIVE_IDOS.add_suffix(user.as_slice())
}

pub fn user_info() -> Keymap<'static, CanonicalAddr, UserInfo> {
    Keymap::new(b"usr2info")
}

pub fn user_info_in_ido(user: &CanonicalAddr) -> Keymap<'static, u32, UserInfo> {
    IDO_TO_INFO.add_suffix(user.as_slice())
}

pub fn purchases(user: &CanonicalAddr, ido_id: u32) -> DequeStore<Purchase> {
    PURCHASES
        .add_suffix(user.as_slice())
        .add_suffix(&ido_id.to_le_bytes())
}

pub fn archived_purchases(user: &CanonicalAddr, ido_id: u32) -> AppendStore<Purchase> {
    ARCHIVED_PURCHASES
        .add_suffix(user.as_slice())
        .add_suffix(&ido_id.to_le_bytes())
}

pub fn ido_list_owned_by(ido_admin: &CanonicalAddr) -> AppendStore<u32> {
    OWNER_TO_IDOS.add_suffix(ido_admin.as_slice())
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Config {
    pub admin: CanonicalAddr,
    pub status: u8,
    pub tier_contract: CanonicalAddr,
    pub tier_contract_hash: String,
    pub nft_contract: CanonicalAddr,
    pub nft_contract_hash: String,
    pub lock_periods: Vec<u64>,
    pub min_tier: u8,
}

impl Config {
    pub fn load(storage: &dyn Storage) -> StdResult<Self> {
        CONFIG_KEY.load(storage)
    }

    pub fn save(&self, storage: &mut dyn Storage) -> StdResult<()> {
        CONFIG_KEY.save(storage, self)
    }

    pub fn lock_period(&self, tier: u8) -> u64 {
        let tier_index = tier.checked_sub(1).unwrap();
        self.lock_periods[tier_index as usize]
    }

    pub fn to_answer<A: Api>(self, api: &A) -> StdResult<QueryAnswer> {
        let admin = api.human_address(&self.admin)?;
        let tier_contract = api.human_address(&self.tier_contract)?;
        let nft_contract = api.human_address(&self.nft_contract)?;

        Ok(QueryAnswer::Config {
            admin,
            tier_contract,
            tier_contract_hash: self.tier_contract_hash,
            nft_contract,
            nft_contract_hash: self.nft_contract_hash,
            lock_periods: self.lock_periods,
        })
    }
}

#[derive(Clone, Default, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Purchase {
    pub tokens_amount: u128,
    pub timestamp: u64,
    pub unlock_time: u64,
}

impl Purchase {
    pub fn to_answer(&self) -> PurchaseAnswer {
        PurchaseAnswer {
            tokens_amount: Uint128(self.tokens_amount),
            timestamp: self.timestamp,
            unlock_time: self.unlock_time,
        }
    }
}

#[derive(Clone, Default, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct UserInfo {
    pub total_payment: u128,
    pub total_tokens_bought: u128,
    pub total_tokens_received: u128,
}

impl UserInfo {
    pub fn to_answer(&self) -> QueryAnswer {
        QueryAnswer::UserInfo {
            total_payment: Uint128(self.total_payment),
            total_tokens_bought: Uint128(self.total_tokens_bought),
            total_tokens_received: Uint128(self.total_tokens_received),
        }
    }
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq)]
pub struct Ido {
    #[serde(skip)]
    id: Option<u32>,
    pub admin: CanonicalAddr,
    pub start_time: u64,
    pub end_time: u64,
    pub token_contract: CanonicalAddr,
    pub token_contract_hash: String,
    pub payment_token_contract: Option<CanonicalAddr>,
    pub payment_token_hash: Option<String>,
    pub price: u128,
    pub participants: u64,
    pub sold_amount: u128,
    pub remaining_tokens_per_tier: Vec<u128>,
    pub total_tokens_amount: u128,
    pub soft_cap: u128,
    pub total_payment: u128,
    pub withdrawn: bool,
    pub shared_whitelist: bool,
}

impl Ido {
    fn list() -> AppendStore<'static, Self> {
        AppendStore::new(b"ido")
    }

    pub fn load<S: ReadonlyStorage>(storage: &S, id: u32) -> StdResult<Self> {
        let list = Ido::list();
        let mut ido = list.get_at(storage, id)?;
        ido.id = Some(id);
        Ok(ido)
    }

    pub fn len<S: Storage>(storage: &S) -> StdResult<u32> {
        let list = Ido::list();
        list.get_len(storage)
    }

    pub fn save<S: Storage>(&mut self, storage: &mut S) -> StdResult<u32> {
        let list = Ido::list();

        let id = if let Some(id) = self.id {
            list.set_at(storage, id, self)?;
            id
        } else {
            let id = list.get_len(storage)?;
            self.id = Some(id);
            list.push(storage, self)?;
            id
        };

        Ok(id)
    }

    pub fn id(&self) -> u32 {
        self.id.unwrap()
    }

    pub fn is_stored(&self) -> bool {
        self.id.is_some()
    }

    pub fn is_active(&self, current_time: u64) -> bool {
        current_time >= self.start_time && current_time < self.end_time
    }

    pub fn is_native_payment(&self) -> bool {
        self.payment_token_contract.is_none() && self.payment_token_hash.is_none()
    }

    pub fn remaining_tokens(&self) -> u128 {
        self.total_tokens_amount
            .checked_sub(self.sold_amount)
            .unwrap()
    }

    pub fn remaining_tokens_per_tier(&self, tier: u8) -> u128 {
        let tier_index = tier.checked_sub(1).unwrap() as usize;
        let remaining_tokens_per_tier = self.remaining_tokens_per_tier[tier_index];
        let remaining_total_amount = self.remaining_tokens();

        min(remaining_tokens_per_tier, remaining_total_amount)
    }

    pub fn to_answer<A: Api>(&self, api: &A) -> StdResult<QueryAnswer> {
        let admin = api.human_address(&self.admin)?;
        let token_contract = api.human_address(&self.token_contract)?;

        let payment = if self.is_native_payment() {
            PaymentMethod::Native
        } else {
            let payment_contract =
                api.human_address(&self.payment_token_contract.clone().unwrap())?;
            let payment_contract_hash = self.payment_token_hash.clone().unwrap();

            PaymentMethod::Token {
                contract: payment_contract,
                code_hash: payment_contract_hash,
            }
        };
        let mut remaining_per_tiers: Vec<Uint128> = vec![];
        for tier in 1..=(self.remaining_tokens_per_tier.len() as u8) {
            remaining_per_tiers.push(Uint128(self.remaining_tokens_per_tier(tier)));
        }
        Ok(QueryAnswer::IdoInfo {
            admin,
            start_time: self.start_time,
            end_time: self.end_time,
            token_contract,
            token_contract_hash: self.token_contract_hash.clone(),
            price: Uint128(self.price),
            payment,
            remaining_per_tiers,
            participants: self.participants,
            sold_amount: Uint128(self.sold_amount),
            total_tokens_amount: Uint128(self.total_tokens_amount),
            total_payment: Uint128(self.total_payment),
            soft_cap: Uint128(self.soft_cap),
            withdrawn: self.withdrawn,
            shared_whitelist: self.shared_whitelist,
        })
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use cosmwasm_std::{testing::mock_dependencies, Addr, Api};

    #[test]
    fn ido() {
        let deps = mock_dependencies(20, &[]);
        let mut storage = deps.storage;

        assert_eq!(Ido::len(&storage), Ok(0));

        let loaded_ido = Ido::load(&storage, 0);
        assert!(loaded_ido.is_err());

        let token_address = Addr::from("token");
        let canonical_token_address = deps.api.canonical_address(&token_address).unwrap();

        let mut new_ido = Ido {
            start_time: 100,
            end_time: 150,
            token_contract: canonical_token_address,
            price: 100,
            total_tokens_amount: 1000,
            ..Ido::default()
        };

        assert!(!new_ido.is_stored());
        assert_eq!(Ido::len(&storage), Ok(0));

        new_ido.save(&mut storage).unwrap();
        assert!(new_ido.is_stored());
        assert_eq!(new_ido.id(), 0);
        assert_eq!(Ido::len(&storage), Ok(1));

        new_ido.save(&mut storage).unwrap();
        assert!(new_ido.is_stored());
        assert_eq!(new_ido.id(), 0);
        assert_eq!(Ido::len(&storage), Ok(1));

        let mut loaded_ido = Ido::load(&storage, 0).unwrap();
        assert_eq!(new_ido, loaded_ido);

        loaded_ido.save(&mut storage).unwrap();
        assert!(loaded_ido.is_stored());
        assert_eq!(new_ido, loaded_ido);
        assert_eq!(loaded_ido.id(), 0);
        assert_eq!(Ido::len(&storage), Ok(1));

        loaded_ido.id = None;
        loaded_ido.save(&mut storage).unwrap();
        assert!(loaded_ido.is_stored());
        assert_eq!(loaded_ido.id(), 1);
        assert_eq!(Ido::len(&storage), Ok(2));
    }
}
