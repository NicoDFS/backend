import { BigInt, Bytes, dataSource } from "@graphprotocol/graph-ts";
import {
  SentTransferRemote as SentTransferRemoteEvent,
  ReceivedTransferRemote as ReceivedTransferRemoteEvent,
  HypERC20
} from "../generated/templates/HypERC20/HypERC20";
import { Token, TokenTransfer } from "../generated/schema";
import {
  getOrCreateBridgeStats,
  getOrCreateChainStats,
  getOrCreateDailyBridgeStats,
  formatMessageId,
  formatTransactionHash,
  getTimestampFromEvent
} from "./utils";

function getOrCreateToken(tokenAddress: Bytes): Token {
  let id = tokenAddress.toHexString();
  let token = Token.load(id);
  
  if (token == null) {
    let contract = HypERC20.bind(dataSource.address());
    
    token = new Token(id);
    token.address = tokenAddress;
    
    // Try to get token details from the contract
    let nameResult = contract.try_name();
    let symbolResult = contract.try_symbol();
    let decimalsResult = contract.try_decimals();
    
    token.name = nameResult.reverted ? "Unknown Token" : nameResult.value;
    token.symbol = symbolResult.reverted ? "???" : symbolResult.value;
    token.decimals = decimalsResult.reverted ? 18 : decimalsResult.value;
    token.chainId = BigInt.fromI32(3888); // KalyChain
    token.standard = "HypERC20";
    token.totalBridgedOut = BigInt.fromI32(0);
    token.totalBridgedIn = BigInt.fromI32(0);
    token.save();
  }
  
  return token;
}

export function handleSentTransferRemote(event: SentTransferRemoteEvent): void {
  let token = getOrCreateToken(dataSource.address());
  let transferId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  
  let transfer = new TokenTransfer(transferId);
  transfer.messageId = event.params.messageId;
  transfer.token = token.id;
  transfer.sender = event.transaction.from;
  transfer.recipient = event.params.recipient;
  transfer.amount = event.params.amount;
  transfer.originDomain = BigInt.fromI32(3888); // KalyChain
  transfer.destinationDomain = BigInt.fromI32(event.params.destinationDomain);
  transfer.timestamp = getTimestampFromEvent(event);
  transfer.txHash = formatTransactionHash(event.transaction.hash);
  transfer.direction = "outgoing";
  transfer.save();
  
  // Update token stats
  token.totalBridgedOut = token.totalBridgedOut.plus(event.params.amount);
  token.save();
  
  // Update bridge stats
  let bridgeStats = getOrCreateBridgeStats();
  bridgeStats.totalTokenTransfers = bridgeStats.totalTokenTransfers.plus(BigInt.fromI32(1));
  bridgeStats.totalTokensOut = bridgeStats.totalTokensOut.plus(event.params.amount);
  bridgeStats.lastUpdated = getTimestampFromEvent(event);
  bridgeStats.save();
  
  // Update chain stats
  let chainStats = getOrCreateChainStats(BigInt.fromI32(3888)); // KalyChain
  chainStats.totalTokensOut = chainStats.totalTokensOut.plus(event.params.amount);
  chainStats.lastUpdated = getTimestampFromEvent(event);
  chainStats.save();
  
  // Update daily stats
  let dailyStats = getOrCreateDailyBridgeStats(getTimestampFromEvent(event));
  dailyStats.tokenTransfersCount = dailyStats.tokenTransfersCount.plus(BigInt.fromI32(1));
  dailyStats.tokenTransfersAmount = dailyStats.tokenTransfersAmount.plus(event.params.amount);
  dailyStats.save();
}

export function handleReceivedTransferRemote(event: ReceivedTransferRemoteEvent): void {
  let token = getOrCreateToken(dataSource.address());
  let transferId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  
  let transfer = new TokenTransfer(transferId);
  transfer.messageId = event.params.messageId;
  transfer.token = token.id;
  transfer.sender = Bytes.fromHexString("0x0000000000000000000000000000000000000000"); // We don't know the sender from this event
  transfer.recipient = event.params.recipient;
  transfer.amount = event.params.amount;
  transfer.originDomain = BigInt.fromI32(event.params.originDomain);
  transfer.destinationDomain = BigInt.fromI32(3888); // KalyChain
  transfer.timestamp = getTimestampFromEvent(event);
  transfer.txHash = formatTransactionHash(event.transaction.hash);
  transfer.direction = "incoming";
  transfer.save();
  
  // Update token stats
  token.totalBridgedIn = token.totalBridgedIn.plus(event.params.amount);
  token.save();
  
  // Update bridge stats
  let bridgeStats = getOrCreateBridgeStats();
  bridgeStats.totalTokenTransfers = bridgeStats.totalTokenTransfers.plus(BigInt.fromI32(1));
  bridgeStats.totalTokensIn = bridgeStats.totalTokensIn.plus(event.params.amount);
  bridgeStats.lastUpdated = getTimestampFromEvent(event);
  bridgeStats.save();
  
  // Update chain stats
  let chainStats = getOrCreateChainStats(BigInt.fromI32(3888)); // KalyChain
  chainStats.totalTokensIn = chainStats.totalTokensIn.plus(event.params.amount);
  chainStats.lastUpdated = getTimestampFromEvent(event);
  chainStats.save();
  
  // Update daily stats
  let dailyStats = getOrCreateDailyBridgeStats(getTimestampFromEvent(event));
  dailyStats.tokenTransfersCount = dailyStats.tokenTransfersCount.plus(BigInt.fromI32(1));
  dailyStats.tokenTransfersAmount = dailyStats.tokenTransfersAmount.plus(event.params.amount);
  dailyStats.save();
}