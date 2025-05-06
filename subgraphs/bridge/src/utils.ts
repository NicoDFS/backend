import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { BridgeStats, ChainStats, DailyBridgeStats } from "../generated/schema";

export function getOrCreateBridgeStats(): BridgeStats {
  let stats = BridgeStats.load("1");
  
  if (stats == null) {
    stats = new BridgeStats("1");
    stats.totalMessages = BigInt.fromI32(0);
    stats.totalMessagesDelivered = BigInt.fromI32(0);
    stats.totalGasPayments = BigInt.fromI32(0);
    stats.totalTokenTransfers = BigInt.fromI32(0);
    stats.totalTokensOut = BigInt.fromI32(0);
    stats.totalTokensIn = BigInt.fromI32(0);
    stats.lastUpdated = BigInt.fromI32(0);
    stats.save();
  }
  
  return stats;
}

export function getOrCreateChainStats(chainId: BigInt): ChainStats {
  let id = chainId.toString();
  let stats = ChainStats.load(id);
  
  if (stats == null) {
    stats = new ChainStats(id);
    stats.chainId = chainId;
    stats.totalMessagesOut = BigInt.fromI32(0);
    stats.totalMessagesIn = BigInt.fromI32(0);
    stats.totalGasPayments = BigInt.fromI32(0);
    stats.totalTokensOut = BigInt.fromI32(0);
    stats.totalTokensIn = BigInt.fromI32(0);
    stats.lastUpdated = BigInt.fromI32(0);
    stats.save();
  }
  
  return stats;
}

export function getOrCreateDailyBridgeStats(timestamp: BigInt): DailyBridgeStats {
  // Create a unique ID based on the day
  let day = timestamp.toI32() / 86400; // 86400 seconds in a day
  let id = day.toString();
  
  let stats = DailyBridgeStats.load(id);
  
  if (stats == null) {
    stats = new DailyBridgeStats(id);
    let date = new Date(timestamp.toI32() * 1000);
    stats.date = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    stats.messagesCount = BigInt.fromI32(0);
    stats.messagesDeliveredCount = BigInt.fromI32(0);
    stats.gasPaymentsCount = BigInt.fromI32(0);
    stats.gasPaymentsAmount = BigInt.fromI32(0);
    stats.tokenTransfersCount = BigInt.fromI32(0);
    stats.tokenTransfersAmount = BigInt.fromI32(0);
    stats.save();
  }
  
  return stats;
}

export function formatMessageId(messageId: Bytes): string {
  return messageId.toHexString();
}

export function formatTransactionHash(txHash: Bytes): Bytes {
  return txHash;
}

export function getTimestampFromEvent(event: ethereum.Event): BigInt {
  return event.block.timestamp;
}

export function getDomainFromChainId(chainId: BigInt): BigInt {
  // This is a simplified mapping - you may need to adjust based on your actual domain IDs
  if (chainId.equals(BigInt.fromI32(3888))) {
    return BigInt.fromI32(3888); // KalyChain
  } else if (chainId.equals(BigInt.fromI32(56))) {
    return BigInt.fromI32(56); // BSC
  } else if (chainId.equals(BigInt.fromI32(1))) {
    return BigInt.fromI32(1); // Ethereum
  } else if (chainId.equals(BigInt.fromI32(137))) {
    return BigInt.fromI32(137); // Polygon
  } else if (chainId.equals(BigInt.fromI32(42161))) {
    return BigInt.fromI32(42161); // Arbitrum
  }
  
  return chainId; // Default to chainId if no mapping exists
}