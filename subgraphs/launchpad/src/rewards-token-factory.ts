import {
  TokenCreated,
  FeeToUpdated,
  FlatFeeUpdated
} from "../generated/RewardsTokenFactory/RewardsTokenFactory"
import { StandardERC20 } from "../generated/RewardsTokenFactory/StandardERC20"
import {
  TokenFactory,
  Token,
  TokenFactoryManager,
  LaunchpadStats,
  LaunchpadDayData
} from "../generated/schema"
import { BigInt } from "@graphprotocol/graph-ts"

export function handleRewardsTokenCreated(event: TokenCreated): void {
  let factory = TokenFactory.load(event.address.toHexString())
  if (factory == null) {
    factory = new TokenFactory(event.address.toHexString())
    factory.address = event.address
    factory.factoryType = "Rewards"
    factory.manager = "1" // Reference to TokenFactoryManager
    factory.feeTo = event.address // Will be updated by fee events
    factory.flatFee = BigInt.fromI32(0) // Will be updated by fee events
    factory.totalTokensCreated = BigInt.fromI32(0)
    factory.createdAt = event.block.timestamp
  }

  // TokenCreated(tokenAddress, creator, rewardToken, name, symbol, totalSupply) carries no decimals —
  // read them from the token itself instead of assuming.
  let decimalsCall = StandardERC20.bind(event.params.tokenAddress).try_decimals()

  let token = new Token(event.params.tokenAddress.toHexString())
  token.address = event.params.tokenAddress
  token.factory = factory.id
  token.creator = event.params.creator
  token.name = event.params.name
  token.symbol = event.params.symbol
  token.decimals = decimalsCall.reverted ? 18 : decimalsCall.value
  token.totalSupply = event.params.totalSupply
  token.tokenType = "Rewards"
  token.createdAt = event.block.timestamp
  token.blockNumber = event.block.number
  token.transactionHash = event.transaction.hash

  factory.totalTokensCreated = factory.totalTokensCreated.plus(BigInt.fromI32(1))
  factory.updatedAt = event.block.timestamp

  updateLaunchpadStats(event.block.timestamp)
  updateDayData(event.block.timestamp)

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
