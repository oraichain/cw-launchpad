export type ChangeAdmin = {
  change_admin: {
    status: ResponseStatus;
  };
};

export type ChangeStatus = {
  change_status: {
    status: ResponseStatus;
  };
};

export type StartIdo = {
  start_ido: {
    ido_id: number;
    status: ResponseStatus;
  };
};

export type WhitelistAdd = {
  whitelist_add: {
    status: ResponseStatus;
  };
};

export type WhitelistRemove = {
  whitelist_remove: {
    status: ResponseStatus;
  };
};

export type BuyTokens = {
  buy_tokens: {
    amount: Uint128;
    status: ResponseStatus;
    unlock_time: number;
  };
};

export type RecvTokens = {
  recv_tokens: {
    amount: Uint128;
    status: ResponseStatus;
    unlock_time: number;
  };
};

export type Withdraw = {
  withdraw: {
    amount: Uint128;
    status: ResponseStatus;
  };
};

export type ResponseStatus = "success" | "failure";

export type Uint128 = string;
