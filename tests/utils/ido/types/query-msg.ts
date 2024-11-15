export type Config = {
  config: Record<string, never>;
};

export type IdoAmount = {
  ido_amount: Record<string, never>;
};

export type IdoInfo = {
  ido_info: {
    ido_id: number;
  };
};

export type InWhitelist = {
  in_whitelist: {
    address: HumanAddr;
    ido_id: number;
  };
};

export type IdoListOwnedBy = {
  ido_list_owned_by: {
    address: HumanAddr;
    limit: number;
    start: number;
  };
};

export type Purchases = {
  purchases: {
    address: HumanAddr;
    ido_id: number;
    limit: number;
    start: number;
  };
};

export type ArchivedPurchases = {
  archived_purchases: {
    address: HumanAddr;
    ido_id: number;
    limit: number;
    start: number;
  };
};

export type UserInfo = {
  user_info: {
    address: HumanAddr;
    ido_id?: number | null;
  };
};

export type HumanAddr = string;
