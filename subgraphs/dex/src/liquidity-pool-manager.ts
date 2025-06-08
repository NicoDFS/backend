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
import { ZERO_BI, ONE_BI } from './constants';

// Known whitelisted pool addresses based on the live frontend
const WHITELISTED_POOLS: string[] = [
  '0xf3e034650e1c2597a0af75012c1854247f271ee0', // WKLC-KSWAP
  '0x1a3d8b9fe0a77923a8330ffce485afd2b0b8be7e', // WKLC-DAI
  // '0x30ed4a3d51d7acebe1df5ae5257da3dc777080ad62', // WKLC-USDC (temporarily removed - invalid address)
  '0x25fddaf836d12dc5e285823a644bb86e0b79c8e2', // WKLC-USDT
  '0x0e520779287bb711c8e603cc85d532daa7c55372', // KSWAP-USDT
  '0x82a20edd4a6c076f5c2f9d244c80c5906aa88268', // WKLC-ETH
  '0x558d7d1ef09ae32dbdfe25f5f9eea6767288b156', // WKLC-POL
  '0x5df408ae7a3a83b9889e8e661a6c91a00b723fde', // WKLC-BNB
  '0x6548735742fc5cccb2cde021246feb333ef46211'  // WKLC-WBTC
];

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

    // Read actual whitelisted pools from the contract
    loadWhitelistedPools(manager, contract, block.timestamp);
  }

  return manager as LiquidityPoolManager;
}

// Function to load actual whitelisted pools from the contract
function loadWhitelistedPools(
  manager: LiquidityPoolManager,
  contract: LiquidityPoolManagerV2,
  timestamp: BigInt
): void {
  // Iterate through known whitelisted pool addresses
  for (let i = 0; i < WHITELISTED_POOLS.length; i++) {
    let pairAddress = Address.fromString(WHITELISTED_POOLS[i]);

    // Check if this pair is actually whitelisted in the contract
    let isWhitelistedResult = contract.try_isWhitelisted(pairAddress);
    if (!isWhitelistedResult.reverted && isWhitelistedResult.value) {
      // Get the weight for this pair
      let weightResult = contract.try_weights(pairAddress);
      let weight = weightResult.reverted ? BigInt.fromI32(0) : weightResult.value;

      // Create the whitelisted pool entity
      let poolId = manager.id + '-' + pairAddress.toHexString();
      let whitelistedPool = new WhitelistedPool(poolId);
      whitelistedPool.manager = manager.id;
      whitelistedPool.pair = pairAddress.toHexString();
      whitelistedPool.weight = weight;
      whitelistedPool.createdAt = timestamp;
      whitelistedPool.updatedAt = timestamp;
      whitelistedPool.save();
    }
  }
}

// Helper function to create or update a whitelisted pool
function createOrUpdateWhitelistedPool(
  managerId: string,
  pairAddress: Address,
  weight: BigInt,
  timestamp: BigInt
): void {
  let poolId = managerId + '-' + pairAddress.toHexString();
  let whitelistedPool = WhitelistedPool.load(poolId);

  if (whitelistedPool === null) {
    whitelistedPool = new WhitelistedPool(poolId);
    whitelistedPool.manager = managerId;
    whitelistedPool.pair = pairAddress.toHexString();
    whitelistedPool.createdAt = timestamp;
  }

  whitelistedPool.weight = weight;
  whitelistedPool.updatedAt = timestamp;
  whitelistedPool.save();
}

// Handle OwnershipTransferred event
export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  let manager = getOrCreateLiquidityPoolManager(event.address, event.block);

  // Update manager
  manager.updatedAt = event.block.timestamp;
  manager.save();

  // Refresh whitelisted pools when ownership changes (in case new pools were added)
  let contract = LiquidityPoolManagerV2.bind(event.address);
  loadWhitelistedPools(manager, contract, event.block.timestamp);
}
