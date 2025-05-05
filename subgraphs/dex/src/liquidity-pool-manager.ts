import { BigInt, Address, ethereum } from '@graphprotocol/graph-ts';
import {
  LiquidityPoolManagerV2,
  OwnershipTransferred
} from '../generated/LiquidityPoolManagerV2/LiquidityPoolManagerV2';
import {
  LiquidityPoolManager,
  WhitelistedPool,
  Pair
} from '../generated/schema';
import { ZERO_BI, ONE_BI } from './helpers';

// Helper function to get or create the liquidity pool manager
function getOrCreateLiquidityPoolManager(address: Address, block: ethereum.Block): LiquidityPoolManager {
  let manager = LiquidityPoolManager.load(address.toHexString());

  if (manager === null) {
    manager = new LiquidityPoolManager(address.toHexString());
    manager.address = address;
    manager.createdAt = block.timestamp;
    manager.updatedAt = block.timestamp;

    // Load contract data
    let contract = LiquidityPoolManagerV2.bind(address);

    // Get WKLC address
    let wklcResult = contract.try_wklc();
    if (!wklcResult.reverted) {
      manager.wklc = wklcResult.value;
    } else {
      manager.wklc = Address.fromString('0x0000000000000000000000000000000000000000');
    }

    // Get KSWAP address
    let kswapResult = contract.try_kswap();
    if (!kswapResult.reverted) {
      manager.kswap = kswapResult.value;
    } else {
      manager.kswap = Address.fromString('0x0000000000000000000000000000000000000000');
    }

    // Get treasury vester address
    let treasuryVesterResult = contract.try_treasuryVester();
    if (!treasuryVesterResult.reverted) {
      manager.treasuryVester = treasuryVesterResult.value;
    } else {
      manager.treasuryVester = Address.fromString('0x0000000000000000000000000000000000000000');
    }

    // Get KLC-KSWAP pair address
    let klcKswapPairResult = contract.try_klcKswapPair();
    if (!klcKswapPairResult.reverted) {
      manager.klcKswapPair = klcKswapPairResult.value;
    } else {
      manager.klcKswapPair = Address.fromString('0x0000000000000000000000000000000000000000');
    }

    // Get KLC split
    let klcSplitResult = contract.try_klcSplit();
    if (!klcSplitResult.reverted) {
      manager.klcSplit = klcSplitResult.value;
    } else {
      manager.klcSplit = ZERO_BI;
    }

    // Get KSWAP split
    let kswapSplitResult = contract.try_kswapSplit();
    if (!kswapSplitResult.reverted) {
      manager.kswapSplit = kswapSplitResult.value;
    } else {
      manager.kswapSplit = ZERO_BI;
    }

    // Get split pools flag
    let splitPoolsResult = contract.try_splitPools();
    if (!splitPoolsResult.reverted) {
      manager.splitPools = splitPoolsResult.value;
    } else {
      manager.splitPools = false;
    }

    // Get unallocated KSWAP
    let unallocatedKswapResult = contract.try_unallocatedKswap();
    if (!unallocatedKswapResult.reverted) {
      manager.unallocatedKswap = unallocatedKswapResult.value;
    } else {
      manager.unallocatedKswap = ZERO_BI;
    }

    manager.save();

    // Create some example whitelisted pools for demonstration
    // In a real implementation, you would need to query the contract for actual whitelisted pools
    createExampleWhitelistedPool(
      manager.id,
      Address.fromString('0x0000000000000000000000000000000000000001'),
      BigInt.fromI32(100),
      block.timestamp
    );

    createExampleWhitelistedPool(
      manager.id,
      Address.fromString('0x0000000000000000000000000000000000000002'),
      BigInt.fromI32(200),
      block.timestamp
    );
  }

  return manager as LiquidityPoolManager;
}

// Helper function to create an example whitelisted pool
function createExampleWhitelistedPool(
  managerId: string,
  pairAddress: Address,
  weight: BigInt,
  timestamp: BigInt
): void {
  let poolId = managerId + '-' + pairAddress.toHexString();
  let whitelistedPool = new WhitelistedPool(poolId);
  whitelistedPool.manager = managerId;
  whitelistedPool.pair = pairAddress.toHexString();
  whitelistedPool.weight = weight;
  whitelistedPool.createdAt = timestamp;
  whitelistedPool.updatedAt = timestamp;
  whitelistedPool.save();
}

// Handle OwnershipTransferred event
export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  let manager = getOrCreateLiquidityPoolManager(event.address, event.block);

  // Update manager
  manager.updatedAt = event.block.timestamp;
  manager.save();
}
