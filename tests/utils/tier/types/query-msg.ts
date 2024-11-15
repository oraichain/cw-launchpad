export type Config = {
  config: Record<string, never>;
};

export type UserInfo = {
  user_info: {
    address: Addr;
  };
};

export type Withdrawals = {
  withdrawals: {
    address: Addr;
    start?: number | null;
    limit?: number | null;
  };
};

export type Addr = string;
