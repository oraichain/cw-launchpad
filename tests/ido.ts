import { SecretNetworkClient } from 'secretjs';
import { Band, currentTime, getAdmin, getBalance, getUser, Ido, Snip20, Snip721, Tier, waitFor } from './utils';
import * as assert from 'assert';

async function checkMaxDeposit(client: SecretNetworkClient, contract: Ido.IdoContract, idoId: number, tokensAmount: number, is_nft_tier?: boolean) {
  await contract.buyTokens(client, idoId, tokensAmount, is_nft_tier);
  await assert.rejects(
    async () => {
      await contract.buyTokens(client, idoId, 1, is_nft_tier);
    },
    (err: Error) => {
      const maxTierMessage = 'You cannot buy more tokens with current tier';
      const allTokensSold = 'All tokens are sold';
      return err.message.indexOf(maxTierMessage) >= 0 || err.message.indexOf(allTokensSold) >= 0;
    }
  );
}

describe('IDO', () => {
  let admin: SecretNetworkClient;
  let user: SecretNetworkClient;
  let idoOwner: SecretNetworkClient;

  let idoId: number;
  let price: number;
  let tokenId: string;

  let startIdoMsg: Ido.ExecuteMsg.StartIdo;

  const tierDeposits = ['1000', '500', '200', '100'];
  const tokensPerTier = ['5000', '4000', '3000', '2000', '1000'];

  const idoLockPeriods = [10, 10, 10, 10, 10];
  const idoTotalAmount = tokensPerTier.reduce((s, value) => s + Number.parseInt(value), 0);
  let idoContract: Ido.IdoContract;

  const endpoint = 'https://api.pulsar.scrttestnet.com';
  const chainId = 'pulsar-2';

  const tierContract = new Tier.Contract();
  const idoToken = new Snip20.Snip20Contract();
  const paymentToken = new Snip20.Snip20Contract();
  const nftContract = new Snip721.Snip721Contract();
  const bandContract = new Band.Contract();

  const mintTo = async (user: SecretNetworkClient, amount: number, token = paymentToken) => {
    await token.mint(admin, user.address, amount);
    const res = await token.increaseAllowance(user, idoContract.contractInfo.address, amount);
  };

  nftContract.setContractInfo({
    address: 'secret159hrs96qs5cqug6asc8c0svzgwpfpn9gdgx3x8',
    codeHash: 'a41f4cedabcb4585ab263ae014ef654ec6fd4f9cfc9f51dcade69efbdf514db7'
  });

  bandContract.setContractInfo({
    address: 'secret14swdnnllsfvtnvwmtvnvcj2zu0njsl9cdkk5xp',
    codeHash: '00230665fa8dc8bb3706567cf0a61f282edc34d2f7df56192b2891fd9cd27b06'
  });

  it('Deploy IDO contract', async () => {
    admin = await getAdmin(endpoint, chainId);
    const validators = await admin.query.staking.validators({ status: '' });
    const validator = validators.validators![0].operator_address!;
    const initTierMsg: Tier.InstantiateMsg = {
      validator,
      deposits: tierDeposits,
      band_oracle: bandContract.contractInfo.address,
      band_code_hash: bandContract.contractInfo.codeHash
    };

    await idoToken.init(admin);
    await paymentToken.init(admin);
    await nftContract.init(admin);
    await tierContract.init(admin, initTierMsg);

    const initIdoMsg: Ido.InstantiateMsg = {
      lock_periods: idoLockPeriods,
      tier_contract: tierContract.contractInfo.address,
      tier_contract_hash: tierContract.contractInfo.codeHash,
      nft_contract: nftContract.contractInfo.address,
      nft_contract_hash: nftContract.contractInfo.codeHash
    };

    idoContract = new Ido.IdoContract(nftContract.contractInfo);
    await idoContract.init(admin, initIdoMsg);
  });

  it('Start IDO with empty whitelist', async () => {
    idoOwner = await getAdmin(endpoint, chainId);
    await mintTo(idoOwner, idoTotalAmount, idoToken);

    price = 10;

    const time = currentTime();
    const startTime = time + 20;
    const endTime = startTime + 100;
    startIdoMsg = {
      start_ido: {
        start_time: startTime,
        end_time: endTime,
        token_contract: idoToken.contractInfo.address,
        token_contract_hash: idoToken.contractInfo.codeHash,
        price: price.toString(),
        total_amount: idoTotalAmount.toString(),
        soft_cap: idoTotalAmount.toString(),
        tokens_per_tier: tokensPerTier,
        whitelist: { empty: {} },
        payment: {
          token: {
            contract: paymentToken.contractInfo.address,
            code_hash: paymentToken.contractInfo.codeHash
          }
        }
      }
    };

    const response = await idoContract.startIdo(idoOwner, startIdoMsg);
    idoId = response.start_ido.ido_id;

    const idoInfo = await idoContract.idoInfo(idoOwner, idoId).then((i) => i.ido_info);

    assert.equal(idoInfo.admin, idoOwner.address);
    assert.equal(idoInfo.start_time, startTime);
    assert.equal(idoInfo.end_time, endTime);
    assert.equal(idoInfo.token_contract, idoToken.contractInfo.address);
    assert.equal(idoInfo.token_contract_hash, idoToken.contractInfo.codeHash);
    assert.equal(idoInfo.price, price.toString());
    assert.equal(idoInfo.total_tokens_amount, idoTotalAmount.toString());
    assert.equal(idoInfo.soft_cap, idoTotalAmount.toString());
    assert.equal(idoInfo.shared_whitelist, false);
    assert.equal(idoInfo.withdrawn, false);
    assert.equal(idoInfo.sold_amount, 0);
    assert.equal(idoInfo.participants, 0);
    assert.deepEqual(idoInfo.payment, {
      token: {
        contract: paymentToken.contractInfo.address,
        code_hash: paymentToken.contractInfo.codeHash
      }
    });
  });

  it('Try to buy tokens before IDO starts', async () => {
    user = await getUser(endpoint, chainId, 1);
    await mintTo(user, idoTotalAmount / price, paymentToken);

    await assert.rejects(
      async () => {
        await idoContract.buyTokens(user, idoId, 1);
      },
      (err: Error) => {
        return err.message.indexOf('IDO is not active') >= 0;
      }
    );
  });

  it('Add user to whitelist', async () => {
    await idoContract.addWhitelist(idoOwner, user.address, idoId);
  });

  for (let tier = 2; tier >= 1; tier--) {
    it(`Buy tokens with Tier = ${tier}`, async () => {
      await tierContract.setTier(user, tier, bandContract);
      const tierUserInfo = await tierContract.userInfo(user);
      assert.equal(tierUserInfo.user_info.tier, tier);

      const tierIndex = tier - 1;
      const tokensAmount = Number.parseInt(tokensPerTier[tierIndex]);

      const initialUserBalance = await paymentToken.getBalance(user);
      await checkMaxDeposit(user, idoContract, idoId, tokensAmount);

      // const totalTokensBought = tokensPerTier
      //   .slice(tierIndex)
      //   .reduce((sum, v) => sum + Number.parseInt(v), 0);

      // const totalPayment = totalTokensBought / price;

      // const userInfo = await idoContract.userInfo(user);
      // assert.equal(userInfo.user_info.total_payment, totalPayment);
      // assert.equal(userInfo.user_info.total_tokens_received, 0);
      // assert.equal(userInfo.user_info.total_tokens_bought, totalTokensBought);

      // const userInfoIdo = await idoContract.userInfo(user, idoId);
      // assert.deepEqual(userInfo, userInfoIdo);

      // const balance = await paymentToken.getBalance(user);
      // assert.equal(initialUserBalance - balance, tokensAmount / price);

      // const idoInfo = await idoContract.idoInfo(idoOwner, idoId);
      // assert.equal(idoInfo.ido_info.total_payment, totalPayment);

      // const response = await idoContract.purchases(user, idoId);
      // const purchases = response.purchases.purchases;
      // const lastPurchase = purchases[purchases.length - 1];
      // const purchasesAmount = response.purchases.amount;

      // assert.equal(lastPurchase.tokens_amount, tokensAmount);
      // assert.equal(purchasesAmount, 5 - tierIndex);
      // assert.equal(
      //   idoInfo.ido_info.end_time + idoLockPeriods[tierIndex],
      //   lastPurchase.unlock_time
      // );
    });
  }

  it('Try to receive tokens before lock period', async () => {
    await assert.rejects(
      async () => {
        await idoContract.recvTokens(user, idoId);
      },
      (err: Error) => {
        return err.message.indexOf('Nothing to receive') >= 0;
      }
    );
  });

  it('Try to receive tokens after IDO end', async () => {
    const idoInfo = await idoContract.idoInfo(idoOwner, idoId);
    await waitFor(idoInfo.ido_info.end_time);

    await assert.rejects(
      async () => {
        await idoContract.recvTokens(user, idoId);
      },
      (err: Error) => {
        return err.message.indexOf('Nothing to receive') >= 0;
      }
    );
  });

  it('Receive tokens after lock period', async () => {
    const response = await idoContract.purchases(user, idoId);
    const maxUnlockTime = response.purchases.purchases.reduce((max, value) => Math.max(max, value.unlock_time), 0);

    const purchasesBeforeReceive = await idoContract.purchases(user, idoId);
    await waitFor(maxUnlockTime);

    const initialBalance = await idoToken.getBalance(user);
    await idoContract.recvTokens(user, idoId);

    const balance = await idoToken.getBalance(user);
    assert.equal(balance, initialBalance + idoTotalAmount);

    const purchases = await idoContract.purchases(user, idoId);
    assert.equal(purchases.purchases.amount, 0);
    assert.equal(purchases.purchases.purchases.length, 0);

    const archivedPurchases = await idoContract.archivedPurchases(user, idoId);
    assert.deepEqual(archivedPurchases.archived_purchases, purchasesBeforeReceive.purchases);
  });

  it('Start IDO for NFT test', async () => {
    await mintTo(idoOwner, idoTotalAmount, idoToken);

    price = 10;

    const time = currentTime();
    const startTime = time;
    const endTime = startTime + 1280;
    startIdoMsg = {
      start_ido: {
        start_time: startTime,
        end_time: endTime,
        token_contract: idoToken.contractInfo.address,
        token_contract_hash: idoToken.contractInfo.codeHash,
        price: price.toString(),
        total_amount: idoTotalAmount.toString(),
        soft_cap: idoTotalAmount.toString(),
        tokens_per_tier: tokensPerTier,
        whitelist: { shared: {} },
        payment: {
          token: {
            contract: paymentToken.contractInfo.address,
            code_hash: paymentToken.contractInfo.codeHash
          }
        }
      }
    };

    const response = await idoContract.startIdo(idoOwner, startIdoMsg);
    idoId = response.start_ido.ido_id;

    const idoInfo = await idoContract.idoInfo(idoOwner, idoId);
    assert.equal(idoInfo.ido_info.shared_whitelist, true);
  });

  it('Buy tokens with NFT (private metadata)', async () => {
    user = await getUser(endpoint, chainId, 2);
    const tier = 3;
    const tierIndex = tier - 1;
    const tokensAmount = Number.parseInt(tokensPerTier[tierIndex]);
    const mintAmount = idoTotalAmount / price;

    // const tierUserInfo = await tierContract.userInfo(user);
    await mintTo(user, mintAmount, paymentToken);
    const userInfo = await idoContract.userInfo(user);
    await idoContract.addWhitelist(idoOwner, user.address, idoId);

    const mintResponse = await nftContract.mint(admin, {
      mint_nft: {
        owner: user.address,
        public_metadata: {
          extension: {
            attributes: [
              { trait_type: 'ID', value: 'XYZC' },
              {
                trait_type: 'Rarity',
                value: 'Super Rare'
              }
            ]
          }
        },
        private_metadata: {
          extension: {
            attributes: [
              { value: 'trait' },
              {
                trait_type: 'color',
                value: 'green'
              }
            ]
          }
        }
      }
    });
    await checkMaxDeposit(user, idoContract, idoId, tokensAmount, true);
  });

  it('Buy tokens with NFT (public metadata)', async () => {
    user = await getUser(endpoint, chainId, 2);
    const tier = 2;
    const tierIndex = tier - 1;
    const tokensAmount = Number.parseInt(tokensPerTier[tierIndex]);
    const mintAmount = idoTotalAmount / price;
    await mintTo(user, mintAmount);

    const mintResponse = await nftContract.mint(admin, {
      mint_nft: {
        owner: user.address,
        public_metadata: {
          extension: {
            attributes: [
              { trait_type: 'ID', value: 'XYZB' },
              {
                trait_type: 'Rarity',
                value: 'Super Rare'
              }
            ]
          }
        },
        private_metadata: {
          extension: {
            attributes: [
              { trait_type: 'ID', value: 'XYZC' },
              {
                trait_type: 'Rarity',
                value: 'Super Rare'
              }
            ]
          }
        }
      }
    });

    await checkMaxDeposit(user, idoContract, idoId, tokensAmount, true);
  });

  it("Try to buy tokens with someone's NFT", async () => {
    user = await getUser(endpoint, chainId, 0);
    await idoContract.addWhitelist(idoOwner, user.address, idoId);

    const tier = 5;
    const tierIndex = tier - 1;
    const tokensAmount = Number.parseInt(tokensPerTier[tierIndex]);
    const mintAmount = tokensAmount / price;
    await mintTo(user, mintAmount);

    await checkMaxDeposit(user, idoContract, idoId, tokensAmount, true);
  });

  it('Start IDO with shared whitelist', async () => {
    await mintTo(idoOwner, idoTotalAmount, idoToken);

    const response = await idoContract.startIdo(idoOwner, startIdoMsg);
    idoId = response.start_ido.ido_id;

    const idoInfo = await idoContract.idoInfo(idoOwner, idoId);
    assert.equal(idoInfo.ido_info.shared_whitelist, true);
  });

  it('Block user', async () => {
    user = await getUser(endpoint, chainId, 0);

    let whitelisted = await idoContract.inWhitelist(user, idoId).then((w) => w.in_whitelist.in_whitelist);

    assert.ok(whitelisted);

    await idoContract.removeFromWhitelist(idoOwner, user.address, idoId);
    whitelisted = await idoContract.inWhitelist(user, idoId).then((w) => w.in_whitelist.in_whitelist);

    assert.ok(!whitelisted);
  });

  it('Buy tokens in blacklist', async () => {
    const tier = 4;
    await tierContract.setTier(user, tier, bandContract);
    const userInfo = await tierContract.userInfo(user);
    assert.equal(userInfo.user_info.tier, tier);

    const minTier = await tierContract.config(admin).then((c) => c.config.min_tier);

    const minTierIndex = minTier - 1;
    const tokensAmount = Number.parseInt(tokensPerTier[minTierIndex]);

    await mintTo(user, idoTotalAmount / price);
    await checkMaxDeposit(user, idoContract, idoId, tokensAmount, true);
  });

  it('Remove user from blacklist', async () => {
    await idoContract.addWhitelist(idoOwner, user.address, idoId);
    const whitelisted = await idoContract.inWhitelist(user, idoId).then((w) => w.in_whitelist.in_whitelist);

    assert.ok(whitelisted);
  });

  it('Buy tokens in whitelist', async () => {
    const tier = 4;
    const tierIndex = tier - 1;
    const tokensAmount = Number.parseInt(tokensPerTier[tierIndex]);

    await mintTo(user, tokensAmount * price);
    await checkMaxDeposit(user, idoContract, idoId, tokensAmount);
  });

  it('Start IDO with specified tokens per tier', async () => {
    user = await getUser(endpoint, chainId, 2);
    await mintTo(idoOwner, idoTotalAmount, idoToken);
    await mintTo(user, idoTotalAmount);

    const time = currentTime();
    const startIdoMsg: Ido.ExecuteMsg.StartIdo = {
      start_ido: {
        start_time: time,
        end_time: time + 10_000,
        token_contract: idoToken.contractInfo.address,
        token_contract_hash: idoToken.contractInfo.codeHash,
        price: price.toString(),
        total_amount: idoTotalAmount.toString(),
        soft_cap: idoTotalAmount.toString(),
        tokens_per_tier: tokensPerTier,
        whitelist: { empty: { with: [user.address] } },
        payment: {
          token: {
            contract: paymentToken.contractInfo.address,
            code_hash: paymentToken.contractInfo.codeHash
          }
        }
      }
    };

    const response = await idoContract.startIdo(idoOwner, startIdoMsg);
    idoId = response.start_ido.ido_id;
  });

  it('Start IDO with native payment', async () => {
    idoOwner = await getAdmin(endpoint, chainId);
    price = 10;
    await mintTo(idoOwner, idoTotalAmount, idoToken);

    const time = currentTime();
    const startIdoMsg: Ido.ExecuteMsg.StartIdo = {
      start_ido: {
        start_time: time,
        end_time: time + 10_000,
        token_contract: idoToken.contractInfo.address,
        token_contract_hash: idoToken.contractInfo.codeHash,
        price: price.toString(),
        total_amount: idoTotalAmount.toString(),
        soft_cap: idoTotalAmount.toString(),
        payment: 'native',
        whitelist: { empty: {} },
        tokens_per_tier: tokensPerTier
      }
    };

    const response = await idoContract.startIdo(idoOwner, startIdoMsg);
    idoId = response.start_ido.ido_id;
  });

  it('Buy some tokens', async () => {
    user = await getUser(endpoint, chainId, 3);

    await idoContract.addWhitelist(idoOwner, user.address, idoId);

    const initialIdoOwnerBalance = await getBalance(user, idoContract.contractInfo.address);
    await idoContract.buyTokens(user, idoId, 1);

    const balance = await getBalance(user, idoContract.contractInfo.address);
    assert.equal(balance - initialIdoOwnerBalance, 1);
  });
});
