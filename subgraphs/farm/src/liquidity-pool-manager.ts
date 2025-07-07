import { Address, BigInt } from '@graphprotocol/graph-ts';
import { OwnershipTransferred } from '../generated/LiquidityPoolManagerV2/LiquidityPoolManagerV2';
import { LiquidityPoolManagerV2 } from '../generated/LiquidityPoolManagerV2/LiquidityPoolManagerV2';
import {
  LiquidityPoolManager,
  WhitelistedPool
} from '../generated/schema';
import { ZERO_BI, WHITELISTED_POOLS } from './constants';

// Get or create LiquidityPoolManager entity
function getOrCreateLiquidityPoolManager(address: Address, blockTimestamp: BigInt): LiquidityPoolManager {
  let manager = LiquidityPoolManager.load(address.toHexString());
  
  if (manager === null) {
    manager = new LiquidityPoolManager(address.toHexString());
    manager.address = address;
    
    // Get contract state
    let contract = LiquidityPoolManagerV2.bind(address);
    
    // Try to get contract configuration
    let wklcResult = contract.try_wklc();
    if (!wklcResult.reverted) {
      manager.wklc = wklcResult.value;
    }
    
    let kswapResult = contract.try_kswap();
    if (!kswapResult.reverted) {
      manager.kswap = kswapResult.value;
    }
    
    let treasuryVesterResult = contract.try_treasuryVester();
    if (!treasuryVesterResult.reverted) {
      manager.treasuryVester = treasuryVesterResult.value;
    }
    
    let klcKswapPairResult = contract.try_klcKswapPair();
    if (!klcKswapPairResult.reverted) {
      manager.klcKswapPair = klcKswapPairResult.value;
    }
    
    let klcSplitResult = contract.try_klcSplit();
    if (!klcSplitResult.reverted) {
      manager.klcSplit = klcSplitResult.value;
    } else {
      manager.klcSplit = ZERO_BI;
    }
    
    let kswapSplitResult = contract.try_kswapSplit();
    if (!kswapSplitResult.reverted) {
      manager.kswapSplit = kswapSplitResult.value;
    } else {
      manager.kswapSplit = ZERO_BI;
    }
    
    let splitPoolsResult = contract.try_splitPools();
    if (!splitPoolsResult.reverted) {
      manager.splitPools = splitPoolsResult.value;
    } else {
      manager.splitPools = false;
    }
    
    let unallocatedKswapResult = contract.try_unallocatedKswap();
    if (!unallocatedKswapResult.reverted) {
      manager.unallocatedKswap = unallocatedKswapResult.value;
    } else {
      manager.unallocatedKswap = ZERO_BI;
    }
    
    manager.createdAt = blockTimestamp;
    manager.updatedAt = blockTimestamp;
    manager.save();
    
    // Load whitelisted pools
    loadWhitelistedPools(manager, contract, blockTimestamp);
  }
  
  return manager;
}

// Load whitelisted pools from contract
function loadWhitelistedPools(manager: LiquidityPoolManager, contract: LiquidityPoolManagerV2, blockTimestamp: BigInt): void {
  for (let i = 0; i < WHITELISTED_POOLS.length; i++) {
    let pairAddress = Address.fromString(WHITELISTED_POOLS[i]);
    let poolId = manager.id + '-' + pairAddress.toHexString();
    
    let whitelistedPool = WhitelistedPool.load(poolId);
    if (whitelistedPool === null) {
      whitelistedPool = new WhitelistedPool(poolId);
      whitelistedPool.manager = manager.id;
      whitelistedPool.pairAddress = pairAddress.toHexString();
      
      // Get pool weight from contract
      let isWhitelistedResult = contract.try_isWhitelisted(pairAddress);
      if (!isWhitelistedResult.reverted && isWhitelistedResult.value) {
        let weightResult = contract.try_weights(pairAddress);
        if (!weightResult.reverted) {
          whitelistedPool.weight = weightResult.value;
        } else {
          whitelistedPool.weight = ZERO_BI;
        }
      } else {
        whitelistedPool.weight = ZERO_BI;
      }
      
      whitelistedPool.createdAt = blockTimestamp;
      whitelistedPool.updatedAt = blockTimestamp;
      whitelistedPool.save();
    }
  }
}

// Handle OwnershipTransferred event
export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  let manager = getOrCreateLiquidityPoolManager(event.address, event.block.timestamp);
  manager.updatedAt = event.block.timestamp;
  manager.save();
}
