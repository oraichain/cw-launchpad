export type Config = {
  config: {
    admin: Addr;
    lock_periods: number[];
    nft_contract: Addr;
    nft_contract_hash: string;
    tier_contract: Addr;
    tier_contract_hash: string;
  };
};

export type IdoAmount = {
  ido_amount: {
    amount: number;
  };
};

export type PaymentMethod =
  | 'native'
  | {
      token: {
        contract: Addr;
        code_hash: string;
      };
    };

export type IdoInfo = {
  ido_info: {
    admin: Addr;
    end_time: number;
    participants: number;
    payment: PaymentMethod;
    price: Uint128;
    shared_whitelist: boolean;
    sold_amount: Uint128;
    start_time: number;
    token_contract: Addr;
    token_contract_hash: string;
    total_payment: Uint128;
    soft_cap: Uint128;
    total_tokens_amount: Uint128;
    withdrawn: boolean;
  };
};

export type InWhitelist = {
  in_whitelist: {
    in_whitelist: boolean;
  };
};

export type IdoListOwnerBy = {
  ido_list_owned_by: {
    ido_ids: number[];
    amount: number;
  };
};

export type Purchases = {
  purchases: {
    purchases: PurchaseAnswer[];
    amount: number;
  };
};

export type ArchivedPurchases = {
  archived_purchases: {
    purchases: PurchaseAnswer[];
    amount: number;
  };
};

export type UserInfo = {
  user_info: {
    total_payment: Uint128;
    total_tokens_bought: Uint128;
    total_tokens_received: Uint128;
  };
};

export type Uint128 = string;
export type Addr = string;

export interface PurchaseAnswer {
  timestamp: number;
  tokens_amount: Uint128;
  unlock_time: number;
}
