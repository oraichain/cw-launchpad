export type HumanAddr = string;

export interface InitMsg {
  admin?: HumanAddr | null;
  lock_periods: number[];
  nft_contract: HumanAddr;
  nft_contract_hash: string;
  tier_contract: HumanAddr;
  tier_contract_hash: string;
}
