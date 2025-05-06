import { BigInt } from "@graphprotocol/graph-ts";
import {
  GasPayment as GasPaymentEvent
} from "../generated/InterchainGasPaymaster/InterchainGasPaymaster";
import { BridgeMessage, GasPayment } from "../generated/schema";
import {
  getOrCreateBridgeStats,
  getOrCreateChainStats,
  getOrCreateDailyBridgeStats,
  formatMessageId,
  formatTransactionHash,
  getTimestampFromEvent
} from "./utils";

export function handleGasPayment(event: GasPaymentEvent): void {
  let messageId = formatMessageId(event.params.messageId);
  let paymentId = messageId + "-" + event.transaction.hash.toHexString();
  
  let payment = new GasPayment(paymentId);
  payment.messageId = event.params.messageId;
  payment.destinationDomain = BigInt.fromI32(event.params.destinationDomain);
  payment.gasAmount = event.params.gasAmount;
  payment.payment = event.params.payment;
  payment.payer = event.transaction.from;
  payment.timestamp = getTimestampFromEvent(event);
  payment.txHash = formatTransactionHash(event.transaction.hash);
  payment.save();
  
  // Update the bridge message if it exists
  let message = BridgeMessage.load(messageId);
  if (message) {
    message.gasAmount = event.params.gasAmount;
    message.gasPayment = event.params.payment;
    message.save();
  }
  
  // Update bridge stats
  let bridgeStats = getOrCreateBridgeStats();
  bridgeStats.totalGasPayments = bridgeStats.totalGasPayments.plus(BigInt.fromI32(1));
  bridgeStats.lastUpdated = getTimestampFromEvent(event);
  bridgeStats.save();
  
  // Update chain stats for destination chain
  let destChainStats = getOrCreateChainStats(BigInt.fromI32(event.params.destinationDomain));
  destChainStats.totalGasPayments = destChainStats.totalGasPayments.plus(BigInt.fromI32(1));
  destChainStats.lastUpdated = getTimestampFromEvent(event);
  destChainStats.save();
  
  // Update daily stats
  let dailyStats = getOrCreateDailyBridgeStats(getTimestampFromEvent(event));
  dailyStats.gasPaymentsCount = dailyStats.gasPaymentsCount.plus(BigInt.fromI32(1));
  dailyStats.gasPaymentsAmount = dailyStats.gasPaymentsAmount.plus(event.params.payment);
  dailyStats.save();
}