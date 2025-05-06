import {
  ValidatorAnnouncement as ValidatorAnnouncementEvent
} from "../generated/ValidatorAnnounce/ValidatorAnnounce";
import { Validator } from "../generated/schema";
import {
  formatTransactionHash,
  getTimestampFromEvent
} from "./utils";

export function handleAnnouncement(event: ValidatorAnnouncementEvent): void {
  let validatorId = event.params.validator.toHexString();

  let validator = new Validator(validatorId);
  validator.address = event.params.validator;
  validator.storageLocation = event.params.storageLocation;
  validator.announcedAt = getTimestampFromEvent(event);
  validator.txHash = formatTransactionHash(event.transaction.hash);
  validator.save();
}