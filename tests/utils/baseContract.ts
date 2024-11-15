import * as fs from "fs";
import { sha256 } from "@noble/hashes/sha256";
import { JsonLog, SecretNetworkClient } from "secretjs";
import { QueryContractAddressResponse } from "secretjs/dist/grpc_gateway/secret/compute/v1beta1/query.pb";

export type ContractDeployInfo = {
  address: string;
  codeHash: string;
};

export class BaseContract {
  readonly label?: string;
  readonly path?: string;
  contractInfo: ContractDeployInfo;

  constructor(label?: string, path?: string) {
    this.label = label;
    this.path = path;
  }

  setContractInfo(contractInfo: ContractDeployInfo) {
    this.contractInfo = contractInfo;
  }

  async query<T extends object, R extends object>(
    client: SecretNetworkClient,
    query: T
  ): Promise<R> {
    return await client.query.compute.queryContract({
      contract_address: this.contractInfo.address,
      code_hash: this.contractInfo.codeHash,
      query,
    });
  }

  wasmHash() {
    if (this.path == null) {
      throw new Error("Specify path first");
    }
    const wasmByteCode = fs.readFileSync(this.path);
    return Buffer.from(sha256(wasmByteCode)).toString("hex").slice(0, 10);
  }

  async codeId(
    client: SecretNetworkClient,
    label?: string
  ): Promise<string | null> {
    if (label == null) {
      label = this.label + this.wasmHash();
    }

    let address: string;

    try {
      address = await client.query.compute
        .addressByLabel({ label })
        .then((a) => a.contract_address!);
    } catch {
      return null;
    }

    return client.query.compute
      .contractInfo({ contract_address: address })
      .then((i) => i.ContractInfo?.code_id || null);
  }

  async init(client: SecretNetworkClient, initMsg: any) {
    const codeId = await this.deploy(client, initMsg);
    await this.store(client, codeId!, initMsg);
  }

  async deploy(client: SecretNetworkClient, initMsg: any) {
    if (this.path == null) {
      throw new Error("Specify path first");
    }

    const label = this.label + this.wasmHash();
    let codeId = await this.codeId(client, label);
    if (codeId != null) {
      return codeId;
    }

    const wasmByteCode = fs.readFileSync(this.path);
    const transaction = await client.tx.compute.storeCode(
      {
        wasm_byte_code: wasmByteCode,
        sender: client.address,
        source: "",
        builder: "",
      },
      { gasLimit: 5000000 }
    );

    if (transaction.code != 0) {
      throw new Error(`Cannot deploy smart contract: "${transaction.rawLog}"`);
    }

    const log: JsonLog = JSON.parse(transaction.rawLog);
    const codeIdKeyValue = log[0].events[0].attributes.find(
      (a: { key: string; value: string }) => a.key == "code_id"
    );

    codeId = codeIdKeyValue!.value!;
    await this.store(client, codeId, initMsg, label);

    return codeId;
  }

  async store(
    client: SecretNetworkClient,
    codeId: string,
    initMsg: any,
    label?: string
  ) {
    if (label == null) {
      const timeString = new Date().getTime().toString();
      label = this.label + timeString;
    }

    const codeHash = await client.query.compute
      .codeHashByCodeId({
        code_id: codeId,
      })
      .then((c) => c.code_hash!);

    const contract = await client.tx.compute.instantiateContract(
      {
        sender: client.address,
        code_id: codeId,
        init_msg: initMsg,
        code_hash: codeHash,
        label,
      },
      { gasLimit: 150000 }
    );

    if (contract.code != 0) {
      throw new Error(
        `Failed to instantiate the contract with the following error ${contract.rawLog}`
      );
    }

    const info = await client.query.compute.contractsByCodeId({
      code_id: codeId,
    });

    const contracts = info.contract_infos!;

    for (const contract of contracts) {
      if (contract.ContractInfo?.label == label) {
        const address = contract.contract_address!;
        const codeHash = await client.query.compute
          .codeHashByContractAddress({
            contract_address: address,
          })
          .then((h) => h.code_hash!);

        this.contractInfo = { address: contract.contract_address!, codeHash };
      }
    }
  }
}
