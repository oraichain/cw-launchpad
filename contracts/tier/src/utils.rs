use crate::{contract::USCRT, state::Config};
use cosmwasm_std::{
    Api, Coin, Empty, Env, FullDelegation, Addr, Querier, QueryRequest, StakingQuery,
    StdError, StdResult,
};
use serde::Deserialize;

pub fn assert_admin<A: Api>(api: &A, env: &Env, config: &Config) -> StdResult<()> {
    let owner = api.human_address(&config.admin)?;
    if env.message.sender != owner {
        return Err(StdError::unauthorized());
    }

    Ok(())
}

pub fn check_validator<Q: Querier>(querier: &Q, validator: &Addr) -> StdResult<()> {
    let validators = querier.query_validators()?;
    let has_validator = validators.iter().any(|v| v.address == *validator);
    if !has_validator {
        return Err(StdError::generic_err(&format!(
            "Validator {} not found",
            validator
        )));
    }

    Ok(())
}

pub fn get_deposit(env: &Env) -> StdResult<u128> {
    let mut funds: u128 = 0;
    for coin in &env.message.sent_funds {
        if coin.denom != "uscrt" {
            return Err(StdError::generic_err("Unsopported token"));
        }

        funds = funds.checked_add(coin.amount.u128()).unwrap();
    }

    Ok(funds)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
struct FixedDelegationResponse {
    pub delegation: Option<FixedFullDelegation>,
}

#[derive(Debug, Deserialize)]
pub struct FixedFullDelegation {
    pub delegator: Addr,
    pub validator: Addr,
    pub amount: Coin,
    pub can_redelegate: Coin,
    pub accumulated_rewards: Vec<Coin>,
}

impl From<FixedFullDelegation> for FullDelegation {
    fn from(val: FixedFullDelegation) -> Self {
        let found_rewards = val
            .accumulated_rewards
            .into_iter()
            .find(|r| r.denom == USCRT);

        let accumulated_rewards = found_rewards.unwrap_or_else(|| Coin::new(0, USCRT));
        FullDelegation {
            delegator: val.delegator,
            validator: val.validator,
            amount: val.amount,
            can_redelegate: val.can_redelegate,
            accumulated_rewards,
        }
    }
}

pub fn query_delegation<Q: Querier>(
    querier: &Q,
    env: &Env,
    validator: &Addr,
) -> StdResult<Option<FullDelegation>> {
    let delegation_request = StakingQuery::Delegation {
        delegator: env.contract.address.clone(),
        validator: validator.clone(),
    };

    let request: QueryRequest<Empty> = QueryRequest::Staking(delegation_request);
    let response: StdResult<FixedDelegationResponse> = querier.custom_query(&request);

    let delegation = match response {
        Ok(response) => response.delegation.map(Into::into),
        _ => querier.query_delegation(&env.contract.address, validator)?,
    };

    Ok(delegation)
}
