import {
  OwnershipTransferred
} from "../generated/LiquidityGeneratorTokenFactory/LiquidityGeneratorTokenFactory"
import {
  TokenFactory,
  Token,
  TokenFactoryManager,
  LaunchpadStats,
  LaunchpadDayData
} from "../generated/schema"
import { BigInt, ethereum, Address } from "@graphprotocol/graph-ts"

export function handleLiquidityGeneratorTokenCreated(call: ethereum.Call): void {
  // Load or create factory
  let factory = TokenFactory.load(call.to.toHexString())
  if (factory == null) {
    factory = new TokenFactory(call.to.toHexString())
    factory.address = call.to
    factory.factoryType = "LiquidityGenerator"
    factory.manager = "1" // Reference to TokenFactoryManager
    factory.feeTo = Address.zero()
    factory.flatFee = BigInt.fromI32(0)
    factory.totalTokensCreated = BigInt.fromI32(0)
    factory.createdAt = call.block.timestamp
  }

  // Since we can't easily extract call parameters, we'll create a placeholder token
  // In a real implementation, you'd need to parse the transaction logs or use events
  let tokenId = call.transaction.hash.toHexString() + "-" + call.block.number.toString()
  let token = new Token(tokenId)
  token.address = Address.zero() // Placeholder - would need actual token address
  token.factory = factory.id
  token.creator = call.from
  token.name = "LiquidityGeneratorToken" // Placeholder
  token.symbol = "LGT" // Placeholder
  token.decimals = 18
  token.totalSupply = BigInt.fromI32(0) // Placeholder
  token.tokenType = "LiquidityGenerator"
  token.createdAt = call.block.timestamp
  token.blockNumber = call.block.number
  token.transactionHash = call.transaction.hash

  // Update factory stats
  factory.totalTokensCreated = factory.totalTokensCreated.plus(BigInt.fromI32(1))
  factory.updatedAt = call.block.timestamp

  // Update global stats
  updateLaunchpadStats(call.block.timestamp)
  updateDayData(call.block.timestamp)

  // Update manager stats
  let manager = TokenFactoryManager.load("1")
  if (manager != null) {
    manager.totalTokensCreated = manager.totalTokensCreated.plus(BigInt.fromI32(1))
    manager.updatedAt = call.block.timestamp
    manager.save()
  }

  token.save()
  factory.save()
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  let factory = TokenFactory.load(event.address.toHexString())
  if (factory != null) {
    factory.updatedAt = event.block.timestamp
    factory.save()
  }
}

function updateLaunchpadStats(timestamp: BigInt): void {
  let stats = LaunchpadStats.load("1")
  if (stats == null) {
    stats = new LaunchpadStats("1")
    stats.totalTokensCreated = BigInt.fromI32(0)
    stats.totalPresalesCreated = BigInt.fromI32(0)
    stats.totalFairlaunchesCreated = BigInt.fromI32(0)
    stats.totalVolumeRaised = BigInt.fromI32(0)
    stats.totalParticipants = BigInt.fromI32(0)
    stats.activePresales = BigInt.fromI32(0)
    stats.activeFairlaunches = BigInt.fromI32(0)
  }
  
  stats.totalTokensCreated = stats.totalTokensCreated.plus(BigInt.fromI32(1))
  stats.lastUpdated = timestamp
  stats.save()
}

function updateDayData(timestamp: BigInt): void {
  let dayID = timestamp.toI32() / 86400
  let dayData = LaunchpadDayData.load(dayID.toString())
  
  if (dayData == null) {
    dayData = new LaunchpadDayData(dayID.toString())
    dayData.date = dayID
    dayData.totalTokensCreated = BigInt.fromI32(0)
    dayData.totalPresalesCreated = BigInt.fromI32(0)
    dayData.totalFairlaunchesCreated = BigInt.fromI32(0)
    dayData.totalVolumeRaised = BigInt.fromI32(0)
    dayData.activePresales = BigInt.fromI32(0)
    dayData.activeFairlaunches = BigInt.fromI32(0)
  }
  
  dayData.totalTokensCreated = dayData.totalTokensCreated.plus(BigInt.fromI32(1))
  dayData.save()
}
