import { test, assert } from "matchstick-as/assembly/index";
import { BigInt, Bytes, Address, ethereum } from "@graphprotocol/graph-ts";
import { formatMessageId, formatTransactionHash } from "../src/utils";

// Mock event for testing
function createMockEvent(): ethereum.Event {
  let mockEvent = new ethereum.Event(
    Bytes.fromHexString("0x1234567890123456789012345678901234567890123456789012345678901234"),
    BigInt.fromI32(1),
    BigInt.fromI32(0),
    "Mailbox",
    Address.fromString("0x0000000000000000000000000000000000000000"),
    new Array<ethereum.EventParam>(),
    null
  );
  mockEvent.block.timestamp = BigInt.fromI32(1625097600); // July 1, 2021
  return mockEvent;
}

test("formatMessageId formats message ID correctly", () => {
  const messageId = Bytes.fromHexString("0x1234567890123456789012345678901234567890123456789012345678901234");
  const formattedId = formatMessageId(messageId);
  assert.stringEquals("0x1234567890123456789012345678901234567890123456789012345678901234", formattedId);
});

test("formatTransactionHash formats transaction hash correctly", () => {
  const txHash = Bytes.fromHexString("0x1234567890123456789012345678901234567890123456789012345678901234");
  const formattedHash = formatTransactionHash(txHash);
  assert.stringEquals("0x1234567890123456789012345678901234567890123456789012345678901234", formattedHash);
});
