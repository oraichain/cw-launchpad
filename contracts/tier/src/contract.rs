use crate::{
    band::BandProtocol,
    msg::{
        ContractStatus, HandleAnswer, ExecuteMsg, InstantiateMsg, QueryAnswer, QueryMsg,
        ResponseStatus,
    },
    state::{self, Config, UserInfo, UserWithdrawal},
    utils,
};
use cosmwasm_std::{
    coin, coins, to_binary, Api, BankMsg, CosmosMsg, Env, Extern, HandleResponse, HandleResult,
    Addr, InitResponse, InitResult, Querier, QueryResult, StakingMsg, StdError, Storage,
    Uint128,
};
use secret_toolkit_utils::{pad_handle_result, pad_query_result};

pub const BLOCK_SIZE: usize = 256;
pub const UNBOUND_LATENCY: u64 = 21 * 24 * 60 * 60;
pub const USCRT: &str = "uscrt";

pub fn init<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    msg: InstantiateMsg,
) -> InitResult {
    let deposits = msg.deposits.iter().map(|v| v.u128()).collect::<Vec<_>>();

    if deposits.is_empty() {
        return Err(StdError::generic_err("Deposits array is empty"));
    }

    let is_sorted = deposits.as_slice().windows(2).all(|v| v[0] > v[1]);
    if !is_sorted {
        return Err(StdError::generic_err(
            "Specify deposits in decreasing order",
        ));
    }

    let admin = msg.admin.unwrap_or(env.message.sender);
    let initial_config = Config {
        status: ContractStatus::Active as u8,
        admin: deps.api.canonical_address(&admin)?,
        validator: msg.validator,
        usd_deposits: deposits,
        band_oracle: msg.band_oracle,
        band_code_hash: msg.band_code_hash,
    };

    initial_config.save(&mut deps.storage)?;
    Ok(InitResponse::default())
}

pub fn handle<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    msg: ExecuteMsg,
) -> HandleResult {
    let response = match msg {
        ExecuteMsg::ChangeAdmin { admin, .. } => try_change_admin(deps, env, admin),
        ExecuteMsg::ChangeStatus { status, .. } => try_change_status(deps, env, status),
        ExecuteMsg::Deposit { .. } => try_deposit(deps, env),
        ExecuteMsg::Withdraw { .. } => try_withdraw(deps, env),
        ExecuteMsg::Claim {
            recipient,
            start,
            limit,
            ..
        } => try_claim(deps, env, recipient, start, limit),
        ExecuteMsg::WithdrawRewards { recipient, .. } => try_withdraw_rewards(deps, env, recipient),
        ExecuteMsg::Redelegate {
            validator_address,
            recipient,
            ..
        } => try_redelegate(deps, env, validator_address, recipient),
    };

    pad_handle_result(response, BLOCK_SIZE)
}

pub fn query<S: Storage, A: Api, Q: Querier>(deps: &Extern<S, A, Q>, msg: QueryMsg) -> QueryResult {
    let response = match msg {
        QueryMsg::Config {} => query_config(deps),
        QueryMsg::UserInfo { address } => query_user_info(deps, address),
        QueryMsg::Withdrawals {
            address,
            start,
            limit,
        } => query_withdrawals(deps, address, start, limit),
    };

    pad_query_result(response, BLOCK_SIZE)
}

pub fn try_change_admin<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    new_admin: Addr,
) -> HandleResult {
    let mut config = Config::load(&deps.storage)?;
    utils::assert_admin(&deps.api, &env, &config)?;

    let canonical_admin = deps.api.canonical_address(&new_admin)?;
    config.admin = canonical_admin;
    config.save(&mut deps.storage)?;

    let answer = to_binary(&HandleAnswer::ChangeAdmin {
        status: ResponseStatus::Success,
    })?;

    Ok(HandleResponse {
        data: Some(answer),
        ..Default::default()
    })
}

pub fn try_change_status<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    status: ContractStatus,
) -> HandleResult {
    let mut config = Config::load(&deps.storage)?;
    utils::assert_admin(&deps.api, &env, &config)?;

    config.status = status as u8;
    config.save(&mut deps.storage)?;

    let answer = to_binary(&HandleAnswer::ChangeStatus {
        status: ResponseStatus::Success,
    })?;

    Ok(HandleResponse {
        data: Some(answer),
        ..Default::default()
    })
}

pub fn try_deposit<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
) -> HandleResult {
    let config = Config::load(&deps.storage)?;
    config.assert_contract_active()?;

    let mut scrt_deposit = utils::get_deposit(&env)?;
    if scrt_deposit == 0 {
        return Err(StdError::generic_err("Deposit zero tokens"));
    }

    let band_protocol = BandProtocol::new(
        &deps.querier,
        config.band_oracle.clone(),
        config.band_code_hash.clone(),
    )?;

    let usd_deposit = band_protocol.usd_amount(scrt_deposit);

    let sender = deps.api.canonical_address(&env.message.sender)?;
    let user_infos = state::user_infos();
    let min_tier = config.min_tier();

    let mut user_info = user_infos
        .get(&deps.storage, &sender)
        .unwrap_or(state::UserInfo {
            tier: min_tier,
            ..Default::default()
        });

    let current_tier = user_info.tier;
    let old_usd_deposit = user_info.usd_deposit;
    let new_usd_deposit = old_usd_deposit.checked_add(usd_deposit).unwrap();

    let new_tier = config.tier_by_deposit(new_usd_deposit);

    if current_tier == new_tier {
        if current_tier == config.max_tier() {
            return Err(StdError::generic_err("Reached max tier"));
        }

        let next_tier = current_tier.checked_sub(1).unwrap();
        let next_tier_deposit = config.deposit_by_tier(next_tier);

        let expected_deposit_usd = next_tier_deposit.checked_sub(old_usd_deposit).unwrap();
        let expected_deposit_scrt = band_protocol.uscrt_amount(expected_deposit_usd);

        let err_msg = format!(
            "You should deposit at least {} USD ({} USCRT)",
            expected_deposit_usd, expected_deposit_scrt
        );

        return Err(StdError::generic_err(&err_msg));
    }

    let mut messages = Vec::with_capacity(2);
    let new_tier_deposit = config.deposit_by_tier(new_tier);

    let usd_refund = new_usd_deposit.checked_sub(new_tier_deposit).unwrap();
    let scrt_refund = band_protocol.uscrt_amount(usd_refund);

    if scrt_refund != 0 {
        scrt_deposit = scrt_deposit.checked_sub(scrt_refund).unwrap();

        let send_msg = BankMsg::Send {
            to_address: env.message.sender,
            amount: coins(scrt_refund, USCRT),
        };

        let msg = CosmosMsg::Bank(send_msg);
        messages.push(msg);
    }
    let old_scrt_deposit = user_info.scrt_deposit;
    user_info.tier = new_tier;
    user_info.timestamp = env.block.time;
    user_info.usd_deposit = new_tier_deposit;
    user_info.scrt_deposit = user_info.scrt_deposit.checked_add(scrt_deposit).unwrap();
    user_infos.insert(&mut deps.storage, &sender, &user_info)?;

    let delegate_msg = StakingMsg::Delegate {
        validator: config.validator,
        amount: coin(
            user_info
                .scrt_deposit
                .checked_sub(old_scrt_deposit)
                .unwrap(),
            USCRT,
        ),
    };

    let msg = CosmosMsg::Staking(delegate_msg);
    messages.push(msg);

    let answer = to_binary(&HandleAnswer::Deposit {
        usd_deposit: Uint128(user_info.usd_deposit),
        scrt_deposit: Uint128(user_info.scrt_deposit),
        tier: new_tier,
        status: ResponseStatus::Success,
    })?;

    Ok(HandleResponse {
        messages,
        data: Some(answer),
        ..Default::default()
    })
}

pub fn try_withdraw<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
) -> HandleResult {
    let config = Config::load(&deps.storage)?;
    config.assert_contract_active()?;

    let sender = deps.api.canonical_address(&env.message.sender)?;
    let user_infos = state::user_infos();
    let user_info = user_infos
        .get(&deps.storage, &sender)
        .ok_or_else(|| StdError::not_found("user"))?;

    let amount = user_info.scrt_deposit;
    user_infos.remove(&mut deps.storage, &sender)?;

    let current_time = env.block.time;
    let claim_time = current_time.checked_add(UNBOUND_LATENCY).unwrap();
    let withdrawal = UserWithdrawal {
        amount,
        timestamp: current_time,
        claim_time,
    };

    let withdrawals = state::withdrawals_list(&sender);
    withdrawals.push_back(&mut deps.storage, &withdrawal)?;

    let config = Config::load(&deps.storage)?;
    let validator = config.validator;
    let amount = coin(amount - 4, USCRT);

    let withdraw_msg = StakingMsg::Undelegate { validator, amount };
    let msg = CosmosMsg::Staking(withdraw_msg);

    let answer = to_binary(&HandleAnswer::Withdraw {
        status: ResponseStatus::Success,
    })?;

    Ok(HandleResponse {
        messages: vec![msg],
        data: Some(answer),
        ..Default::default()
    })
}

pub fn try_claim<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    recipient: Option<Addr>,
    start: Option<u32>,
    limit: Option<u32>,
) -> HandleResult {
    let config = Config::load(&deps.storage)?;
    config.assert_contract_active()?;

    let sender = deps.api.canonical_address(&env.message.sender)?;
    let withdrawals = state::withdrawals_list(&sender);
    let length = withdrawals.get_len(&deps.storage)?;

    if length == 0 {
        return Err(StdError::generic_err("Nothing to claim"));
    }

    let recipient = recipient.unwrap_or(env.message.sender);
    let start = start.unwrap_or(0) as usize;
    let limit = limit.unwrap_or(50) as usize;
    let withdrawals_iter = withdrawals.iter(&deps.storage)?.skip(start).take(limit);

    let current_time = env.block.time;
    let mut remove_indices = Vec::new();
    let mut claim_amount = 0u128;

    for (index, withdrawal) in withdrawals_iter.enumerate() {
        let withdrawal = withdrawal?;
        let claim_time = withdrawal.claim_time;

        if current_time >= claim_time {
            remove_indices.push(index);
            claim_amount = claim_amount.checked_add(withdrawal.amount).unwrap();
        }
    }

    if claim_amount == 0 {
        return Err(StdError::generic_err("Nothing to claim"));
    }

    for (shift, index) in remove_indices.into_iter().enumerate() {
        let position = index.checked_sub(shift).unwrap();
        withdrawals.remove(&mut deps.storage, position as u32)?;
    }

    let send_msg = BankMsg::Send {
        to_address: recipient,
        amount: coins(claim_amount, USCRT),
    };

    let msg = CosmosMsg::Bank(send_msg);
    let answer = to_binary(&HandleAnswer::Claim {
        amount: claim_amount.into(),
        status: ResponseStatus::Success,
    })?;

    Ok(HandleResponse {
        messages: vec![msg],
        data: Some(answer),
        ..Default::default()
    })
}

pub fn try_withdraw_rewards<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    recipient: Option<Addr>,
) -> HandleResult {
    let config = Config::load(&deps.storage)?;
    utils::assert_admin(&deps.api, &env, &config)?;

    let validator = config.validator;
    let delegation = utils::query_delegation(&deps.querier, &env, &validator)?;

    let can_withdraw = delegation
        .map(|d| d.accumulated_rewards.amount.u128())
        .unwrap_or(0);

    if can_withdraw == 0 {
        return Err(StdError::generic_err("There is nothing to withdraw"));
    }

    let admin = deps.api.human_address(&config.admin)?;
    let recipient = recipient.unwrap_or(admin);
    let withdraw_msg = StakingMsg::Withdraw {
        validator,
        recipient: Some(recipient),
    };

    let msg = CosmosMsg::Staking(withdraw_msg);
    let answer = to_binary(&HandleAnswer::WithdrawRewards {
        amount: Uint128(can_withdraw),
        status: ResponseStatus::Success,
    })?;

    Ok(HandleResponse {
        messages: vec![msg],
        data: Some(answer),
        ..Default::default()
    })
}

pub fn try_redelegate<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    validator_address: Addr,
    recipient: Option<Addr>,
) -> HandleResult {
    let mut config = Config::load(&deps.storage)?;
    utils::assert_admin(&deps.api, &env, &config)?;

    let old_validator = config.validator;
    let delegation = utils::query_delegation(&deps.querier, &env, &old_validator)?;

    if old_validator == validator_address {
        return Err(StdError::generic_err("Redelegation to the same validator"));
    }

    if delegation.is_none() {
        config.validator = validator_address;
        config.save(&mut deps.storage)?;

        let answer = to_binary(&HandleAnswer::Redelegate {
            amount: Uint128(0),
            status: ResponseStatus::Success,
        })?;

        return Ok(HandleResponse {
            data: Some(answer),
            ..Default::default()
        });
    }

    let delegation = delegation.unwrap();
    let can_withdraw = delegation.accumulated_rewards.amount.u128();
    let can_redelegate = delegation.can_redelegate.amount.u128();
    let delegated_amount = delegation.amount.amount.u128();

    if can_redelegate != delegated_amount {
        return Err(StdError::generic_err(
            "Cannot redelegate full delegation amount",
        ));
    }

    config.validator = validator_address.clone();
    config.save(&mut deps.storage)?;

    let mut messages = Vec::with_capacity(2);
    if can_withdraw != 0 {
        let admin = deps.api.human_address(&config.admin)?;
        let recipient = recipient.unwrap_or(admin);
        let withdraw_msg = StakingMsg::Withdraw {
            validator: old_validator.clone(),
            recipient: Some(recipient),
        };

        messages.push(CosmosMsg::Staking(withdraw_msg));
    }

    let coin = coin(can_redelegate, USCRT);
    let redelegate_msg = StakingMsg::Redelegate {
        src_validator: old_validator,
        dst_validator: validator_address,
        amount: coin,
    };

    messages.push(CosmosMsg::Staking(redelegate_msg));
    let answer = to_binary(&HandleAnswer::Redelegate {
        amount: Uint128(can_redelegate),
        status: ResponseStatus::Success,
    })?;

    Ok(HandleResponse {
        messages,
        data: Some(answer),
        ..Default::default()
    })
}

pub fn query_config<S: Storage, A: Api, Q: Querier>(deps: &Extern<S, A, Q>) -> QueryResult {
    let config = Config::load(&deps.storage)?;
    let answer = config.to_answer(&deps.api)?;

    to_binary(&answer)
}

pub fn query_user_info<S: Storage, A: Api, Q: Querier>(
    deps: &Extern<S, A, Q>,
    address: Addr,
) -> QueryResult {
    let config = Config::load(&deps.storage)?;
    let canonical_address = deps.api.canonical_address(&address)?;
    let user_infos = state::user_infos();

    let min_tier = config.min_tier();
    let user_info = user_infos
        .get(&deps.storage, &canonical_address)
        .unwrap_or(UserInfo {
            tier: min_tier,
            ..Default::default()
        });

    let answer = user_info.to_answer();
    to_binary(&answer)
}

pub fn query_withdrawals<S: Storage, A: Api, Q: Querier>(
    deps: &Extern<S, A, Q>,
    address: Addr,
    start: Option<u32>,
    limit: Option<u32>,
) -> QueryResult {
    let canonical_address = deps.api.canonical_address(&address)?;
    let withdrawals = state::withdrawals_list(&canonical_address);
    let amount = withdrawals.get_len(&deps.storage)?;

    let start = start.unwrap_or(0);
    let limit = limit.unwrap_or(50);

    let withdrawals = withdrawals.paging(&deps.storage, start, limit)?;
    let serialized_withdrawals = withdrawals.into_iter().map(|w| w.to_serialized()).collect();

    let answer = QueryAnswer::Withdrawals {
        amount,
        withdrawals: serialized_withdrawals,
    };

    to_binary(&answer)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{msg::SerializedWithdrawals, state::UserInfo};
    use cosmwasm_std::{
        from_binary,
        testing::{mock_dependencies, mock_env, MockApi, MockQuerier},
        FullDelegation, MemoryStorage, StdResult,
    };
    use rand::{thread_rng, Rng};
    use std::time::{SystemTime, UNIX_EPOCH};

    fn current_time() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
    }

    fn init_contract(
        init_msg: InstantiateMsg,
    ) -> Result<Extern<MemoryStorage, MockApi, MockQuerier>, StdError> {
        let balance = coins(1000, USCRT);
        let mut deps = mock_dependencies(20, &[]);
        let mut env = mock_env("admin", &balance);
        env.block.time = current_time();

        init(&mut deps, env, init_msg).map(|_| deps)
    }

    fn init_with_default() -> Extern<MemoryStorage, MockApi, MockQuerier> {
        let admin = Addr::from("admin");
        let validator = Addr::from("validator");
        let deposits = vec![20000u128, 5000, 750, 100]
            .into_iter()
            .map(Into::into)
            .collect();

        let init_msg = InstantiateMsg {
            admin: Some(admin),
            validator,
            deposits,
            band_oracle: "band_oracle".into(),
            band_code_hash: String::new(),
        };

        init_contract(init_msg).unwrap()
    }

    fn extract_error<T>(response: StdResult<T>) -> String {
        match response {
            Ok(_) => panic!("Response is not an error"),
            Err(err) => match err {
                StdError::GenericErr { msg, .. } => msg,
                StdError::Unauthorized { .. } => "Unauthorized".into(),
                StdError::NotFound { .. } => "Not found".into(),
                _ => panic!("Unexpected error"),
            },
        }
    }

    fn config_info<S: Storage, A: Api, Q: Querier>(deps: &Extern<S, A, Q>) -> Config {
        let msg = QueryMsg::Config {};
        let response = query(deps, msg).unwrap();

        match from_binary(&response).unwrap() {
            QueryAnswer::Config {
                admin,
                validator,
                status,
                usd_deposits,
                ..
            } => Config {
                admin: deps.api.canonical_address(&admin).unwrap(),
                validator,
                status: status as u8,
                usd_deposits: usd_deposits.iter().map(|d| d.u128()).collect(),
                band_oracle: "band_oracle".into(),
                band_code_hash: String::new(),
            },
            _ => unreachable!(),
        }
    }

    fn user_info<S: Storage, A: Api, Q: Querier>(
        deps: &Extern<S, A, Q>,
        address: Addr,
    ) -> UserInfo {
        let msg = QueryMsg::UserInfo { address };
        let response = query(deps, msg).unwrap();

        match from_binary(&response).unwrap() {
            QueryAnswer::UserInfo {
                tier,
                timestamp,
                usd_deposit,
                scrt_deposit,
            } => UserInfo {
                tier,
                timestamp,
                usd_deposit: usd_deposit.u128(),
                scrt_deposit: scrt_deposit.u128(),
            },
            _ => unreachable!(),
        }
    }

    fn get_withdrawals<S: Storage, A: Api, Q: Querier>(
        deps: &Extern<S, A, Q>,
        address: Addr,
    ) -> Vec<SerializedWithdrawals> {
        let msg = QueryMsg::Withdrawals {
            address,
            start: None,
            limit: None,
        };
        let response = query(deps, msg).unwrap();

        match from_binary(&response).unwrap() {
            QueryAnswer::Withdrawals {
                amount,
                withdrawals,
            } => {
                assert_eq!(amount as usize, withdrawals.len());
                withdrawals
            }
            _ => unreachable!(),
        }
    }

    #[test]
    fn initialization() {
        let admin = Addr::from("admin");
        let validator = Addr::from("secretvaloper1l92u46n0d33mhkknwm7zpg0twlqqxg826990re");

        let deposits: Vec<Uint128> = vec![20000u128, 5000, 750, 100]
            .into_iter()
            .map(Into::into)
            .collect();

        // Wrong order
        let wrong_deposits = vec![20000u128, 750, 5000, 100]
            .into_iter()
            .map(Into::into)
            .collect();

        let init_msg = InstantiateMsg {
            admin: Some(admin.clone()),
            validator: validator.clone(),
            deposits: wrong_deposits,
            band_oracle: "band_oracle".into(),
            band_code_hash: String::new(),
        };

        let response = init_contract(init_msg);
        let error = extract_error(response);
        assert!(error.contains("Specify deposits in decreasing order"));

        // Zero elements in deposits
        let init_msg = InstantiateMsg {
            admin: Some(admin.clone()),
            validator: validator.clone(),
            deposits: vec![],
            band_oracle: "band_oracle".into(),
            band_code_hash: String::new(),
        };

        let response = init_contract(init_msg);
        let error = extract_error(response);
        assert!(error.contains("Deposits array is empty"));

        // Init with sender
        let init_msg = InstantiateMsg {
            admin: None,
            validator: validator.clone(),
            deposits: deposits.clone(),
            band_oracle: "band_oracle".into(),
            band_code_hash: String::new(),
        };

        let deps = init_contract(init_msg).unwrap();
        let config = Config::load(&deps.storage).unwrap();
        let canonical_admin = deps.api.canonical_address(&admin).unwrap();
        let length = config.usd_deposits.len();

        assert_eq!(config.admin, canonical_admin);
        assert_eq!(config.validator, validator);
        assert_eq!(config, config_info(&deps));
        assert_eq!(length, deposits.len() as usize);

        for index in 0..length {
            let tier_deposit = config.usd_deposits[index];
            let expected_deposit = deposits[index as usize];
            assert_eq!(tier_deposit, expected_deposit.u128());
        }

        // Init with custom admin
        let alice = Addr::from("alice");
        let init_msg = InstantiateMsg {
            admin: Some(alice.clone()),
            validator: validator.clone(),
            deposits,
            band_oracle: "band_oracle".into(),
            band_code_hash: String::new(),
        };

        let deps = init_contract(init_msg).unwrap();
        let config = Config::load(&deps.storage).unwrap();
        let canonical_alice = deps.api.canonical_address(&alice).unwrap();

        assert_eq!(config.admin, canonical_alice);
        assert_eq!(config.validator, validator);
        assert_eq!(config, config_info(&deps));
    }

    #[test]
    fn change_admin() {
        let mut deps = init_with_default();
        let admin = Addr::from("admin");
        let alice = Addr::from("alice");
        let new_admin = Addr::from("new_admin");

        let env = mock_env(&alice, &[]);
        let change_admin_msg = ExecuteMsg::ChangeAdmin {
            admin: new_admin.clone(),
            padding: None,
        };

        let response = handle(&mut deps, env, change_admin_msg.clone());
        let error = extract_error(response);
        assert!(error.contains("Unauthorized"));

        let env = mock_env(&admin, &[]);
        handle(&mut deps, env, change_admin_msg).unwrap();

        let config = Config::load(&deps.storage).unwrap();
        let new_admin_canonical = deps.api.canonical_address(&new_admin).unwrap();
        assert_eq!(config.admin, new_admin_canonical);
    }

    #[test]
    fn change_status() {
        let mut deps = init_with_default();
        let admin = Addr::from("admin");
        let alice = Addr::from("alice");

        let env = mock_env(&alice, &[]);
        let change_admin_msg = ExecuteMsg::ChangeStatus {
            status: ContractStatus::Stopped,
            padding: None,
        };

        let response = handle(&mut deps, env, change_admin_msg.clone());
        let error = extract_error(response);
        assert!(error.contains("Unauthorized"));

        let env = mock_env(&admin, &[]);
        handle(&mut deps, env.clone(), change_admin_msg).unwrap();

        let config = Config::load(&deps.storage).unwrap();
        assert_eq!(config.status, ContractStatus::Stopped as u8);

        let change_admin_msg = ExecuteMsg::ChangeStatus {
            status: ContractStatus::Active,
            padding: None,
        };

        handle(&mut deps, env, change_admin_msg).unwrap();
        let config = Config::load(&deps.storage).unwrap();
        assert_eq!(config.status, ContractStatus::Active as u8);
    }

    #[test]
    fn deposit() {
        let mut deps = init_with_default();
        let alice = Addr::from("alice");

        let alice_info = user_info(&deps, alice.clone());
        assert_eq!(alice_info.scrt_deposit, 0);
        assert_eq!(alice_info.usd_deposit, 0);
        assert_eq!(alice_info.timestamp, 0);
        assert_eq!(alice_info.tier, 5);

        let mut env = mock_env(alice.clone(), &[]);
        env.block.time = current_time();
        env.message.sent_funds = coins(99, USCRT);

        let deposit_msg = ExecuteMsg::Deposit { padding: None };
        let response = handle(&mut deps, env.clone(), deposit_msg.clone());
        let error = extract_error(response);
        assert!(error.contains("You should deposit at least 100 USD (200 USCRT)"));

        env.message.sent_funds = coins(100, "ust");
        let response = handle(&mut deps, env.clone(), deposit_msg.clone());
        let error = extract_error(response);
        assert!(error.contains("Unsopported token"));

        // 1 SCRT = 0.5 USD
        env.message.sent_funds = coins(200, USCRT);
        let response = handle(&mut deps, env.clone(), deposit_msg.clone()).unwrap();

        match from_binary(&response.data.unwrap()).unwrap() {
            HandleAnswer::Deposit {
                usd_deposit,
                scrt_deposit,
                tier,
                status,
            } => {
                assert_eq!(usd_deposit.u128(), 100);
                assert_eq!(scrt_deposit.u128(), 200);
                assert_eq!(tier, 4);
                assert_eq!(status, ResponseStatus::Success);
            }
            _ => unreachable!(),
        }

        assert_eq!(response.messages.len(), 1);
        assert_eq!(
            response.messages[0],
            CosmosMsg::Staking(StakingMsg::Delegate {
                validator: Addr::from("validator"),
                amount: coin(200, USCRT)
            })
        );

        let alice_info = user_info(&deps, alice.clone());

        assert_eq!(alice_info.scrt_deposit, 200);
        assert_eq!(alice_info.usd_deposit, 100);
        assert_eq!(alice_info.tier, 4);
        assert_eq!(alice_info.timestamp, env.block.time);

        env.block.time += 100;
        env.message.sent_funds = coins(1299, USCRT);
        let response = handle(&mut deps, env.clone(), deposit_msg.clone());
        let error = extract_error(response);
        assert!(error.contains("You should deposit at least 650 USD (1300 USCRT)"));

        env.message.sent_funds = coins(10_000, USCRT);
        let response = handle(&mut deps, env.clone(), deposit_msg.clone()).unwrap();

        match from_binary(&response.data.unwrap()).unwrap() {
            HandleAnswer::Deposit {
                usd_deposit,
                scrt_deposit,
                tier,
                status,
            } => {
                assert_eq!(usd_deposit.u128(), 5000);
                assert_eq!(scrt_deposit.u128(), 10000);
                assert_eq!(tier, 2);
                assert_eq!(status, ResponseStatus::Success);
            }
            _ => unreachable!(),
        }

        assert_eq!(response.messages.len(), 2);
        assert_eq!(
            response.messages[0],
            CosmosMsg::Bank(BankMsg::Send {
                from_address: env.contract.address.clone(),
                to_address: alice.clone(),
                amount: coins(200, USCRT),
            })
        );
        assert_eq!(
            response.messages[1],
            CosmosMsg::Staking(StakingMsg::Delegate {
                validator: Addr::from("validator"),
                amount: coin(9800, USCRT)
            })
        );

        let alice_info = user_info(&deps, alice.clone());
        assert_eq!(alice_info.scrt_deposit, 10000);
        assert_eq!(alice_info.usd_deposit, 5000);
        assert_eq!(alice_info.tier, 2);
        assert_eq!(alice_info.timestamp, env.block.time);

        env.block.time += 100;
        env.message.sent_funds = coins(20000, USCRT);
        let response = handle(&mut deps, env.clone(), deposit_msg.clone());
        let error = extract_error(response);
        assert!(error.contains("You should deposit at least 15000 USD (30000 USCRT)"));

        env.message.sent_funds = coins(100000, USCRT);
        let response = handle(&mut deps, env.clone(), deposit_msg.clone()).unwrap();

        match from_binary(&response.data.unwrap()).unwrap() {
            HandleAnswer::Deposit {
                usd_deposit,
                scrt_deposit,
                tier,
                status,
            } => {
                assert_eq!(usd_deposit.u128(), 20000);
                assert_eq!(scrt_deposit.u128(), 40000);
                assert_eq!(tier, 1);
                assert_eq!(status, ResponseStatus::Success);
            }
            _ => unreachable!(),
        }

        assert_eq!(response.messages.len(), 2);
        assert_eq!(
            response.messages[0],
            CosmosMsg::Bank(BankMsg::Send {
                from_address: env.contract.address.clone(),
                to_address: alice.clone(),
                amount: coins(70000, USCRT),
            })
        );
        assert_eq!(
            response.messages[1],
            CosmosMsg::Staking(StakingMsg::Delegate {
                validator: Addr::from("validator"),
                amount: coin(30000, USCRT)
            })
        );

        let alice_info = user_info(&deps, alice);
        assert_eq!(alice_info.scrt_deposit, 40000);
        assert_eq!(alice_info.usd_deposit, 20000);
        assert_eq!(alice_info.tier, 1);
        assert_eq!(alice_info.timestamp, env.block.time);

        let response = handle(&mut deps, env, deposit_msg);
        let error = extract_error(response);
        assert!(error.contains("Reached max tier"));
    }

    #[test]
    fn withdraw() {
        let mut deps = init_with_default();
        let alice = Addr::from("alice");

        let mut env = mock_env(alice.clone(), &[]);
        env.block.time = current_time();
        env.message.sent_funds = coins(1500, USCRT);

        let deposit_msg = ExecuteMsg::Deposit { padding: None };
        let withdraw_msg = ExecuteMsg::Withdraw { padding: None };

        handle(&mut deps, env.clone(), deposit_msg.clone()).unwrap();

        let alice_info = user_info(&deps, alice.clone());
        assert_eq!(alice_info.tier, 3);
        assert_eq!(alice_info.usd_deposit, 750);
        assert_eq!(alice_info.scrt_deposit, 1500);
        assert_eq!(alice_info.timestamp, env.block.time);

        handle(&mut deps, env.clone(), withdraw_msg.clone()).unwrap();
        let alice_info = user_info(&deps, alice.clone());

        assert_eq!(alice_info.tier, 5);
        assert_eq!(alice_info.usd_deposit, 0);
        assert_eq!(alice_info.scrt_deposit, 0);
        assert_eq!(alice_info.timestamp, 0);

        let withdrawals = get_withdrawals(&deps, alice.clone());
        let claim_time = env.block.time + UNBOUND_LATENCY;

        assert_eq!(withdrawals.len(), 1);
        assert_eq!(withdrawals[0].amount.u128(), 1500);
        assert_eq!(withdrawals[0].timestamp, env.block.time);
        assert_eq!(withdrawals[0].claim_time, claim_time);

        // Withdraw tokens twice
        let response = handle(&mut deps, env.clone(), withdraw_msg.clone());
        let error = extract_error(response);
        assert!(error.contains("Not found"));

        // Deposit tokens during withdrawal
        let old_block_time = env.block.time;
        let old_claim_time = claim_time;

        env.block.time = old_block_time + 1000;
        env.message.sent_funds = coins(50000, USCRT);
        handle(&mut deps, env.clone(), deposit_msg).unwrap();

        let alice_info = user_info(&deps, alice.clone());
        assert_eq!(alice_info.tier, 1);
        assert_eq!(alice_info.usd_deposit, 20000);
        assert_eq!(alice_info.scrt_deposit, 40000);
        assert_eq!(alice_info.timestamp, env.block.time);

        handle(&mut deps, env.clone(), withdraw_msg).unwrap();
        let withdrawals = get_withdrawals(&deps, alice);
        let claim_time = env.block.time + UNBOUND_LATENCY;

        assert_eq!(withdrawals.len(), 2);
        assert_eq!(withdrawals[0].amount.u128(), 1500);
        assert_eq!(withdrawals[0].timestamp, old_block_time);
        assert_eq!(withdrawals[0].claim_time, old_claim_time);
        assert_eq!(withdrawals[1].amount.u128(), 40000);
        assert_eq!(withdrawals[1].timestamp, env.block.time);
        assert_eq!(withdrawals[1].claim_time, claim_time);
    }

    #[test]
    fn claim() {
        let mut deps = init_with_default();
        let alice = Addr::from("alice");

        let mut env = mock_env(alice.clone(), &[]);
        env.block.time = current_time();

        let deposit_msg = ExecuteMsg::Deposit { padding: None };
        let withdraw_msg = ExecuteMsg::Withdraw { padding: None };
        let claim_msg = ExecuteMsg::Claim {
            start: None,
            limit: None,
            recipient: None,
            padding: None,
        };

        // Try to claim without any deposit
        let response = handle(&mut deps, env.clone(), claim_msg.clone());
        let error = extract_error(response);
        assert!(error.contains("Nothing to claim"));

        // Deposit some tokens
        let deposit = 750 * 2;
        env.message.sent_funds = coins(deposit, USCRT);
        handle(&mut deps, env.clone(), deposit_msg).unwrap();
        env.message.sent_funds = Vec::new();

        let day = 24 * 60 * 60;
        env.block.time += 5 * day;
        handle(&mut deps, env.clone(), withdraw_msg).unwrap();

        let withdrawals = get_withdrawals(&deps, alice.clone());
        let claim_time = env.block.time + 21 * day;

        assert_eq!(withdrawals.len(), 1);
        assert_eq!(withdrawals[0].amount.u128(), 1500);
        assert_eq!(withdrawals[0].timestamp, env.block.time);
        assert_eq!(withdrawals[0].claim_time, claim_time);

        // Try to claim without waiting for unbond period
        let response = handle(&mut deps, env.clone(), claim_msg.clone());
        let error = extract_error(response);
        assert!(error.contains("Nothing to claim"));

        env.block.time += 21 * day;
        let response = handle(&mut deps, env.clone(), claim_msg).unwrap();
        match from_binary(&response.data.unwrap()).unwrap() {
            HandleAnswer::Claim { amount, .. } => {
                assert_eq!(amount, Uint128(deposit))
            }
            _ => unreachable!(),
        }

        let withdrawals = get_withdrawals(&deps, alice.clone());
        assert_eq!(withdrawals.len(), 0);

        assert_eq!(response.messages.len(), 1);
        assert_eq!(
            response.messages[0],
            CosmosMsg::Bank(BankMsg::Send {
                to_address: alice,
                amount: coins(deposit, USCRT)
            })
        );
    }

    #[test]
    fn claim_multiple_withdrawals() {
        let mut deps = init_with_default();
        let alice = Addr::from("alice");
        let alice_canonical = deps.api.canonical_address(&alice).unwrap();

        let withdrawals = state::withdrawals_list(&alice_canonical);

        let amount = 100;
        let claim_before = 500;
        let mut rng = thread_rng();

        let mut claim_amount = 0;
        let mut total_amount = 0;
        for _ in 0..amount {
            let amount = rng.gen_range(0..1000);
            let claim_time = rng.gen_range(0..1000);

            total_amount += amount;
            if claim_time <= claim_before {
                claim_amount += amount;
            }

            let withdrawal = UserWithdrawal {
                amount,
                claim_time,
                timestamp: 0,
            };

            withdrawals
                .push_back(&mut deps.storage, &withdrawal)
                .unwrap();
        }

        let mut env = mock_env(alice, &[]);
        env.block.time = claim_before;

        let claim_msg = ExecuteMsg::Claim {
            start: None,
            limit: Some(amount),
            recipient: None,
            padding: None,
        };

        let response = handle(&mut deps, env.clone(), claim_msg.clone()).unwrap();
        match from_binary(&response.data.unwrap()).unwrap() {
            HandleAnswer::Claim { amount, status } => {
                assert_eq!(amount.u128(), claim_amount);
                assert_eq!(status, ResponseStatus::Success);
            }
            _ => unreachable!(),
        }

        env.block.time = 1000;
        let response = handle(&mut deps, env, claim_msg).unwrap();
        match from_binary(&response.data.unwrap()).unwrap() {
            HandleAnswer::Claim { amount, status } => {
                assert_eq!(amount.u128(), total_amount - claim_amount);
                assert_eq!(status, ResponseStatus::Success);
            }
            _ => unreachable!(),
        }

        let withdrawals = state::withdrawals_list(&alice_canonical);
        assert_eq!(withdrawals.get_len(&deps.storage), Ok(0));
    }

    #[test]
    fn redelegate() {
        let mut deps = init_with_default();
        let admin = Addr::from("admin");
        let alice = Addr::from("alice");
        let validator = Addr::from("validator");
        let new_validator = Addr::from("new_validator");

        let mut env = mock_env(alice, &[]);
        env.block.time = current_time();

        let redelegate_msg = ExecuteMsg::Redelegate {
            validator_address: new_validator.clone(),
            recipient: None,
            padding: None,
        };

        let redelegate_back_msg = ExecuteMsg::Redelegate {
            validator_address: validator.clone(),
            recipient: None,
            padding: None,
        };

        // Alice calls redelegate
        let response = handle(&mut deps, env.clone(), redelegate_msg.clone());
        let error = extract_error(response);
        assert!(error.contains("Unauthorized"));

        let delegated_amount = 1000000;
        let accumulated_rewards = 10000;

        // Redelegate without deposit
        env.message.sender = admin.clone();
        let response = handle(&mut deps, env.clone(), redelegate_msg.clone()).unwrap();
        assert!(response.messages.is_empty());
        let config = Config::load(&deps.storage).unwrap();
        assert_eq!(config.validator, new_validator);

        let response = handle(&mut deps, env.clone(), redelegate_back_msg.clone()).unwrap();
        assert!(response.messages.is_empty());
        let config = Config::load(&deps.storage).unwrap();
        assert_eq!(config.validator, validator);

        // Redelegate to itself
        let response = handle(&mut deps, env.clone(), redelegate_back_msg);
        let error = extract_error(response);
        assert!(error.contains("Redelegation to the same validator"));

        // Can redelegate = 0
        let mut delegation = FullDelegation {
            delegator: env.contract.address.clone(),
            validator: validator.clone(),
            amount: coin(delegated_amount, USCRT),
            accumulated_rewards: coin(accumulated_rewards, USCRT),
            can_redelegate: coin(0, USCRT),
        };

        deps.querier
            .update_staking(USCRT, &[], &[delegation.clone()]);

        let response = handle(&mut deps, env.clone(), redelegate_msg.clone());
        let error = extract_error(response);
        assert!(error.contains("Cannot redelegate full delegation amount"));

        // Can redelegate != delegated_amount
        delegation.can_redelegate = coin(500, USCRT);
        deps.querier
            .update_staking(USCRT, &[], &[delegation.clone()]);

        let response = handle(&mut deps, env.clone(), redelegate_msg.clone());
        let error = extract_error(response);
        assert!(error.contains("Cannot redelegate full delegation amount"));

        // Can redelegate full amount
        delegation.can_redelegate = coin(delegated_amount, USCRT);
        deps.querier.update_staking(USCRT, &[], &[delegation]);

        let response = handle(&mut deps, env, redelegate_msg).unwrap();
        assert_eq!(response.messages.len(), 2);
        assert_eq!(
            response.messages[0],
            CosmosMsg::Staking(StakingMsg::Withdraw {
                validator: validator.clone(),
                recipient: Some(admin)
            })
        );
        assert_eq!(
            response.messages[1],
            CosmosMsg::Staking(StakingMsg::Redelegate {
                src_validator: validator,
                dst_validator: new_validator,
                amount: coin(delegated_amount, USCRT),
            })
        );
    }

    #[test]
    fn withdraw_rewards() {
        let mut deps = init_with_default();
        let admin = Addr::from("admin");
        let alice = Addr::from("alice");
        let validator = Addr::from("validator");

        let mut env = mock_env(admin.clone(), &[]);
        env.block.time = current_time();

        let withdraw_rewards_msg = ExecuteMsg::WithdrawRewards {
            recipient: None,
            padding: None,
        };

        // Nothing to withdraw
        let response = handle(&mut deps, env.clone(), withdraw_rewards_msg.clone());
        let error = extract_error(response);
        assert!(error.contains("There is nothing to withdraw"));

        let mut delegation = FullDelegation {
            delegator: env.contract.address.clone(),
            validator: validator.clone(),
            amount: coin(0, USCRT),
            accumulated_rewards: coin(0, USCRT),
            can_redelegate: coin(0, USCRT),
        };

        deps.querier
            .update_staking(USCRT, &[], &[delegation.clone()]);

        // Alice tries to withdraw
        env.message.sender = alice;
        let response = handle(&mut deps, env.clone(), withdraw_rewards_msg.clone());
        let error = extract_error(response);
        assert!(error.contains("Unauthorized"));

        // Nothing to withdraw
        env.message.sender = admin.clone();
        let response = handle(&mut deps, env.clone(), withdraw_rewards_msg.clone());
        let error = extract_error(response);
        assert!(error.contains("There is nothing to withdraw"));

        delegation.accumulated_rewards = coin(1, USCRT);
        deps.querier.update_staking(USCRT, &[], &[delegation]);

        let response = handle(&mut deps, env, withdraw_rewards_msg).unwrap();
        assert_eq!(response.messages.len(), 1);
        assert_eq!(
            response.messages[0],
            CosmosMsg::Staking(StakingMsg::Withdraw {
                validator,
                recipient: Some(admin)
            })
        );
    }
}
