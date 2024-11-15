export type Config = {
  config: {
    admin: HumanAddr;
    band_code_hash: string;
    band_oracle: HumanAddr;
    min_tier: number;
    status: ContractStatus;
    usd_deposits: Uint128[];
    validator: HumanAddr;
  };
};

export type UserInfo = {
  user_info: {
    tier: number;
    timestamp: number;
    usd_deposit: Uint128;
    scrt_deposit: Uint128;
  };
};

export type Withdrawals = {
  withdrawals: {
    amount: number;
    withdrawals: SerializedWithdrawals[];
  };
};

export type HumanAddr = string;
export type Uint128 = string;

export interface SerializedWithdrawals {
  amount: Uint128;
  claim_time: number;
  timestamp: number;
}

export type ContractStatus = "active" | "stopped";
