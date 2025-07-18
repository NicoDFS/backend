import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  Dispatch as DispatchEvent,
  Process as ProcessEvent
} from "../generated/Mailbox/Mailbox";
import { BridgeMessage } from "../generated/schema";
import {
  getOrCreateBridgeStats,
  getOrCreateChainStats,
  getOrCreateDailyBridgeStats,
  formatMessageId,
  formatTransactionHash,
  getTimestampFromEvent
} from "./utils";

export function handleDispatch(event: DispatchEvent): void {
  // Get the messageId from the DispatchId event
  // Since the Dispatch event doesn't have messageId directly, we'll use the recipient as the ID
  let messageId = formatMessageId(event.params.recipient);

  let message = new BridgeMessage(messageId);
  message.messageId = event.params.recipient; // Using recipient as messageId
  message.originDomain = BigInt.fromI32(3888); // KalyChain domain ID
  message.destinationDomain = event.params.destination;
  message.sender = event.params.sender;
  message.recipient = Bytes.fromHexString("0x0000000000000000000000000000000000000000"); // Will be updated in Process event
  message.messageBody = event.params.message;
  message.status = "dispatched";
  message.dispatchTxHash = formatTransactionHash(event.transaction.hash);
  message.dispatchTimestamp = getTimestampFromEvent(event);
  message.deliveryTxHash = null;
  message.deliveryTimestamp = null;
  message.gasAmount = null;
  message.gasPayment = null;
  message.token = null;
  message.amount = null;
  message.save();

  // Update bridge stats
  let bridgeStats = getOrCreateBridgeStats();
  bridgeStats.totalMessages = bridgeStats.totalMessages.plus(BigInt.fromI32(1));
  bridgeStats.lastUpdated = getTimestampFromEvent(event);
  bridgeStats.save();

  // Update chain stats for origin chain
  let originChainStats = getOrCreateChainStats(BigInt.fromI32(3888)); // KalyChain domain ID
  originChainStats.totalMessagesOut = originChainStats.totalMessagesOut.plus(BigInt.fromI32(1));
  originChainStats.lastUpdated = getTimestampFromEvent(event);
  originChainStats.save();

  // Update daily stats
  let dailyStats = getOrCreateDailyBridgeStats(getTimestampFromEvent(event));
  dailyStats.messagesCount = dailyStats.messagesCount.plus(BigInt.fromI32(1));
  dailyStats.save();
}

export function handleProcess(event: ProcessEvent): void {
  // In Process event, we use sender as the messageId to match with the Dispatch event
  let messageId = formatMessageId(event.params.sender);

  let message = BridgeMessage.load(messageId);

  if (message) {
    message.status = "delivered";
    message.recipient = event.params.recipient;
    message.deliveryTxHash = formatTransactionHash(event.transaction.hash);
    message.deliveryTimestamp = getTimestampFromEvent(event);
    message.save();

    // Update bridge stats
    let bridgeStats = getOrCreateBridgeStats();
    bridgeStats.totalMessagesDelivered = bridgeStats.totalMessagesDelivered.plus(BigInt.fromI32(1));
    bridgeStats.lastUpdated = getTimestampFromEvent(event);
    bridgeStats.save();

    // Update chain stats for destination chain
    let destChainStats = getOrCreateChainStats(event.params.origin);
    destChainStats.totalMessagesIn = destChainStats.totalMessagesIn.plus(BigInt.fromI32(1));
    destChainStats.lastUpdated = getTimestampFromEvent(event);
    destChainStats.save();

    // Update daily stats
    let dailyStats = getOrCreateDailyBridgeStats(getTimestampFromEvent(event));
    dailyStats.messagesDeliveredCount = dailyStats.messagesDeliveredCount.plus(BigInt.fromI32(1));
    dailyStats.save();
  }
}