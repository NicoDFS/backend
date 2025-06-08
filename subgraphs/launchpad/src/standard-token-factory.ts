import { 
  TokenCreated,
  FeeToUpdated,
  FlatFeeUpdated
} from "../generated/StandardTokenFactory/StandardTokenFactory"
import { 
  TokenFactory,
  Token,
  TokenFactoryManager,
  LaunchpadStats,
  LaunchpadDayData
} from "../generated/schema"
import { BigInt } from "@graphprotocol/graph-ts"

export function handleStandardTokenCreated(event: TokenCreated): void {
  // Load or create factory
  let factory = TokenFactory.load(event.address.toHexString())
  if (factory == null) {
    factory = new TokenFactory(event.address.toHexString())
    factory.address = event.address
    factory.factoryType = "Standard"
    factory.manager = "1" // Reference to TokenFactoryManager
    factory.feeTo = event.address // Will be updated by fee events
    factory.flatFee = BigInt.fromI32(0) // Will be updated by fee events
    factory.totalTokensCreated = BigInt.fromI32(0)
    factory.createdAt = event.block.timestamp
  }
  
  // Create token entity
  let token = new Token(event.params.tokenAddress.toHexString())
  token.address = event.params.tokenAddress
  token.factory = factory.id
  token.creator = event.params.creator
  token.name = event.params.name
  token.symbol = event.params.symbol
  token.decimals = event.params.decimals
  token.totalSupply = event.params.totalSupply
  token.tokenType = "Standard"
  token.createdAt = event.block.timestamp
  token.blockNumber = event.block.number
  token.transactionHash = event.transaction.hash
  
  // Update factory stats
  factory.totalTokensCreated = factory.totalTokensCreated.plus(BigInt.fromI32(1))
  factory.updatedAt = event.block.timestamp
  
  // Update global stats
  updateLaunchpadStats(event.block.timestamp)
  updateDayData(event.block.timestamp)
  
  // Update manager stats
  let manager = TokenFactoryManager.load("1")
  if (manager != null) {
    manager.totalTokensCreated = manager.totalTokensCreated.plus(BigInt.fromI32(1))
    manager.updatedAt = event.block.timestamp
    manager.save()
  }
  
  token.save()
  factory.save()
}

export function handleFeeToUpdated(event: FeeToUpdated): void {
  let factory = TokenFactory.load(event.address.toHexString())
  if (factory != null) {
    factory.feeTo = event.params.newFeeTo
    factory.updatedAt = event.block.timestamp
    factory.save()
  }
}

export function handleFlatFeeUpdated(event: FlatFeeUpdated): void {
  let factory = TokenFactory.load(event.address.toHexString())
  if (factory != null) {
    factory.flatFee = event.params.newFee
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
