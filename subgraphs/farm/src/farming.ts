import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import {
  Staked,
  Withdrawn,
  RewardPaid,
  RewardAdded,
  RewardsDurationUpdated
} from '../generated/StakingRewardsWKLCDAI/StakingRewards';
import { StakingRewards } from '../generated/StakingRewardsWKLCDAI/StakingRewards';
import {
  FarmingPool,
  Farmer,
  FarmStakeEvent,
  FarmWithdrawEvent,
  FarmRewardEvent,
  FarmRewardAddedEvent,
  FarmRewardsDurationUpdatedEvent
} from '../generated/schema';
import { ZERO_BI } from './constants';

// Get or create farming pool (StakingRewards contract)
function getOrCreateFarmingPool(address: Address, block: ethereum.Block): FarmingPool {
  let pool = FarmingPool.load(address.toHexString());
  
  if (pool === null) {
    pool = new FarmingPool(address.toHexString());
    pool.address = address;
    
    // Get contract state
    let contract = StakingRewards.bind(address);
    
    // Get staking token address (LP token)
    let stakingTokenResult = contract.try_stakingToken();
    if (!stakingTokenResult.reverted) {
      pool.stakingToken = stakingTokenResult.value.toHexString();
    } else {
      pool.stakingToken = '';
    }
    
    // Get rewards token address (KSWAP)
    let rewardsTokenResult = contract.try_rewardsToken();
    if (!rewardsTokenResult.reverted) {
      pool.rewardsToken = rewardsTokenResult.value.toHexString();
    } else {
      pool.rewardsToken = '';
    }
    
    // Initialize pool state
    pool.totalStaked = ZERO_BI;
    pool.rewardRate = ZERO_BI;
    pool.rewardsDuration = ZERO_BI;
    pool.periodFinish = ZERO_BI;
    pool.lastUpdateTime = ZERO_BI;
    pool.rewardPerTokenStored = ZERO_BI;
    
    // Get current contract state
    updatePoolState(pool, contract);
    
    pool.createdAt = block.timestamp;
    pool.updatedAt = block.timestamp;
    pool.save();
  }
  
  return pool;
}

// Update pool state from contract
function updatePoolState(pool: FarmingPool, contract: StakingRewards): void {
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
}

// Get or create farmer (user position in a pool)
function getOrCreateFarmer(userAddress: Address, poolAddress: Address, block: ethereum.Block): Farmer {
  let farmerId = userAddress.toHexString() + '-' + poolAddress.toHexString();
  let farmer = Farmer.load(farmerId);
  
  if (farmer === null) {
    farmer = new Farmer(farmerId);
    farmer.address = userAddress;
    farmer.pool = poolAddress.toHexString();
    farmer.stakedAmount = ZERO_BI;
    farmer.rewards = ZERO_BI;
    farmer.rewardPerTokenPaid = ZERO_BI;
    farmer.lastAction = 'CREATED';
    farmer.lastActionTimestamp = block.timestamp;
    farmer.save();
  }
  
  return farmer;
}

// Update farmer state from contract
function updateFarmerState(farmer: Farmer, contract: StakingRewards): void {
  let userAddress = Address.fromString(farmer.address.toHexString());
  
  let balanceResult = contract.try_balanceOf(userAddress);
  if (!balanceResult.reverted) {
    farmer.stakedAmount = balanceResult.value;
  }
  
  let earnedResult = contract.try_earned(userAddress);
  if (!earnedResult.reverted) {
    farmer.rewards = earnedResult.value;
  }
  
  let userRewardPerTokenPaidResult = contract.try_userRewardPerTokenPaid(userAddress);
  if (!userRewardPerTokenPaidResult.reverted) {
    farmer.rewardPerTokenPaid = userRewardPerTokenPaidResult.value;
  }
}

// Handle Staked event
export function handleStaked(event: Staked): void {
  let pool = getOrCreateFarmingPool(event.address, event.block);
  let farmer = getOrCreateFarmer(event.params.user, event.address, event.block);
  
  // Update contract states
  let contract = StakingRewards.bind(event.address);
  updatePoolState(pool, contract);
  updateFarmerState(farmer, contract);
  
  // Update farmer action
  farmer.lastAction = 'STAKED';
  farmer.lastActionTimestamp = event.block.timestamp;
  
  // Update timestamps
  pool.updatedAt = event.block.timestamp;
  
  // Save entities
  pool.save();
  farmer.save();
  
  // Create stake event
  let stakeEvent = new FarmStakeEvent(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  stakeEvent.farmer = farmer.id;
  stakeEvent.pool = pool.id;
  stakeEvent.amount = event.params.amount;
  stakeEvent.timestamp = event.block.timestamp;
  stakeEvent.blockNumber = event.block.number;
  stakeEvent.transactionHash = event.transaction.hash;
  stakeEvent.save();
}

// Handle Withdrawn event
export function handleWithdrawn(event: Withdrawn): void {
  let pool = getOrCreateFarmingPool(event.address, event.block);
  let farmer = getOrCreateFarmer(event.params.user, event.address, event.block);
  
  // Update contract states
  let contract = StakingRewards.bind(event.address);
  updatePoolState(pool, contract);
  updateFarmerState(farmer, contract);
  
  // Update farmer action
  farmer.lastAction = 'WITHDRAWN';
  farmer.lastActionTimestamp = event.block.timestamp;
  
  // Update timestamps
  pool.updatedAt = event.block.timestamp;
  
  // Save entities
  pool.save();
  farmer.save();
  
  // Create withdraw event
  let withdrawEvent = new FarmWithdrawEvent(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  withdrawEvent.farmer = farmer.id;
  withdrawEvent.pool = pool.id;
  withdrawEvent.amount = event.params.amount;
  withdrawEvent.timestamp = event.block.timestamp;
  withdrawEvent.blockNumber = event.block.number;
  withdrawEvent.transactionHash = event.transaction.hash;
  withdrawEvent.save();
}

// Handle RewardPaid event
export function handleRewardPaid(event: RewardPaid): void {
  let pool = getOrCreateFarmingPool(event.address, event.block);
  let farmer = getOrCreateFarmer(event.params.user, event.address, event.block);
  
  // Update contract states
  let contract = StakingRewards.bind(event.address);
  updatePoolState(pool, contract);
  updateFarmerState(farmer, contract);
  
  // Update farmer action
  farmer.lastAction = 'REWARD_CLAIMED';
  farmer.lastActionTimestamp = event.block.timestamp;
  
  // Update timestamps
  pool.updatedAt = event.block.timestamp;
  
  // Save entities
  pool.save();
  farmer.save();
  
  // Create reward event
  let rewardEvent = new FarmRewardEvent(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  rewardEvent.farmer = farmer.id;
  rewardEvent.pool = pool.id;
  rewardEvent.amount = event.params.reward;
  rewardEvent.timestamp = event.block.timestamp;
  rewardEvent.blockNumber = event.block.number;
  rewardEvent.transactionHash = event.transaction.hash;
  rewardEvent.save();
}

// Handle RewardAdded event
export function handleRewardAdded(event: RewardAdded): void {
  let pool = getOrCreateFarmingPool(event.address, event.block);
  
  // Update contract state
  let contract = StakingRewards.bind(event.address);
  updatePoolState(pool, contract);
  
  pool.updatedAt = event.block.timestamp;
  pool.save();
  
  // Create reward added event
  let rewardAddedEvent = new FarmRewardAddedEvent(
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
  let pool = getOrCreateFarmingPool(event.address, event.block);
  
  // Update contract state
  let contract = StakingRewards.bind(event.address);
  updatePoolState(pool, contract);
  
  pool.updatedAt = event.block.timestamp;
  pool.save();
  
  // Create rewards duration updated event
  let durationUpdatedEvent = new FarmRewardsDurationUpdatedEvent(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  durationUpdatedEvent.pool = pool.id;
  durationUpdatedEvent.newDuration = event.params.newDuration;
  durationUpdatedEvent.timestamp = event.block.timestamp;
  durationUpdatedEvent.blockNumber = event.block.number;
  durationUpdatedEvent.transactionHash = event.transaction.hash;
  durationUpdatedEvent.save();
}
