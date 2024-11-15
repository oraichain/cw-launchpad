export type Redeem = {
  redeem: {
    amount: Uint128;
    denom?: string | null;
    padding?: string | null;
  };
};

export type Deposit = {
  deposit: {
    padding?: string | null;
  };
};

export type Transfer = {
  transfer: {
    amount: Uint128;
    memo?: string | null;
    padding?: string | null;
    recipient: Addr;
  };
};

export type Send = {
  send: {
    amount: Uint128;
    memo?: string | null;
    msg?: Binary | null;
    padding?: string | null;
    recipient: Addr;
    recipient_code_hash?: string | null;
  };
};

export type BatchTransfer = {
  batch_transfer: {
    actions: TransferAction[];
    padding?: string | null;
  };
};

export type BatchSend = {
  batch_send: {
    actions: SendAction[];
    padding?: string | null;
  };
};

export type Burn = {
  burn: {
    amount: Uint128;
    memo?: string | null;
    padding?: string | null;
  };
};

export type RegisterReceive = {
  register_receive: {
    code_hash: string;
    padding?: string | null;
  };
};

export type CreateViewingKey = {
  create_viewing_key: {
    entropy: string;
    padding?: string | null;
  };
};

export type SetViewingKey = {
  set_viewing_key: {
    key: string;
    padding?: string | null;
  };
};

export type IncreaseAllowance = {
  increase_allowance: {
    amount: Uint128;
    expiration?: number | null;
    padding?: string | null;
    spender: Addr;
  };
};

export type DecreaseAllowance = {
  decrease_allowance: {
    amount: Uint128;
    expiration?: number | null;
    padding?: string | null;
    spender: Addr;
  };
};

export type TransferFrom = {
  transfer_from: {
    amount: Uint128;
    memo?: string | null;
    owner: Addr;
    padding?: string | null;
    recipient: Addr;
  };
};

export type SendFrom = {
  send_from: {
    amount: Uint128;
    memo?: string | null;
    msg?: Binary | null;
    owner: Addr;
    padding?: string | null;
    recipient: Addr;
    recipient_code_hash?: string | null;
  };
};

export type BatchTransferFrom = {
  batch_transfer_from: {
    actions: TransferFromAction[];
    padding?: string | null;
  };
};

export type BatchSendFrom = {
  batch_send_from: {
    actions: SendFromAction[];
    padding?: string | null;
  };
};

export type BurnFrom = {
  burn_from: {
    amount: Uint128;
    memo?: string | null;
    owner: Addr;
    padding?: string | null;
  };
};

export type BatchBurnFrom = {
  batch_burn_from: {
    actions: BurnFromAction[];
    padding?: string | null;
  };
};

export type Mint = {
  mint: {
    amount: Uint128;
    memo?: string | null;
    padding?: string | null;
    recipient: Addr;
  };
};

export type BatchMint = {
  batch_mint: {
    actions: MintAction[];
    padding?: string | null;
  };
};

export type AddMinters = {
  add_minters: {
    minters: Addr[];
    padding?: string | null;
  };
};

export type RemoveMinters = {
  remove_minters: {
    minters: Addr[];
    padding?: string | null;
  };
};

export type SetMinters = {
  set_minters: {
    minters: Addr[];
    padding?: string | null;
  };
};

export type ChangeAdmin = {
  change_admin: {
    address: Addr;
    padding?: string | null;
  };
};

export type SetContractStatus = {
  set_contract_status: {
    level: ContractStatusLevel;
    padding?: string | null;
  };
};

export type RevokePermit = {
  revoke_permit: {
    permit_name: string;
  };
};

export type Uint128 = string;
export type Addr = string;
export type Binary = string;
export type ContractStatusLevel = 'normal_run' | 'stop_all_but_redeems' | 'stop_all';

export interface TransferAction {
  amount: Uint128;
  memo?: string | null;
  recipient: Addr;
}

export interface SendAction {
  amount: Uint128;
  memo?: string | null;
  msg?: Binary | null;
  recipient: Addr;
  recipient_code_hash?: string | null;
}

export interface TransferFromAction {
  amount: Uint128;
  memo?: string | null;
  owner: Addr;
  recipient: Addr;
}

export interface SendFromAction {
  amount: Uint128;
  memo?: string | null;
  msg?: Binary | null;
  owner: Addr;
  recipient: Addr;
  recipient_code_hash?: string | null;
}

export interface BurnFromAction {
  amount: Uint128;
  memo?: string | null;
  owner: Addr;
}

export interface MintAction {
  amount: Uint128;
  memo?: string | null;
  recipient: Addr;
}
