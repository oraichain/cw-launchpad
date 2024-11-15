import BN from "bn.js";
import { SecretNetworkClient } from "secretjs";
import { BaseContract } from "../baseContract";
import { QueryAnswer, QueryMsg } from "./types";

export class Contract extends BaseContract {
  static oneUsd(): BN {
    return new BN("1000000000000000000");
  }

  async scrtInOneUsd(client: SecretNetworkClient): Promise<BN> {
    const query: QueryMsg = {
      get_reference_data: { base_symbol: "SCRT", quote_symbol: "USD" },
    };

    const response: QueryAnswer = await this.query(client, query);
    return new BN(response.rate);
  }

  async calculateUscrtAmount(
    client: SecretNetworkClient,
    usd: number
  ): Promise<number> {
    const rate = await this.scrtInOneUsd(client);
    const result = new BN(usd).mul(Contract.oneUsd()).div(rate);
    const calculatedUsd = result.mul(rate).div(Contract.oneUsd());

    if (calculatedUsd.lten(usd)) {
      result.iaddn(1);
    }

    return result.toNumber();
  }
}
