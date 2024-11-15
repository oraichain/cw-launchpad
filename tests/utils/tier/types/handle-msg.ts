export type ChangeAdmin = {
  change_admin: {
    admin: string;
    padding?: string | null;
  };
};

export type ChangeStatus = {
  change_status: {
    status: ContractStatus;
    padding?: string | null;
  };
};

export type Deposit = {
  deposit: {
    padding?: string | null;
  };
};

export type Withdraw = {
  withdraw: {
    padding?: string | null;
  };
};

export type Claim = {
  claim: {
    padding?: string | null;
    recipient?: Addr | null;
  };
};

export type WithdrawRewards = {
  withdraw_rewards: {
    padding?: string | null;
    recipient?: Addr | null;
  };
};

export type Redelegate = {
  redelegate: {
    padding?: string | null;
    recipient?: Addr | null;
    validator_address: Addr;
  };
};

export type Addr = string;
export type ContractStatus = 'active' | 'stopped';
