import { SecretNetworkClient } from 'secretjs';
import { broadcastWithCheck, getExecuteMsg, Snip721 } from '..';
import { BaseContract } from '../baseContract';

export class Snip721Contract extends BaseContract {
  constructor(label = 'Snip721', path = './build/snip721.wasm') {
    super(label, path);
  }

  async init(client: SecretNetworkClient, initMsg?: Snip721.InstantiateMsg) {
    initMsg = initMsg || {
      entropy: 'entropy',
      name: 'Nft collection',
      symbol: 'NFT'
    };

    await super.init(client, initMsg);
  }

  async mint(client: SecretNetworkClient, msg: Snip721.ExecuteMsg.MintNft): Promise<Snip721.HandleAnswer.MintNft> {
    const mintNftMsg = getExecuteMsg<Snip721.ExecuteMsg.MintNft>(this.contractInfo, client.address, msg);

    const response = await broadcastWithCheck(client, [mintNftMsg]);
    return response[0] as Snip721.HandleAnswer.MintNft;
  }
}
