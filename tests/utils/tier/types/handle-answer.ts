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

export type Deposit = {
  deposit: {
    tier: number;
    status: ResponseStatus;
    usd_deposit: string;
    scrt_deposit: string;
  };
};

export type Withdraw = {
  withdraw: {
    status: ResponseStatus;
  };
};

export type Claim = {
  claim: {
    amount: string;
    status: ResponseStatus;
  };
};

export type WithdrawRewards = {
  withdraw_rewards: {
    amount: string;
    status: ResponseStatus;
  };
};

export type Redelegate = {
  redelegate: {
    amount: string;
    status: ResponseStatus;
  };
};

export type ResponseStatus = "success" | "failure";
