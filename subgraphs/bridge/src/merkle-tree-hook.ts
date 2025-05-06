import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  InsertedIntoTree as InsertedIntoTreeEvent
} from "../generated/MerkleTreeHook/MerkleTreeHook";
import { BridgeMessage } from "../generated/schema";
import {
  getOrCreateBridgeStats,
  getOrCreateDailyBridgeStats,
  formatMessageId,
  formatTransactionHash,
  getTimestampFromEvent
} from "./utils";

export function handleInsertedIntoTree(event: InsertedIntoTreeEvent): void {
  let messageId = formatMessageId(event.params.messageId);

  // Try to find an existing message
  let message = BridgeMessage.load(messageId);

  if (message) {
    // Update the message with the merkle tree index
    message.status = "in_merkle_tree";
    message.save();
  } else {
    // If the message doesn't exist yet (which is unusual), create a placeholder
    message = new BridgeMessage(messageId);
    message.messageId = event.params.messageId;
    message.sender = event.transaction.from;
    message.recipient = event.transaction.from; // Placeholder, will be updated when Process event is received
    message.originDomain = BigInt.fromI32(0); // Placeholder
    message.destinationDomain = BigInt.fromI32(0); // Placeholder
    message.messageBody = Bytes.fromHexString("0x"); // Empty bytes as placeholder
    message.status = "in_merkle_tree";
    message.dispatchTxHash = formatTransactionHash(event.transaction.hash);
    message.dispatchTimestamp = getTimestampFromEvent(event);
    message.deliveryTxHash = null;
    message.deliveryTimestamp = null;
    message.gasAmount = null;
    message.gasPayment = null;
    message.token = null;
    message.amount = null;
    message.save();
  }

  // Update bridge stats
  let bridgeStats = getOrCreateBridgeStats();
  bridgeStats.lastUpdated = getTimestampFromEvent(event);
  bridgeStats.save();

  // Update daily stats
  let dailyStats = getOrCreateDailyBridgeStats(getTimestampFromEvent(event));
  dailyStats.save();
}