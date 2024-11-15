export type TokenInfo = {
  token_info: Record<string, never>;
};

export type TokenConfig = {
  token_config: Record<string, never>;
};

export type ContractStatus = {
  contract_status: Record<string, never>;
};

export type ExchangeRate = {
  exchange_rate: Record<string, never>;
};

export type Allowance = {
  allowance: {
    key: string;
    owner: Addr;
    spender: Addr;
  };
};

export type Balance = {
  balance: {
    address: Addr;
    key: string;
  };
};

export type TransferHistory = {
  transfer_history: {
    address: Addr;
    key: string;
    page?: number | null;
    page_size: number;
  };
};

export type TransactionHistory = {
  transaction_history: {
    address: Addr;
    key: string;
    page?: number | null;
    page_size: number;
  };
};

export type Minters = {
  minters: Record<string, never>;
};

export type WithPermit = {
  with_permit: {
    permit: Permit;
    query: QueryWithPermit;
  };
};

export type Addr = string;
export type Permission = 'allowance' | 'balance' | 'history' | 'owner';

/**
 * Binary is a wrapper around Vec<u8> to add base64 de/serialization with serde. It also adds some helper methods to help encode inline.
 *
 * This is only needed as serde-json-{core,wasm} has a horrible encoding for Vec<u8>
 */
export type Binary = string;
export type QueryWithPermit =
  | {
      allowance: {
        owner: Addr;
        spender: Addr;
      };
    }
  | {
      balance: Record<string, never>;
    }
  | {
      transfer_history: {
        page?: number | null;
        page_size: number;
      };
    }
  | {
      transaction_history: {
        page?: number | null;
        page_size: number;
      };
    };

export interface Permit {
  params: PermitParams;
  signature: PermitSignature;
}

export interface PermitParams {
  allowed_tokens: Addr[];
  chain_id: string;
  permissions: Permission[];
  permit_name: string;
}

export interface PermitSignature {
  pub_key: PubKey;
  signature: Binary;
}

export interface PubKey {
  /**
   * ignored, but must be "tendermint/PubKeySecp256k1" otherwise the verification will fail
   */
  type: string;
  /**
   * Secp256k1 PubKey
   */
  value: Binary;
}
