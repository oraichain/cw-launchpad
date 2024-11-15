import { Coin, SecretNetworkClient } from "secretjs";
import { broadcastWithCheck, getExecuteMsg, Ido, Snip721 } from "..";
import { BaseContract, ContractDeployInfo } from "../baseContract";
import { NftToken } from "./types/handle-msg";

export class IdoContract extends BaseContract {
  nftContract: ContractDeployInfo;

  constructor(
    nftContract: ContractDeployInfo,
    label = "ido",
    path = "./build/ido.wasm"
  ) {
    super(label, path);
    this.nftContract = nftContract;
  }

  async addWhitelist(
    client: SecretNetworkClient,
    address: string,
    idoId: number
  ): Promise<Ido.HandleAnswer.WhitelistAdd> {
    const addWhitelistMsg = getExecuteMsg<Ido.HandleMsg.WhitelistAdd>(
      this.contractInfo,
      client.address,
      { whitelist_add: { addresses: [address], ido_id: idoId } }
    );

    const response = await broadcastWithCheck(client, [addWhitelistMsg]);
    return response[0] as Ido.HandleAnswer.WhitelistAdd;
  }

  async removeFromWhitelist(
    client: SecretNetworkClient,
    address: string,
    idoId: number
  ): Promise<Ido.HandleAnswer.WhitelistRemove> {
    const addWhitelistMsg = getExecuteMsg<Ido.HandleMsg.WhitelistRemove>(
      this.contractInfo,
      client.address,
      { whitelist_remove: { addresses: [address], ido_id: idoId } }
    );

    const response = await broadcastWithCheck(client, [addWhitelistMsg]);
    return response[0] as Ido.HandleAnswer.WhitelistRemove;
  }

  async inWhitelist(
    client: SecretNetworkClient,
    idoId: number
  ): Promise<Ido.QueryAnswer.InWhitelist> {
    const query: Ido.QueryMsg.InWhitelist = {
      in_whitelist: { address: client.address, ido_id: idoId },
    };

    return await super.query(client, query);
  }

  async buyTokens(
    client: SecretNetworkClient,
    idoId: number,
    amount: number,
    is_nft_tier?: boolean,
  ): Promise<Ido.HandleAnswer.BuyTokens> {
    const messages = [];
    let viewing_key: string | undefined;
    if (is_nft_tier) {
      viewing_key = "random key";
      const setViewingKey = getExecuteMsg<Snip721.HandleMsg.SetViewingKey>(
        this.nftContract,
        client.address,
        { set_viewing_key: { key: viewing_key } }
      );
      messages.push(setViewingKey);
    }

    let sentFunds: Coin[] | undefined;
    const config = await this.idoInfo(client, idoId);
    const isNative = config.ido_info.payment === "native";

    if (isNative) {
      sentFunds = [{ denom: "uscrt", amount: amount.toString() }];
    }

    const buyTokensMsg = getExecuteMsg<Ido.HandleMsg.BuyTokens>(
      this.contractInfo,
      client.address,
      { buy_tokens: { ido_id: idoId, amount: amount.toString(), viewing_key } },
      sentFunds
    );

    messages.push(buyTokensMsg);
    const response = await broadcastWithCheck(client, messages);
    return response[messages.length - 1] as Ido.HandleAnswer.BuyTokens;
  }

  async startIdo(
    client: SecretNetworkClient,
    startIdoMsg: Ido.HandleMsg.StartIdo
  ): Promise<Ido.HandleAnswer.StartIdo> {
    const startIdo = getExecuteMsg(
      this.contractInfo,
      client.address,
      startIdoMsg
    );

    const response = await broadcastWithCheck(client, [startIdo]);
    return response[0] as Ido.HandleAnswer.StartIdo;
  }

  async recvTokens(
    client: SecretNetworkClient,
    idoId: number
  ): Promise<Ido.HandleAnswer.RecvTokens> {
    const recvTokensMsg = getExecuteMsg<Ido.HandleMsg.RecvTokens>(
      this.contractInfo,
      client.address,
      {
        recv_tokens: { ido_id: idoId },
      }
    );

    const response = await broadcastWithCheck(client, [recvTokensMsg]);
    return response[0] as Ido.HandleAnswer.RecvTokens;
  }

  async idoInfo(
    client: SecretNetworkClient,
    idoId: number
  ): Promise<Ido.QueryAnswer.IdoInfo> {
    const query: Ido.QueryMsg.IdoInfo = { ido_info: { ido_id: idoId } };
    return await super.query(client, query);
  }

  async purchases(
    client: SecretNetworkClient,
    idoId: number,
    start = 0,
    limit = 50
  ): Promise<Ido.QueryAnswer.Purchases> {
    const query: Ido.QueryMsg.Purchases = {
      purchases: { address: client.address, ido_id: idoId, start, limit },
    };

    return await super.query(client, query);
  }

  async archivedPurchases(
    client: SecretNetworkClient,
    idoId: number,
    start = 0,
    limit = 50
  ): Promise<Ido.QueryAnswer.ArchivedPurchases> {
    const query: Ido.QueryMsg.ArchivedPurchases = {
      archived_purchases: {
        address: client.address,
        ido_id: idoId,
        start,
        limit,
      },
    };

    return await super.query(client, query);
  }

  async userInfo(
    client: SecretNetworkClient,
    idoId?: number
  ): Promise<Ido.QueryAnswer.UserInfo> {
    const query: Ido.QueryMsg.UserInfo = {
      user_info: { address: client.address, ido_id: idoId },
    };

    return await super.query(client, query);
  }
}
