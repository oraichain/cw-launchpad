export type TokenInfo = {
  token_info: {
    decimals: number;
    name: string;
    symbol: string;
    total_supply?: Uint128 | null;
  };
};

export type TokenConfig = {
  token_config: {
    burn_enabled: boolean;
    deposit_enabled: boolean;
    mint_enabled: boolean;
    public_total_supply: boolean;
    redeem_enabled: boolean;
  };
};

export type ContractStatus = {
  contract_status: {
    status: ContractStatusLevel;
  };
};

export type ExchangeRate = {
  exchange_rate: {
    denom: string;
    rate: Uint128;
  };
};

export type Allowance = {
  allowance: {
    allowance: Uint128;
    expiration?: number | null;
    owner: Addr;
    spender: Addr;
  };
};

export type Balance = {
  balance: {
    amount: Uint128;
  };
};

export type TransferHistory = {
  transfer_history: {
    total?: number | null;
    txs: Tx[];
  };
};

export type TransactionHistory = {
  transaction_history: {
    total?: number | null;
    txs: RichTx[];
  };
};

export type ViewingKeyError = {
  viewing_key_error: {
    msg: string;
  };
};

export type Minters = {
  minters: {
    minters: Addr[];
  };
};

export type Uint128 = string;
export type Addr = string;

export type ContractStatusLevel = 'normal_run' | 'stop_all_but_redeems' | 'stop_all';

export type TxAction =
  | {
      transfer: {
        from: Addr;
        recipient: Addr;
        sender: Addr;
      };
    }
  | {
      mint: {
        minter: Addr;
        recipient: Addr;
      };
    }
  | {
      burn: {
        burner: Addr;
        owner: Addr;
      };
    }
  | {
      deposit: Record<string, never>;
    }
  | {
      redeem: Record<string, never>;
    };

export interface Tx {
  block_height?: number | null;
  block_time?: number | null;
  coins: Coin;
  from: Addr;
  id: number;
  memo?: string | null;
  receiver: Addr;
  sender: Addr;
}

export interface Coin {
  amount: Uint128;
  denom: string;
}

export interface RichTx {
  action: TxAction;
  block_height: number;
  block_time: number;
  coins: Coin;
  id: number;
  memo?: string | null;
}
