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
    recipient: HumanAddr;
  };
};

export type Send = {
  send: {
    amount: Uint128;
    memo?: string | null;
    msg?: Binary | null;
    padding?: string | null;
    recipient: HumanAddr;
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
    spender: HumanAddr;
  };
};

export type DecreaseAllowance = {
  decrease_allowance: {
    amount: Uint128;
    expiration?: number | null;
    padding?: string | null;
    spender: HumanAddr;
  };
};

export type TransferFrom = {
  transfer_from: {
    amount: Uint128;
    memo?: string | null;
    owner: HumanAddr;
    padding?: string | null;
    recipient: HumanAddr;
  };
};

export type SendFrom = {
  send_from: {
    amount: Uint128;
    memo?: string | null;
    msg?: Binary | null;
    owner: HumanAddr;
    padding?: string | null;
    recipient: HumanAddr;
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
    owner: HumanAddr;
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
    recipient: HumanAddr;
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
    minters: HumanAddr[];
    padding?: string | null;
  };
};

export type RemoveMinters = {
  remove_minters: {
    minters: HumanAddr[];
    padding?: string | null;
  };
};

export type SetMinters = {
  set_minters: {
    minters: HumanAddr[];
    padding?: string | null;
  };
};

export type ChangeAdmin = {
  change_admin: {
    address: HumanAddr;
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
export type HumanAddr = string;
export type Binary = string;
export type ContractStatusLevel =
  | "normal_run"
  | "stop_all_but_redeems"
  | "stop_all";

export interface TransferAction {
  amount: Uint128;
  memo?: string | null;
  recipient: HumanAddr;
}

export interface SendAction {
  amount: Uint128;
  memo?: string | null;
  msg?: Binary | null;
  recipient: HumanAddr;
  recipient_code_hash?: string | null;
}

export interface TransferFromAction {
  amount: Uint128;
  memo?: string | null;
  owner: HumanAddr;
  recipient: HumanAddr;
}

export interface SendFromAction {
  amount: Uint128;
  memo?: string | null;
  msg?: Binary | null;
  owner: HumanAddr;
  recipient: HumanAddr;
  recipient_code_hash?: string | null;
}

export interface BurnFromAction {
  amount: Uint128;
  memo?: string | null;
  owner: HumanAddr;
}

export interface MintAction {
  amount: Uint128;
  memo?: string | null;
  recipient: HumanAddr;
}
