export type Addr = string;
export type Uint128 = string;
export type Binary = string;

export interface InstantiateMsg {
  admin?: Addr | null;
  config?: InitConfig | null;
  decimals: number;
  initial_balances?: InitialBalance[] | null;
  name: string;
  prng_seed: Binary;
  symbol: string;
}

/**
 * This type represents optional configuration values which can be overridden. All values are optional and have defaults which are more private by default, but can be overridden if necessary
 */
export interface InitConfig {
  /**
   * Indicates whether burn functionality should be enabled default: False
   */
  enable_burn?: boolean | null;
  /**
   * Indicates whether deposit functionality should be enabled default: False
   */
  enable_deposit?: boolean | null;
  /**
   * Indicates whether mint functionality should be enabled default: False
   */
  enable_mint?: boolean | null;
  /**
   * Indicates whether redeem functionality should be enabled default: False
   */
  enable_redeem?: boolean | null;
  /**
   * Indicates whether the total supply is public or should be kept secret. default: False
   */
  public_total_supply?: boolean | null;
}

export interface InitialBalance {
  address: Addr;
  amount: Uint128;
}
