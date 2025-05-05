import { BigInt, Address, ethereum } from '@graphprotocol/graph-ts';
import {
  StakingRewards,
  Staked,
  Withdrawn,
  RewardPaid,
  RewardAdded,
  RewardsDurationUpdated
} from '../generated/StakingRewards/StakingRewards';
import {
  StakingPool,
  Staker,
  StakeEvent,
  WithdrawEvent,
  RewardEvent,
  RewardAddedEvent,
  Token,
  Factory
} from '../generated/schema';
import { ERC20 } from '../generated/StakingRewards/ERC20';
import { ZERO_BI, ONE_BI, FACTORY_ADDRESS } from './helpers';

// Helper function to get or create the staking pool
function getOrCreateStakingPool(address: Address, block: ethereum.Block): StakingPool {
  let pool = StakingPool.load(address.toHexString());

  if (pool === null) {
    pool = new StakingPool(address.toHexString());
    pool.address = address;
    pool.totalStaked = ZERO_BI;
    pool.rewardRate = ZERO_BI;
    pool.rewardsDuration = ZERO_BI;
    pool.periodFinish = ZERO_BI;
    pool.lastUpdateTime = ZERO_BI;
    pool.rewardPerTokenStored = ZERO_BI;
    pool.createdAt = block.timestamp;
    pool.updatedAt = block.timestamp;

    // Load contract data
    let contract = StakingRewards.bind(address);

    // Load or create factory
    let factory = Factory.load(FACTORY_ADDRESS);
    if (factory === null) {
      // Create a new factory if it doesn't exist yet
      factory = new Factory(FACTORY_ADDRESS);
      factory.address = Address.fromString(FACTORY_ADDRESS);
      factory.pairCount = 0;
      factory.totalVolumeUSD = ZERO_BI.toBigDecimal();
      factory.totalVolumeKLC = ZERO_BI.toBigDecimal();
      factory.totalLiquidityUSD = ZERO_BI.toBigDecimal();
      factory.totalLiquidityKLC = ZERO_BI.toBigDecimal();
      factory.txCount = ZERO_BI;
      factory.createdAt = block.timestamp;
      factory.updatedAt = block.timestamp;
      factory.save();
    }

    // Get staking token
    let stakingTokenAddress = contract.stakingToken();
    let stakingToken = Token.load(stakingTokenAddress.toHexString());
    if (stakingToken === null) {
      // If token doesn't exist in our system yet, create a placeholder
      stakingToken = new Token(stakingTokenAddress.toHexString());
      stakingToken.factory = factory.id; // Set the factory field
      stakingToken.address = stakingTokenAddress;

      // Try to get token details
      let tokenContract = ERC20.bind(stakingTokenAddress);
      let symbolResult = tokenContract.try_symbol();
      if (!symbolResult.reverted) {
        stakingToken.symbol = symbolResult.value;
      } else {
        stakingToken.symbol = 'UNKNOWN';
      }

      let nameResult = tokenContract.try_name();
      if (!nameResult.reverted) {
        stakingToken.name = nameResult.value;
      } else {
        stakingToken.name = 'Unknown Token';
      }

      let decimalsResult = tokenContract.try_decimals();
      if (!decimalsResult.reverted) {
        stakingToken.decimals = decimalsResult.value;
      } else {
        stakingToken.decimals = 18;
      }

      let totalSupplyResult = tokenContract.try_totalSupply();
      if (!totalSupplyResult.reverted) {
        stakingToken.totalSupply = totalSupplyResult.value;
      } else {
        stakingToken.totalSupply = ZERO_BI;
      }

      stakingToken.tradeVolume = ZERO_BI.toBigDecimal();
      stakingToken.tradeVolumeUSD = ZERO_BI.toBigDecimal();
      stakingToken.untrackedVolumeUSD = ZERO_BI.toBigDecimal();
      stakingToken.txCount = ZERO_BI;
      stakingToken.totalLiquidity = ZERO_BI.toBigDecimal();
      stakingToken.derivedKLC = ZERO_BI.toBigDecimal();
      stakingToken.createdAt = block.timestamp;
      stakingToken.updatedAt = block.timestamp;
      stakingToken.save();
    }
    pool.stakingToken = stakingToken.id;

    // Get rewards token
    let rewardsTokenAddress = contract.rewardsToken();
    let rewardsToken = Token.load(rewardsTokenAddress.toHexString());
    if (rewardsToken === null) {
      // If token doesn't exist in our system yet, create a placeholder
      rewardsToken = new Token(rewardsTokenAddress.toHexString());
      rewardsToken.factory = factory.id; // Set the factory field
      rewardsToken.address = rewardsTokenAddress;

      // Try to get token details
      let tokenContract = ERC20.bind(rewardsTokenAddress);
      let symbolResult = tokenContract.try_symbol();
      if (!symbolResult.reverted) {
        rewardsToken.symbol = symbolResult.value;
      } else {
        rewardsToken.symbol = 'UNKNOWN';
      }

      let nameResult = tokenContract.try_name();
      if (!nameResult.reverted) {
        rewardsToken.name = nameResult.value;
      } else {
        rewardsToken.name = 'Unknown Token';
      }

      let decimalsResult = tokenContract.try_decimals();
      if (!decimalsResult.reverted) {
        rewardsToken.decimals = decimalsResult.value;
      } else {
        rewardsToken.decimals = 18;
      }

      let totalSupplyResult = tokenContract.try_totalSupply();
      if (!totalSupplyResult.reverted) {
        rewardsToken.totalSupply = totalSupplyResult.value;
      } else {
        rewardsToken.totalSupply = ZERO_BI;
      }

      rewardsToken.tradeVolume = ZERO_BI.toBigDecimal();
      rewardsToken.tradeVolumeUSD = ZERO_BI.toBigDecimal();
      rewardsToken.untrackedVolumeUSD = ZERO_BI.toBigDecimal();
      rewardsToken.txCount = ZERO_BI;
      rewardsToken.totalLiquidity = ZERO_BI.toBigDecimal();
      rewardsToken.derivedKLC = ZERO_BI.toBigDecimal();
      rewardsToken.createdAt = block.timestamp;
      rewardsToken.updatedAt = block.timestamp;
      rewardsToken.save();
    }
    pool.rewardsToken = rewardsToken.id;

    // Try to load contract state
    let totalSupplyResult = contract.try_totalSupply();
    if (!totalSupplyResult.reverted) {
      pool.totalStaked = totalSupplyResult.value;
    }

    let rewardRateResult = contract.try_rewardRate();
    if (!rewardRateResult.reverted) {
      pool.rewardRate = rewardRateResult.value;
    }

    let rewardsDurationResult = contract.try_rewardsDuration();
    if (!rewardsDurationResult.reverted) {
      pool.rewardsDuration = rewardsDurationResult.value;
    }

    let periodFinishResult = contract.try_periodFinish();
    if (!periodFinishResult.reverted) {
      pool.periodFinish = periodFinishResult.value;
    }

    let lastUpdateTimeResult = contract.try_lastUpdateTime();
    if (!lastUpdateTimeResult.reverted) {
      pool.lastUpdateTime = lastUpdateTimeResult.value;
    }

    let rewardPerTokenStoredResult = contract.try_rewardPerTokenStored();
    if (!rewardPerTokenStoredResult.reverted) {
      pool.rewardPerTokenStored = rewardPerTokenStoredResult.value;
    }

    pool.save();
  }

  return pool as StakingPool;
}

// Helper function to get or create a staker
function getOrCreateStaker(address: Address, poolAddress: Address, block: ethereum.Block): Staker {
  let stakerId = address.toHexString() + '-' + poolAddress.toHexString();
  let staker = Staker.load(stakerId);

  if (staker === null) {
    staker = new Staker(stakerId);
    staker.address = address;
    staker.pool = poolAddress.toHexString();
    staker.stakedAmount = ZERO_BI;
    staker.rewards = ZERO_BI;
    staker.rewardPerTokenPaid = ZERO_BI;
    staker.lastAction = 'created';
    staker.lastActionTimestamp = block.timestamp;

    // Load contract data
    let contract = StakingRewards.bind(poolAddress);

    // Try to load user state
    let balanceResult = contract.try_balanceOf(address);
    if (!balanceResult.reverted) {
      staker.stakedAmount = balanceResult.value;
    }

    let rewardsResult = contract.try_earned(address);
    if (!rewardsResult.reverted) {
      staker.rewards = rewardsResult.value;
    }

    let userRewardPerTokenPaidResult = contract.try_userRewardPerTokenPaid(address);
    if (!userRewardPerTokenPaidResult.reverted) {
      staker.rewardPerTokenPaid = userRewardPerTokenPaidResult.value;
    }

    staker.save();
  }

  return staker as Staker;
}

// Handle Staked event
export function handleStaked(event: Staked): void {
  let pool = getOrCreateStakingPool(event.address, event.block);
  let staker = getOrCreateStaker(event.params.user, event.address, event.block);

  // Update pool
  pool.totalStaked = pool.totalStaked.plus(event.params.amount);
  pool.updatedAt = event.block.timestamp;
  pool.save();

  // Update staker
  staker.stakedAmount = staker.stakedAmount.plus(event.params.amount);
  staker.lastAction = 'staked';
  staker.lastActionTimestamp = event.block.timestamp;
  staker.save();

  // Create stake event
  let stakeEvent = new StakeEvent(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  stakeEvent.staker = staker.id;
  stakeEvent.pool = pool.id;
  stakeEvent.amount = event.params.amount;
  stakeEvent.timestamp = event.block.timestamp;
  stakeEvent.blockNumber = event.block.number;
  stakeEvent.transactionHash = event.transaction.hash;
  stakeEvent.save();
}

// Handle Withdrawn event
export function handleWithdrawn(event: Withdrawn): void {
  let pool = getOrCreateStakingPool(event.address, event.block);
  let staker = getOrCreateStaker(event.params.user, event.address, event.block);

  // Update pool
  pool.totalStaked = pool.totalStaked.minus(event.params.amount);
  pool.updatedAt = event.block.timestamp;
  pool.save();

  // Update staker
  staker.stakedAmount = staker.stakedAmount.minus(event.params.amount);
  staker.lastAction = 'withdrawn';
  staker.lastActionTimestamp = event.block.timestamp;
  staker.save();

  // Create withdraw event
  let withdrawEvent = new WithdrawEvent(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  withdrawEvent.staker = staker.id;
  withdrawEvent.pool = pool.id;
  withdrawEvent.amount = event.params.amount;
  withdrawEvent.timestamp = event.block.timestamp;
  withdrawEvent.blockNumber = event.block.number;
  withdrawEvent.transactionHash = event.transaction.hash;
  withdrawEvent.save();
}

// Handle RewardPaid event
export function handleRewardPaid(event: RewardPaid): void {
  let pool = getOrCreateStakingPool(event.address, event.block);
  let staker = getOrCreateStaker(event.params.user, event.address, event.block);

  // Update staker
  staker.rewards = ZERO_BI; // Reset rewards after claiming
  staker.lastAction = 'claimed';
  staker.lastActionTimestamp = event.block.timestamp;
  staker.save();

  // Create reward event
  let rewardEvent = new RewardEvent(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  rewardEvent.staker = staker.id;
  rewardEvent.pool = pool.id;
  rewardEvent.amount = event.params.reward;
  rewardEvent.timestamp = event.block.timestamp;
  rewardEvent.blockNumber = event.block.number;
  rewardEvent.transactionHash = event.transaction.hash;
  rewardEvent.save();
}

// Handle RewardAdded event
export function handleRewardAdded(event: RewardAdded): void {
  let pool = getOrCreateStakingPool(event.address, event.block);

  // Update contract state
  let contract = StakingRewards.bind(event.address);

  let rewardRateResult = contract.try_rewardRate();
  if (!rewardRateResult.reverted) {
    pool.rewardRate = rewardRateResult.value;
  }

  let periodFinishResult = contract.try_periodFinish();
  if (!periodFinishResult.reverted) {
    pool.periodFinish = periodFinishResult.value;
  }

  let lastUpdateTimeResult = contract.try_lastUpdateTime();
  if (!lastUpdateTimeResult.reverted) {
    pool.lastUpdateTime = lastUpdateTimeResult.value;
  }

  pool.updatedAt = event.block.timestamp;
  pool.save();

  // Create reward added event
  let rewardAddedEvent = new RewardAddedEvent(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  rewardAddedEvent.pool = pool.id;
  rewardAddedEvent.amount = event.params.reward;
  rewardAddedEvent.timestamp = event.block.timestamp;
  rewardAddedEvent.blockNumber = event.block.number;
  rewardAddedEvent.transactionHash = event.transaction.hash;
  rewardAddedEvent.save();
}

// Handle RewardsDurationUpdated event
export function handleRewardsDurationUpdated(event: RewardsDurationUpdated): void {
  let pool = getOrCreateStakingPool(event.address, event.block);

  // Update pool
  pool.rewardsDuration = event.params.newDuration;
  pool.updatedAt = event.block.timestamp;
  pool.save();
}
