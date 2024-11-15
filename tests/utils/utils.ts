import axios from "axios";
import {
  Coin,
  Msg,
  MsgExecuteContract,
  SecretNetworkClient,
  Wallet,
} from "secretjs";
import { ContractDeployInfo } from "./baseContract";

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function waitFor(timestamp: number) {
  const currentTimestamp = currentTime();
  const waitTime = timestamp - currentTimestamp + 5;
  return new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
}

export function currentTime(): number {
  return Math.floor(new Date().getTime() / 1000);
}

export async function broadcastWithCheck(
  client: SecretNetworkClient,
  messages: Msg[],
  gasLimit = 200_000
) {
  const transaction = await client.tx.broadcast(messages, { gasLimit });
  if (transaction.code != 0) {
    throw new Error(transaction.rawLog);
  }
  return transaction.data.map((d) => {
    const response = Buffer.from(d).toString("utf8");
    const index = response.indexOf("{");
    return JSON.parse(response.slice(index));
  });
}

export async function airdrop(
  client: SecretNetworkClient,
  address?: string,
  url = "http://localhost:5000"
) {
  address = address || client.address;
  const initial_balance = await getBalance(client, address);
  await axios.get(`${url}/faucet?address=${address}`);

  let balance = await getBalance(client, address);
  while (balance == initial_balance) {
    await delay(100);
    balance = await getBalance(client, address);
  }
}

export async function getBalance(
  client: SecretNetworkClient,
  address?: string
): Promise<number> {
  address = address || client.address;
  const response = await client.query.bank.balance({ address, denom: "uscrt" });
  return (response.balance && Number.parseInt(response.balance.amount!)) || 0;
}

export async function newClient(
  endpoint = "http://localhost:9091",
  chainId = "secretdev-1",
  mnemonic?: string
): Promise<SecretNetworkClient> {
  const wallet = new Wallet(mnemonic);
  const accAddress = wallet.address;

  const client = new SecretNetworkClient({
    url: endpoint,
    chainId: chainId,
    wallet: wallet,
    walletAddress: accAddress,
  });

  return client;
}

export async function getAdmin(
  endpoint = "http://localhost:9091",
  chainId = "secretdev-1"
): Promise<SecretNetworkClient> {
  const mnemonic = [
    "liquid",
    "poet",
    "polar",
    "arrive",
    "embody",
    "steak",
    "athlete",
    "cloth",
    "reopen",
    "divorce",
    "bundle",
    "yard",
    "collect",
    "click",
    "rug",
    "able",
    "secret",
    "maximum",
    "valid",
    "nephew",
    "recall",
    "speak",
    "mammal",
    "more",
  ];

  return await newClient(endpoint, chainId, mnemonic.join(" "));
}

export async function getUser(endpoint: string, chainId: string, index = 0) {
  const mnemonics = [
    "grant rice replace explain federal release fix clever romance raise often wild taxi quarter soccer fiber love must tape steak together observe swap guitar",
    "jelly shadow frog dirt dragon use armed praise universe win jungle close inmate rain oil canvas beauty pioneer chef soccer icon dizzy thunder meadow",
    "chair love bleak wonder skirt permit say assist aunt credit roast size obtain minute throw sand usual age smart exact enough room shadow charge",
    "word twist toast cloth movie predict advance crumble escape whale sail such angry muffin balcony keen move employ cook valve hurt glimpse breeze brick",
  ];

  return newClient(endpoint, chainId, mnemonics[index]);
}

export function getExecuteMsg<T extends object>(
  contract: ContractDeployInfo,
  sender: string,
  msg: T,
  sentFunds?: Coin[]
): MsgExecuteContract<T> {
  return new MsgExecuteContract({
    sender,
    contract_address: contract.address,
    code_hash: contract.codeHash,
    sent_funds: sentFunds,
    msg,
  });
}
