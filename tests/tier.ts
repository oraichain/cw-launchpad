import * as assert from 'assert';
import { SecretNetworkClient } from 'secretjs';
import { Band, getAdmin, getUser, Tier } from './utils';

describe('Tier', () => {
  let admin: SecretNetworkClient;
  let user: SecretNetworkClient;

  const chainId = 'pulsar-2';
  const endpoint = 'https://api.pulsar.scrttestnet.com';

  const tierDeposits = ['1000', '500', '200', '100'];
  const tierContract = new Tier.Contract();
  const bandContract = new Band.Contract();

  bandContract.setContractInfo({
    address: 'secret14swdnnllsfvtnvwmtvnvcj2zu0njsl9cdkk5xp',
    codeHash: '00230665fa8dc8bb3706567cf0a61f282edc34d2f7df56192b2891fd9cd27b06'
  });

  let initialDelegation: number;
  let validator: string;

  const depositEquals = (userInfo: Tier.QueryAnswer.UserInfo, deposit: number) => {
    assert.ok(Math.abs(Number.parseInt(userInfo.user_info.scrt_deposit) - deposit) < 10);
  };

  it('Deploy Tier contract', async () => {
    admin = await getAdmin(endpoint, chainId);

    const validators = await admin.query.staking.validators({});
    validator = validators.validators![0].operator_address!;

    const initTierMsg: Tier.InstantiateMsg = {
      validator,
      deposits: tierDeposits,
      band_oracle: bandContract.contractInfo.address,
      band_code_hash: bandContract.contractInfo.codeHash
    };

    await tierContract.init(admin, initTierMsg);

    try {
      const delegation = await admin.query.staking.delegation({
        delegator_addr: tierContract.contractInfo.address,
        validator_addr: validator
      });

      initialDelegation = Number.parseInt(delegation.delegation_response?.balance?.amount || '0');
    } catch {
      initialDelegation = 0;
    }
  });

  it('Deposit with wrong denom', async () => {
    user = await getUser(endpoint, chainId, 0);

    await assert.rejects(
      async () => {
        const amount = await bandContract.calculateUscrtAmount(admin, 100);
        await tierContract.deposit(user, amount, 'sscrt');
      },
      (err: Error) => {
        return err.message.indexOf('insufficient funds') >= 0;
      }
    );
  });

  it('Deposit less than min amount', async () => {
    await assert.rejects(
      async () => {
        const amount = await bandContract.calculateUscrtAmount(admin, 99);
        await tierContract.deposit(user, amount);
      },
      (err: Error) => {
        return err.message.indexOf('You should deposit at least 100 USD') >= 0;
      }
    );

    const userInfo = await tierContract.userInfo(user);
    assert.equal(userInfo.user_info.tier, 5);
    assert.equal(userInfo.user_info.usd_deposit, 0);
    assert.equal(userInfo.user_info.scrt_deposit, 0);
  });

  it('Tier 4', async () => {
    let userInfo = await tierContract.userInfo(user);
    const initialDeposit = Number.parseInt(userInfo.user_info.scrt_deposit);
    const amount = await bandContract.calculateUscrtAmount(admin, 100);

    await tierContract.deposit(user, amount);
    userInfo = await tierContract.userInfo(user);
    depositEquals(userInfo, initialDeposit + amount);
    assert.equal(userInfo.user_info.tier, 4);
  });

  it('Tier 3', async () => {
    let userInfo = await tierContract.userInfo(user);
    const initialDeposit = Number.parseInt(userInfo.user_info.scrt_deposit);
    const amount = await bandContract.calculateUscrtAmount(admin, 100);

    await tierContract.deposit(user, amount);
    userInfo = await tierContract.userInfo(user);
    depositEquals(userInfo, initialDeposit + amount);
    assert.equal(userInfo.user_info.tier, 3);
  });

  it('Try to change status with user', async () => {
    await assert.rejects(
      async () => {
        await tierContract.changeStatus(user, 'stopped');
      },
      (err: Error) => {
        return err.message.indexOf('unauthorized') >= 0;
      }
    );
  });

  it('Change status to stopped', async () => {
    await tierContract.changeStatus(admin, 'stopped');
    const config = await tierContract.config(user);
    assert.equal(config.config.status, 'stopped');
  });

  it('Try to deposit with stopped contract', async () => {
    await assert.rejects(
      async () => {
        const amount = await bandContract.calculateUscrtAmount(admin, 300);
        await tierContract.deposit(user, amount);
      },
      (err: Error) => {
        return err.message.indexOf('Contract is not active') >= 0;
      }
    );
  });

  it('Change status to active', async () => {
    await tierContract.changeStatus(admin, 'active');
    const config = await tierContract.config(user);
    assert.equal(config.config.status, 'active');
  });

  it('Tier 2', async () => {
    const amount = await bandContract.calculateUscrtAmount(admin, 300);
    let userInfo = await tierContract.userInfo(user);
    const initialDeposit = Number.parseInt(userInfo.user_info.scrt_deposit);

    await tierContract.deposit(user, amount);
    userInfo = await tierContract.userInfo(user);
    depositEquals(userInfo, initialDeposit + amount);
    assert.equal(userInfo.user_info.tier, 2);
  });

  it('Tier 1', async () => {
    const amount = await bandContract.calculateUscrtAmount(admin, 500_000);
    const expectedAmount = await bandContract.calculateUscrtAmount(admin, 500);

    let userInfo = await tierContract.userInfo(user);
    const initialDeposit = Number.parseInt(userInfo.user_info.scrt_deposit);

    await tierContract.deposit(user, amount);
    userInfo = await tierContract.userInfo(user);
    depositEquals(userInfo, initialDeposit + expectedAmount);
    assert.equal(userInfo.user_info.tier, 1);

    const delegation = await user.query.staking.delegation({
      delegator_addr: tierContract.contractInfo.address,
      validator_addr: validator
    });

    const expectedDeposit = await bandContract.calculateUscrtAmount(admin, initialDelegation + Number.parseInt(tierDeposits[0]));

    const delegationAmount = Number.parseInt(delegation.delegation_response!.balance!.amount!);

    assert.ok(Math.abs(delegationAmount - expectedDeposit) < 10);
  });

  it('Try to increase tier', async () => {
    await assert.rejects(
      async () => {
        const amount = await bandContract.calculateUscrtAmount(admin, 500_000);
        await tierContract.deposit(user, amount);
      },
      (err: Error) => {
        return err.message.indexOf('Reached max tier') >= 0;
      }
    );
  });

  it('Withdraw tokens', async () => {
    let userInfo = await tierContract.userInfo(user);
    let deposit = userInfo.user_info.scrt_deposit;
    await tierContract.withdraw(user);
    userInfo = await tierContract.userInfo(user);
    assert.equal(userInfo.user_info.tier, 5);
    assert.equal(userInfo.user_info.usd_deposit, 0);
    assert.equal(userInfo.user_info.scrt_deposit, 0);
    assert.equal(userInfo.user_info.timestamp, 0);

    const withdrawals = await tierContract.withdrawals(user);
    const withdrawal = withdrawals.withdrawals.withdrawals[0];
    assert.equal(withdrawals.withdrawals.amount, 1);
    assert.equal(withdrawal.amount, deposit);

    let currentDelegation: number;

    try {
      const delegation = await user.query.staking.delegation({
        delegator_addr: tierContract.contractInfo.address,
        validator_addr: validator
      });

      currentDelegation = Number.parseInt(delegation.delegation_response?.balance?.amount || '0');
    } catch {
      currentDelegation = 0;
    }

    assert.equal(currentDelegation - initialDelegation <= 5, true);
  });

  it('Deposit after withdraw', async () => {
    let withdrawals = await tierContract.withdrawals(user);
    let withdrawal = withdrawals.withdrawals.withdrawals[0];
    const initialWithdrawAmount = withdrawal.amount;

    const amount = await bandContract.calculateUscrtAmount(admin, 500_000);
    const expectedAmount = await bandContract.calculateUscrtAmount(admin, 1_000);
    await tierContract.deposit(user, amount);

    const userInfo = await tierContract.userInfo(user);
    depositEquals(userInfo, expectedAmount);
    assert.equal(userInfo.user_info.tier, 1);

    withdrawals = await tierContract.withdrawals(user);
    withdrawal = withdrawals.withdrawals.withdrawals[0];
    assert.equal(withdrawals.withdrawals.amount, 1);
    assert.equal(withdrawal.amount, initialWithdrawAmount);

    const delegation = await user.query.staking.delegation({
      delegator_addr: tierContract.contractInfo.address,
      validator_addr: validator
    });

    const expectedDeposit = await bandContract.calculateUscrtAmount(admin, initialDelegation + Number.parseInt(tierDeposits[0]));

    const delegationAmount = Number.parseInt(delegation.delegation_response!.balance!.amount!);

    assert.ok(Math.abs(delegationAmount - expectedDeposit) < 10);
  });

  it('Try to claim without unbonding period', async () => {
    await assert.rejects(
      async () => {
        await tierContract.claim(user);
      },
      (err: Error) => {
        return err.message.indexOf('Nothing to claim') >= 0;
      }
    );
  });

  it('Redelegate', async () => {
    const config = await tierContract.config(admin);
    const old_validator = config.config.validator;

    let old_delegation = await admin.query.staking.delegation({
      delegator_addr: tierContract.contractInfo.address,
      validator_addr: old_validator
    });

    const validators = await admin.query.staking.validators({});
    const new_validator = validators.validators![1].operator_address!;
    await tierContract.redelegate(admin, new_validator);

    const delegation = await admin.query.staking.delegation({
      delegator_addr: tierContract.contractInfo.address,
      validator_addr: new_validator
    });
    assert.equal(Number.parseInt(old_delegation.delegation_response!.balance!.amount!) - Number.parseInt(delegation.delegation_response!.balance!.amount!) <= 5, true);
  });
});
