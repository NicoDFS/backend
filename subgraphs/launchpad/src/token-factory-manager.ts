import { OwnershipTransferred } from "../generated/TokenFactoryManager/TokenFactoryManager"
import { TokenFactoryManager } from "../generated/schema"
import { Address, BigInt } from "@graphprotocol/graph-ts"

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  let manager = TokenFactoryManager.load("1")
  
  if (manager == null) {
    manager = new TokenFactoryManager("1")
    manager.address = event.address
    manager.allowedFactories = []
    manager.totalTokensCreated = BigInt.fromI32(0)
    manager.createdAt = event.block.timestamp
  }
  
  manager.owner = event.params.newOwner
  manager.updatedAt = event.block.timestamp
  
  manager.save()
}
