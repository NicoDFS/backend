import { test, assert } from "matchstick-as/assembly/index";
import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { formatMessageId, formatTransactionHash } from "../src/utils";

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
