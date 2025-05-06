import { BigInt, Bytes, dataSource } from "@graphprotocol/graph-ts";
import {
  SentTransferRemote as SentTransferRemoteEvent,
  ReceivedTransferRemote as ReceivedTransferRemoteEvent,
  HypNative
} from "../generated/templates/HypNative/HypNative";
import { Token, TokenTransfer } from "../generated/schema";
import {
  getOrCreateBridgeStats,
  getOrCreateChainStats,
  getOrCreateDailyBridgeStats,
  formatMessageId,
  formatTransactionHash,
  getTimestampFromEvent
} from "./utils";

function getOrCreateNativeToken(tokenAddress: Bytes): Token {
  let id = tokenAddress.toHexString();
  let token = Token.load(id);

  if (token == null) {
    token = new Token(id);
    token.address = tokenAddress;

    // For native tokens, we need to hardcode some values
    // You may want to customize this based on your specific tokens
    if (tokenAddress.toHexString() == "0x8A1ABbB167b149F2493C8141091028fD812Da6E4") {
      token.name = "KalyCoin";
      token.symbol = "KLC";
      token.decimals = 18;
    } else if (tokenAddress.toHexString() == "0x0e2318b62a096AC68ad2D7F37592CBf0cA9c4Ddb") {
      token.name = "Binance Coin";
      token.symbol = "BNB";
      token.decimals = 18;
    } else if (tokenAddress.toHexString() == "0xfdbB253753dDE60b11211B169dC872AaE672879b") {
      token.name = "Ethereum";
      token.symbol = "ETH";
      token.decimals = 18;
    } else if (tokenAddress.toHexString() == "0x9c3c9283d3e44854697cd22d3faa240cfb032889") {
      token.name = "Polygon";
      token.symbol = "POL";
      token.decimals = 18;
    } else {
      token.name = "Unknown Native Token";
      token.symbol = "???";
      token.decimals = 18;
    }

    token.chainId = BigInt.fromI32(3888); // KalyChain
    token.standard = "HypNative";
    token.totalBridgedOut = BigInt.fromI32(0);
    token.totalBridgedIn = BigInt.fromI32(0);
    token.save();
  }

  return token;
}

export function handleSentTransferRemoteNative(event: SentTransferRemoteEvent): void {
  let token = getOrCreateNativeToken(dataSource.address());
  let transferId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();

  let transfer = new TokenTransfer(transferId);
  // Generate a messageId from the transaction hash and recipient
  let messageId = Bytes.fromHexString(event.transaction.hash.toHexString() + event.params.recipient.toHexString());
  transfer.messageId = messageId;
  transfer.token = token.id;
  transfer.sender = event.transaction.from;
  transfer.recipient = event.params.recipient;
  transfer.amount = event.params.amount;
  transfer.originDomain = BigInt.fromI32(3888); // KalyChain
  transfer.destinationDomain = event.params.destination;
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

export function handleReceivedTransferRemoteNative(event: ReceivedTransferRemoteEvent): void {
  let token = getOrCreateNativeToken(dataSource.address());
  let transferId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();

  let transfer = new TokenTransfer(transferId);
  // Generate a messageId from the transaction hash and recipient
  let messageId = Bytes.fromHexString(event.transaction.hash.toHexString() + event.params.recipient.toHexString());
  transfer.messageId = messageId;
  transfer.token = token.id;
  transfer.sender = Bytes.fromHexString("0x0000000000000000000000000000000000000000"); // We don't know the sender from this event
  transfer.recipient = event.params.recipient;
  transfer.amount = event.params.amount;
  transfer.originDomain = event.params.origin;
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