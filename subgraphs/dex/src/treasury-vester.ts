import { BigInt, Address, ethereum } from '@graphprotocol/graph-ts';
import {
  TreasuryVester,
  TokensVested,
  VestingEnabled,
  RecipientChanged
} from '../generated/TreasuryVester/TreasuryVester';
import {
  TreasuryVester as TreasuryVesterEntity,
  TokensVestedEvent
} from '../generated/schema';
import { ZERO_BI, ONE_BI } from './helpers';

// Helper function to get or create the treasury vester
function getOrCreateTreasuryVester(address: Address, block: ethereum.Block): TreasuryVesterEntity {
  let vester = TreasuryVesterEntity.load(address.toHexString());

  if (vester === null) {
    vester = new TreasuryVesterEntity(address.toHexString());
    vester.address = address;
    vester.createdAt = block.timestamp;
    vester.updatedAt = block.timestamp;

    // Load contract data
    let contract = TreasuryVester.bind(address);

    // Get KSWAP address
    let kswapResult = contract.try_kswap();
    if (!kswapResult.reverted) {
      vester.kswap = kswapResult.value;
    } else {
      vester.kswap = Address.fromString('0x0000000000000000000000000000000000000000');
    }

    // Get recipient address
    let recipientResult = contract.try_recipient();
    if (!recipientResult.reverted) {
      vester.recipient = recipientResult.value;
    } else {
      vester.recipient = Address.fromString('0x0000000000000000000000000000000000000000');
    }

    // Get vesting amount
    let vestingAmountResult = contract.try_vestingAmount();
    if (!vestingAmountResult.reverted) {
      vester.vestingAmount = vestingAmountResult.value;
    } else {
      vester.vestingAmount = ZERO_BI;
    }

    // Set default values for vesting timestamps
    vester.vestingBegin = ZERO_BI;
    vester.vestingCliff = ZERO_BI;
    vester.vestingEnd = ZERO_BI;

    // Get last update timestamp
    let lastUpdateResult = contract.try_lastUpdate();
    if (!lastUpdateResult.reverted) {
      vester.lastUpdate = lastUpdateResult.value;
    } else {
      vester.lastUpdate = ZERO_BI;
    }

    // Get vesting enabled flag
    let vestingEnabledResult = contract.try_vestingEnabled();
    if (!vestingEnabledResult.reverted) {
      vester.vestingEnabled = vestingEnabledResult.value;
    } else {
      vester.vestingEnabled = false;
    }

    vester.save();
  }

  return vester as TreasuryVesterEntity;
}

// Handle TokensVested event
export function handleTokensVested(event: TokensVested): void {
  let vester = getOrCreateTreasuryVester(event.address, event.block);

  // Update vester
  let contract = TreasuryVester.bind(event.address);

  // Get last update timestamp
  let lastUpdateResult = contract.try_lastUpdate();
  if (!lastUpdateResult.reverted) {
    vester.lastUpdate = lastUpdateResult.value;
  }

  vester.updatedAt = event.block.timestamp;
  vester.save();

  // Create tokens vested event
  let tokensVestedEvent = new TokensVestedEvent(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  tokensVestedEvent.vester = vester.id;
  tokensVestedEvent.amount = event.params.amount;
  tokensVestedEvent.recipient = event.params.recipient;
  tokensVestedEvent.timestamp = event.block.timestamp;
  tokensVestedEvent.blockNumber = event.block.number;
  tokensVestedEvent.transactionHash = event.transaction.hash;
  tokensVestedEvent.save();
}

// Handle VestingEnabled event
export function handleVestingEnabled(event: VestingEnabled): void {
  let vester = getOrCreateTreasuryVester(event.address, event.block);

  // Update vester
  vester.vestingEnabled = true;
  vester.updatedAt = event.block.timestamp;
  vester.save();
}

// Handle RecipientChanged event
export function handleRecipientChanged(event: RecipientChanged): void {
  let vester = getOrCreateTreasuryVester(event.address, event.block);

  // Update vester
  vester.recipient = event.params.recipient;
  vester.updatedAt = event.block.timestamp;
  vester.save();
}
