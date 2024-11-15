use cosmwasm_std::{HumanAddr, Querier, StdResult, Uint128};
use secret_toolkit_utils::Query;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    GetReferenceData {
        base_symbol: String,
        quote_symbol: String,
    },
}

impl Query for QueryMsg {
    const BLOCK_SIZE: usize = crate::contract::BLOCK_SIZE;
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct QueryAnswer {
    rate: Uint128,
}

pub struct BandProtocol {
    scrt_per_usd: u128,
}

impl BandProtocol {
    pub const DECIMALS: u8 = 18;
    pub const ONE_USD: u128 = 1_000_000_000_000_000_000;

    #[cfg(not(test))]
    pub fn new<Q: Querier>(querier: &Q, contract: HumanAddr, code_hash: String) -> StdResult<Self> {
        let scrt_per_usd = Self::scrt_price_in_usd(querier, contract, code_hash)?;
        Ok(BandProtocol { scrt_per_usd })
    }

    #[cfg(test)]
    pub fn new<Q: Querier>(
        _querier: &Q,
        _contract: HumanAddr,
        _code_hash: String,
    ) -> StdResult<Self> {
        Ok(BandProtocol {
            scrt_per_usd: Self::ONE_USD / 2,
        })
    }

    #[cfg(test)]
    pub fn new_with_value(scrt_per_usd: u128) -> Self {
        BandProtocol { scrt_per_usd }
    }

    pub fn usd_amount(&self, uscrt: u128) -> u128 {
        uscrt
            .checked_mul(self.scrt_per_usd)
            .and_then(|v| v.checked_div(BandProtocol::ONE_USD))
            .unwrap()
    }

    pub fn uscrt_amount(&self, usd: u128) -> u128 {
        usd.checked_mul(BandProtocol::ONE_USD)
            .and_then(|v| v.checked_div(self.scrt_per_usd))
            .unwrap()
    }

    #[allow(dead_code)]
    fn scrt_price_in_usd<Q: Querier>(
        querier: &Q,
        contract: HumanAddr,
        code_hash: String,
    ) -> StdResult<u128> {
        let query_data = QueryMsg::GetReferenceData {
            base_symbol: "SCRT".to_string(),
            quote_symbol: "USD".to_string(),
        };

        let QueryAnswer { rate } = query_data.query(querier, code_hash, contract)?;

        Ok(rate.u128())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn conversion() {
        // 1 USD = 0.5 SCRT
        let band_protocol = BandProtocol::new_with_value(BandProtocol::ONE_USD / 2);
        for deposit in &[150_000_000_000, 2_000_000, 50, 2] {
            let usd = band_protocol.usd_amount(*deposit);
            assert_eq!(usd, deposit / 2);

            let uscrt = band_protocol.uscrt_amount(usd);
            assert_eq!(uscrt, *deposit);
        }
    }
}
