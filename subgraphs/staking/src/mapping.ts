import { BigInt, Address, Bytes, ethereum } from '@graphprotocol/graph-ts';
import {
  KalyStaking,
  Staked,
  Withdrawn,
  RewardPaid,
  RewardAdded,
  RewardsDurationUpdated,
  Paused,
  Unpaused
} from '../generated/KalyStaking/KalyStaking';
import {
  StakingPool,
  User,
  StakeEvent,
  WithdrawEvent,
  RewardEvent,
  RewardAddedEvent,
  RewardsDurationUpdatedEvent,
  PauseEvent
} from '../generated/schema';

// Helper function to get or create the staking pool
function getOrCreateStakingPool(address: Address, block: ethereum.Block): StakingPool {
  let pool = StakingPool.load(address.toHexString());
  
  if (pool == null) {
    pool = new StakingPool(address.toHexString());
    pool.address = address;
    pool.totalStaked = BigInt.fromI32(0);
    pool.rewardRate = BigInt.fromI32(0);
    pool.rewardsDuration = BigInt.fromI32(0);
    pool.periodFinish = BigInt.fromI32(0);
    pool.lastUpdateTime = BigInt.fromI32(0);
    pool.rewardPerTokenStored = BigInt.fromI32(0);
    pool.paused = false;
    pool.createdAt = block.timestamp;
    pool.updatedAt = block.timestamp;
    
    // Load contract data
    let contract = KalyStaking.bind(address);
    
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
    
    let pausedResult = contract.try_paused();
    if (!pausedResult.reverted) {
      pool.paused = pausedResult.value;
    }
    
    pool.save();
  }
  
  return pool as StakingPool;
}

// Helper function to get or create a user
function getOrCreateUser(address: Address, poolAddress: Address, block: ethereum.Block): User {
  let userId = address.toHexString() + '-' + poolAddress.toHexString();
  let user = User.load(userId);
  
  if (user == null) {
    user = new User(userId);
    user.address = address;
    user.pool = poolAddress.toHexString();
    user.stakedAmount = BigInt.fromI32(0);
    user.rewards = BigInt.fromI32(0);
    user.rewardPerTokenPaid = BigInt.fromI32(0);
    user.lastAction = 'created';
    user.lastActionTimestamp = block.timestamp;
    
    // Load contract data
    let contract = KalyStaking.bind(poolAddress);
    
    // Try to load user state
    let balanceResult = contract.try_balanceOf(address);
    if (!balanceResult.reverted) {
      user.stakedAmount = balanceResult.value;
    }
    
    let rewardsResult = contract.try_rewards(address);
    if (!rewardsResult.reverted) {
      user.rewards = rewardsResult.value;
    }
    
    let userRewardPerTokenPaidResult = contract.try_userRewardPerTokenPaid(address);
    if (!userRewardPerTokenPaidResult.reverted) {
      user.rewardPerTokenPaid = userRewardPerTokenPaidResult.value;
    }
    
    user.save();
  }
  
  return user as User;
}

// Handle Staked event
export function handleStaked(event: Staked): void {
  let pool = getOrCreateStakingPool(event.address, event.block);
  let user = getOrCreateUser(event.params.user, event.address, event.block);
  
  // Update pool
  pool.totalStaked = pool.totalStaked.plus(event.params.amount);
  pool.updatedAt = event.block.timestamp;
  pool.save();
  
  // Update user
  user.stakedAmount = user.stakedAmount.plus(event.params.amount);
  user.lastAction = 'staked';
  user.lastActionTimestamp = event.block.timestamp;
  user.save();
  
  // Create stake event
  let stakeEvent = new StakeEvent(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  stakeEvent.user = user.id;
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
  let user = getOrCreateUser(event.params.user, event.address, event.block);
  
  // Update pool
  pool.totalStaked = pool.totalStaked.minus(event.params.amount);
  pool.updatedAt = event.block.timestamp;
  pool.save();
  
  // Update user
  user.stakedAmount = user.stakedAmount.minus(event.params.amount);
  user.lastAction = 'withdrawn';
  user.lastActionTimestamp = event.block.timestamp;
  user.save();
  
  // Create withdraw event
  let withdrawEvent = new WithdrawEvent(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  withdrawEvent.user = user.id;
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
  let user = getOrCreateUser(event.params.user, event.address, event.block);
  
  // Update user
  user.rewards = BigInt.fromI32(0); // Rewards are reset to 0 after claiming
  user.lastAction = 'claimed';
  user.lastActionTimestamp = event.block.timestamp;
  user.save();
  
  // Update pool
  pool.updatedAt = event.block.timestamp;
  pool.save();
  
  // Create reward event
  let rewardEvent = new RewardEvent(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  rewardEvent.user = user.id;
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
  let contract = KalyStaking.bind(event.address);
  
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
  
  // Create rewards duration updated event
  let durationEvent = new RewardsDurationUpdatedEvent(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  durationEvent.pool = pool.id;
  durationEvent.newDuration = event.params.newDuration;
  durationEvent.timestamp = event.block.timestamp;
  durationEvent.blockNumber = event.block.number;
  durationEvent.transactionHash = event.transaction.hash;
  durationEvent.save();
}

// Handle Paused event
export function handlePaused(event: Paused): void {
  let pool = getOrCreateStakingPool(event.address, event.block);
  
  // Update pool
  pool.paused = true;
  pool.updatedAt = event.block.timestamp;
  pool.save();
  
  // Create pause event
  let pauseEvent = new PauseEvent(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  pauseEvent.pool = pool.id;
  pauseEvent.paused = true;
  pauseEvent.timestamp = event.block.timestamp;
  pauseEvent.blockNumber = event.block.number;
  pauseEvent.transactionHash = event.transaction.hash;
  pauseEvent.save();
}

// Handle Unpaused event
export function handleUnpaused(event: Unpaused): void {
  let pool = getOrCreateStakingPool(event.address, event.block);
  
  // Update pool
  pool.paused = false;
  pool.updatedAt = event.block.timestamp;
  pool.save();
  
  // Create pause event
  let pauseEvent = new PauseEvent(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  pauseEvent.pool = pool.id;
  pauseEvent.paused = false;
  pauseEvent.timestamp = event.block.timestamp;
  pauseEvent.blockNumber = event.block.number;
  pauseEvent.transactionHash = event.transaction.hash;
  pauseEvent.save();
}
