export type Config = {
  config: Record<string, never>;
};

export type UserInfo = {
  user_info: {
    address: HumanAddr;
  };
};

export type Withdrawals = {
  withdrawals: {
    address: HumanAddr;
    start?: number | null;
    limit?: number | null;
  };
};

export type HumanAddr = string;
