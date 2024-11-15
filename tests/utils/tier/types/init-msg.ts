export type Uint128 = string;
export type Addr = string;

export interface InstantiateMsg {
  deposits: Uint128[];
  owner?: Addr | null;
  validator: Addr;
  band_oracle: Addr;
  band_code_hash: String;
}
