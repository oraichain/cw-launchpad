export type Deposit = {
  deposit: {
    status: ResponseStatus;
  };
};

export type Redeem = {
  redeem: {
    status: ResponseStatus;
  };
};

export type Transfer = {
  transfer: {
    status: ResponseStatus;
  };
};

export type Send = {
  send: {
    status: ResponseStatus;
  };
};

export type BatchTransfer = {
  batch_transfer: {
    status: ResponseStatus;
  };
};

export type BatchSend = {
  batch_send: {
    status: ResponseStatus;
  };
};

export type Burn = {
  burn: {
    status: ResponseStatus;
  };
};

export type RegisterReceive = {
  register_receive: {
    status: ResponseStatus;
  };
};

export type CreateViewingKey = {
  create_viewing_key: {
    key: ViewingKey;
  };
};

export type SetViewingKey = {
  set_viewing_key: {
    status: ResponseStatus;
  };
};

export type IncreaseAllowance = {
  increase_allowance: {
    allowance: Uint128;
    owner: Addr;
    spender: Addr;
  };
};

export type DecreaseAllowance = {
  decrease_allowance: {
    allowance: Uint128;
    owner: Addr;
    spender: Addr;
  };
};

export type TransferFrom = {
  transfer_from: {
    status: ResponseStatus;
  };
};

export type SendFrom = {
  send_from: {
    status: ResponseStatus;
  };
};

export type BatchTransferFrom = {
  batch_transfer_from: {
    status: ResponseStatus;
  };
};

export type BatchSendFrom = {
  batch_send_from: {
    status: ResponseStatus;
  };
};

export type BurnFrom = {
  burn_from: {
    status: ResponseStatus;
  };
};

export type BatchBurnFrom = {
  batch_burn_from: {
    status: ResponseStatus;
  };
};

export type Mint = {
  mint: {
    status: ResponseStatus;
  };
};

export type BatchMint = {
  batch_mint: {
    status: ResponseStatus;
  };
};

export type AddMinters = {
  add_minters: {
    status: ResponseStatus;
  };
};

export type RemoveMinters = {
  remove_minters: {
    status: ResponseStatus;
  };
};

export type SetMinters = {
  set_minters: {
    status: ResponseStatus;
  };
};

export type ChangeAdmin = {
  change_admin: {
    status: ResponseStatus;
  };
};

export type SetContractStatus = {
  set_contract_status: {
    status: ResponseStatus;
  };
};

export type RevokePermit = {
  revoke_pemit: {
    status: ResponseStatus;
  };
};

export type ResponseStatus = 'success' | 'failure';
export type ViewingKey = string;
export type Uint128 = string;
export type Addr = string;
