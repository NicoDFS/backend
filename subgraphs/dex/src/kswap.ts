import { BigInt, Address, ethereum } from '@graphprotocol/graph-ts';
import { KswapToken, Transfer, Approval } from '../generated/KswapToken/KswapToken';
import { Token, TransferEvent, ApprovalEvent, KalyswapFactory } from '../generated/schema';
import { fetchTokenSymbol, fetchTokenName, fetchTokenDecimals, fetchTokenTotalSupply } from './helpers';
import { ZERO_BI, ZERO_BD, ONE_BI, FACTORY_ADDRESS } from './constants';

// Handle Transfer event for KSWAP token
export function handleKswapTransfer(event: Transfer): void {
  // Load or create the token
  let token = Token.load(event.address.toHexString());
  if (token === null) {
    token = new Token(event.address.toHexString());
    token.symbol = fetchTokenSymbol(event.address);
    token.name = fetchTokenName(event.address);
    token.decimals = fetchTokenDecimals(event.address);
    token.totalSupply = fetchTokenTotalSupply(event.address);
    token.tradeVolume = ZERO_BD;
    token.tradeVolumeUSD = ZERO_BD;
    token.untrackedVolumeUSD = ZERO_BD;
    token.txCount = ZERO_BI;
    token.totalLiquidity = ZERO_BD;
    token.derivedKLC = ZERO_BD;
    token.save();
  }

  // Update token total supply
  token.totalSupply = fetchTokenTotalSupply(event.address);
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
  // Load or create the token
  let token = Token.load(event.address.toHexString());
  if (token === null) {
    token = new Token(event.address.toHexString());
    token.symbol = fetchTokenSymbol(event.address);
    token.name = fetchTokenName(event.address);
    token.decimals = fetchTokenDecimals(event.address);
    token.totalSupply = fetchTokenTotalSupply(event.address);
    token.tradeVolume = ZERO_BD;
    token.tradeVolumeUSD = ZERO_BD;
    token.untrackedVolumeUSD = ZERO_BD;
    token.txCount = ZERO_BI;
    token.totalLiquidity = ZERO_BD;
    token.derivedKLC = ZERO_BD;
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
