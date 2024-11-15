import { SecretNetworkClient } from "secretjs";
import { Band, broadcastWithCheck, getExecuteMsg, Tier } from "..";
import { BaseContract } from "../baseContract";

export class Contract extends BaseContract {
  constructor(label = "tier", path = "./build/tier.wasm") {
    super(label, path);
  }

  async userInfo(
    client: SecretNetworkClient
  ): Promise<Tier.QueryAnswer.UserInfo> {
    const queryUserInfo: Tier.QueryMsg.UserInfo = {
      user_info: { address: client.address },
    };

    return await super.query(client, queryUserInfo);
  }

  async config(client: SecretNetworkClient): Promise<Tier.QueryAnswer.Config> {
    const queryConfig: Tier.QueryMsg.Config = { config: {} };
    return await super.query(client, queryConfig);
  }

  async withdrawals(
    client: SecretNetworkClient,
    start?: number,
    limit?: number
  ): Promise<Tier.QueryAnswer.Withdrawals> {
    const queryWithdrawals: Tier.QueryMsg.Withdrawals = {
      withdrawals: { address: client.address, start, limit },
    };

    return await super.query(client, queryWithdrawals);
  }

  async changeStatus(
    client: SecretNetworkClient,
    status: Tier.HandleMsg.ContractStatus
  ): Promise<Tier.HandleAnswer.ChangeStatus> {
    const changeStatusMsg = getExecuteMsg<Tier.HandleMsg.ChangeStatus>(
      this.contractInfo,
      client.address,
      { change_status: { status } }
    );

    const response = await broadcastWithCheck(client, [changeStatusMsg]);
    return response[0] as Tier.HandleAnswer.ChangeStatus;
  }

  async redelegate(
    client: SecretNetworkClient,
    validator: string
  ): Promise<Tier.HandleAnswer.Redelegate> {
    const changeStatusMsg = getExecuteMsg<Tier.HandleMsg.Redelegate>(
      this.contractInfo,
      client.address,
      { redelegate: { validator_address: validator } }
    );

    const response = await broadcastWithCheck(client, [changeStatusMsg]);
    return response[0] as Tier.HandleAnswer.Redelegate;
  }

  async deposit(
    client: SecretNetworkClient,
    amount: number,
    denom = "uscrt"
  ): Promise<Tier.HandleAnswer.Deposit> {
    const depositMsg = getExecuteMsg<Tier.HandleMsg.Deposit>(
      this.contractInfo,
      client.address,
      { deposit: {} },
      [
        {
          denom,
          amount: amount.toString(),
        },
      ]
    );

    const response = await broadcastWithCheck(client, [depositMsg]);
    return response[0] as Tier.HandleAnswer.Deposit;
  }

  async withdraw(
    client: SecretNetworkClient
  ): Promise<Tier.HandleAnswer.Withdraw> {
    const withdrawMsg = getExecuteMsg<Tier.HandleMsg.Withdraw>(
      this.contractInfo,
      client.address,
      { withdraw: {} }
    );

    const response = await broadcastWithCheck(client, [withdrawMsg]);
    return response[0] as Tier.HandleAnswer.Withdraw;
  }

  async claim(
    client: SecretNetworkClient,
    recipient?: string
  ): Promise<Tier.HandleAnswer.Claim> {
    const withdrawMsg = getExecuteMsg<Tier.HandleMsg.Claim>(
      this.contractInfo,
      client.address,
      { claim: { recipient } }
    );

    const response = await broadcastWithCheck(client, [withdrawMsg]);
    return response[0] as Tier.HandleAnswer.Claim;
  }

  async withdrawRewards(
    client: SecretNetworkClient,
    recipient?: string
  ): Promise<Tier.HandleAnswer.WithdrawRewards> {
    const withdrawRewardsMsg = getExecuteMsg<Tier.HandleMsg.WithdrawRewards>(
      this.contractInfo,
      client.address,
      {
        withdraw_rewards: { recipient },
      }
    );

    const response = await broadcastWithCheck(client, [withdrawRewardsMsg]);
    return response[0] as Tier.HandleAnswer.WithdrawRewards;
  }

  async setTier(
    client: SecretNetworkClient,
    tier: number,
    bandContract: Band.Contract
  ) {
    const userInfo = await this.userInfo(client);
    const currentTier = userInfo.user_info.tier;

    if (currentTier == tier) {
      return;
    }

    if (currentTier < tier) {
      throw new Error("Tier cannot be decreased");
    }

    const config = await this.config(client);
    const tierIndex = tier - 1;
    const tierExpectedDeposit = Number.parseInt(
      config.config.usd_deposits[tierIndex]
    );

    const currentDeposit = Number.parseInt(userInfo.user_info.usd_deposit);
    const usdAmount = tierExpectedDeposit - currentDeposit;
    const scrtAmount = await bandContract.calculateUscrtAmount(
      client,
      usdAmount
    );

    await this.deposit(client, scrtAmount);
  }
}
