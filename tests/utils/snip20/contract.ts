import { SecretNetworkClient } from 'secretjs';
import { broadcastWithCheck, getExecuteMsg, Snip20 } from '..';
import { BaseContract } from '../baseContract';

export type Snip20ContractType = 'snip20' | 'sscrt';

export class Snip20Contract extends BaseContract {
  constructor(label = 'snip20', contractType: Snip20ContractType = 'snip20') {
    let path;
    if (contractType == 'snip20') {
      path = './build/snip20.wasm';
    } else {
      path = './build/sscrt.wasm';
    }

    super(label, path);
  }

  async init(client: SecretNetworkClient, initMsg?: Snip20.InstantiateMsg) {
    initMsg = initMsg || {
      name: 'Snip20Token',
      symbol: 'SNIP',
      decimals: 6,
      prng_seed: 'seed',
      config: {
        enable_mint: true
      }
    };

    await super.init(client, initMsg);
  }

  async mint(client: SecretNetworkClient, recipient: string, amount = 100_000_000): Promise<Snip20.HandleAnswer.Mint> {
    const mintMsg = getExecuteMsg<Snip20.ExecuteMsg.Mint>(this.contractInfo, client.address, {
      mint: { recipient, amount: amount.toString() }
    });

    const response = await broadcastWithCheck(client, [mintMsg]);
    return response[0] as Snip20.HandleAnswer.Mint;
  }

  async deposit(client: SecretNetworkClient, amount: number): Promise<Snip20.HandleAnswer.Deposit> {
    const depositMsg = getExecuteMsg<Snip20.ExecuteMsg.Deposit>(this.contractInfo, client.address, { deposit: {} }, [{ denom: 'uscrt', amount: amount.toString() }]);

    const response = await broadcastWithCheck(client, [depositMsg]);
    return response[0] as Snip20.HandleAnswer.Deposit;
  }

  async increaseAllowance(client: SecretNetworkClient, spender: string, amount: number): Promise<Snip20.HandleAnswer.IncreaseAllowance> {
    const mintMsg = getExecuteMsg<Snip20.ExecuteMsg.IncreaseAllowance>(this.contractInfo, client.address, {
      increase_allowance: {
        amount: amount.toString(),
        spender
      }
    });

    const response = await broadcastWithCheck(client, [mintMsg]);
    return response[0] as Snip20.HandleAnswer.IncreaseAllowance;
  }

  async getBalance(client: SecretNetworkClient, key?: string): Promise<number> {
    key = key || 'random string';

    const setViewingKey = getExecuteMsg<Snip20.ExecuteMsg.SetViewingKey>(this.contractInfo, client.address, { set_viewing_key: { key } });

    await broadcastWithCheck(client, [setViewingKey]);
    const query: Snip20.QueryMsg.Balance = {
      balance: { address: client.address, key }
    };

    return await super.query<any, Snip20.QueryAnswer.Balance>(client, query).then((b) => Number.parseInt(b.balance?.amount) || 0);
  }
}
