import { BigInt, Address, ethereum } from '@graphprotocol/graph-ts';
import { KswapToken, Transfer, Approval } from '../generated/KswapToken/KswapToken';
import { Token, TransferEvent, ApprovalEvent, Factory } from '../generated/schema';
import { ZERO_BI, ONE_BI, fetchTokenSymbol, fetchTokenName, fetchTokenDecimals, fetchTokenTotalSupply, FACTORY_ADDRESS } from './helpers';

// Handle Transfer event for KSWAP token
export function handleKswapTransfer(event: Transfer): void {
  // Load the factory
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
    factory.createdAt = event.block.timestamp;
    factory.updatedAt = event.block.timestamp;
    factory.save();
  }

  // Load or create the token
  let token = Token.load(event.address.toHexString());
  if (token === null) {
    token = new Token(event.address.toHexString());
    token.factory = factory.id;
    token.address = event.address;
    token.symbol = fetchTokenSymbol(event.address);
    token.name = fetchTokenName(event.address);
    token.decimals = fetchTokenDecimals(event.address);
    token.totalSupply = fetchTokenTotalSupply(event.address);
    token.tradeVolume = ZERO_BI.toBigDecimal();
    token.tradeVolumeUSD = ZERO_BI.toBigDecimal();
    token.untrackedVolumeUSD = ZERO_BI.toBigDecimal();
    token.txCount = ZERO_BI;
    token.totalLiquidity = ZERO_BI.toBigDecimal();
    token.derivedKLC = ZERO_BI.toBigDecimal();
    token.createdAt = event.block.timestamp;
    token.updatedAt = event.block.timestamp;
    token.save();
  }

  // Update token total supply
  token.totalSupply = fetchTokenTotalSupply(event.address);
  token.updatedAt = event.block.timestamp;
  token.save();

  // Create transfer event
  let transferEvent = new TransferEvent(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  transferEvent.token = token.id;
  transferEvent.from = event.params.from;
  transferEvent.to = event.params.to;
  transferEvent.amount = event.params.amount;
  transferEvent.timestamp = event.block.timestamp;
  transferEvent.blockNumber = event.block.number;
  transferEvent.transactionHash = event.transaction.hash;
  transferEvent.save();
}

// Handle Approval event for KSWAP token
export function handleKswapApproval(event: Approval): void {
  // Load the factory
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
    factory.createdAt = event.block.timestamp;
    factory.updatedAt = event.block.timestamp;
    factory.save();
  }

  // Load or create the token
  let token = Token.load(event.address.toHexString());
  if (token === null) {
    token = new Token(event.address.toHexString());
    token.factory = factory.id;
    token.address = event.address;
    token.symbol = fetchTokenSymbol(event.address);
    token.name = fetchTokenName(event.address);
    token.decimals = fetchTokenDecimals(event.address);
    token.totalSupply = fetchTokenTotalSupply(event.address);
    token.tradeVolume = ZERO_BI.toBigDecimal();
    token.tradeVolumeUSD = ZERO_BI.toBigDecimal();
    token.untrackedVolumeUSD = ZERO_BI.toBigDecimal();
    token.txCount = ZERO_BI;
    token.totalLiquidity = ZERO_BI.toBigDecimal();
    token.derivedKLC = ZERO_BI.toBigDecimal();
    token.createdAt = event.block.timestamp;
    token.updatedAt = event.block.timestamp;
    token.save();
  }

  // Create approval event
  let approvalEvent = new ApprovalEvent(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  approvalEvent.token = token.id;
  approvalEvent.owner = event.params.owner;
  approvalEvent.spender = event.params.spender;
  approvalEvent.amount = event.params.amount;
  approvalEvent.timestamp = event.block.timestamp;
  approvalEvent.blockNumber = event.block.number;
  approvalEvent.transactionHash = event.transaction.hash;
  approvalEvent.save();
}
