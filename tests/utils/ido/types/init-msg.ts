export type Addr = string;

export interface InstantiateMsg {
  admin?: Addr | null;
  lock_periods: number[];
  nft_contract: Addr;
  nft_contract_hash: string;
  tier_contract: Addr;
  tier_contract_hash: string;
}
