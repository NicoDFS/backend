import {
  FairlaunchCreated,
  FeeToUpdated,
  FlatFeeUpdated
} from "../generated/FairlaunchFactory/FairlaunchFactory"
import {
  FairlaunchFactory,
  Fairlaunch,
  Token,
  LaunchpadStats,
  LaunchpadDayData
} from "../generated/schema"
import { BigInt, Address } from "@graphprotocol/graph-ts"

export function handleFairlaunchCreated(event: FairlaunchCreated): void {
  // Load or create factory
  let factory = FairlaunchFactory.load(event.address.toHexString())
  if (factory == null) {
    factory = new FairlaunchFactory(event.address.toHexString())
    factory.address = event.address
    factory.feeTo = Address.zero()
    factory.flatFee = BigInt.fromI32(0)
    factory.totalFairlaunchesCreated = BigInt.fromI32(0)
    factory.createdAt = event.block.timestamp
  }

  // Create fairlaunch entity
  let fairlaunch = new Fairlaunch(event.params.fairlaunch.toHexString())
  fairlaunch.address = event.params.fairlaunch
  fairlaunch.factory = factory.id
  fairlaunch.creator = event.params.creator
  fairlaunch.saleToken = event.params.saleToken.toHexString()
  fairlaunch.baseToken = event.params.baseToken
  fairlaunch.softCap = event.params.softCap
  fairlaunch.maxSpendPerBuyer = BigInt.fromI32(0) // Not available in event, will be set later
  fairlaunch.liquidityPercent = BigInt.fromI32(0) // Not available in event, will be set later
  fairlaunch.presaleStart = BigInt.fromI32(0) // Not available in event, will be set later
  fairlaunch.presaleEnd = BigInt.fromI32(0) // Not available in event, will be set later
  fairlaunch.status = "Active"
  fairlaunch.totalRaised = BigInt.fromI32(0)
  fairlaunch.totalParticipants = BigInt.fromI32(0)
  fairlaunch.createdAt = event.block.timestamp
  fairlaunch.blockNumber = event.block.number
  fairlaunch.transactionHash = event.transaction.hash

  // Update factory stats
  factory.totalFairlaunchesCreated = factory.totalFairlaunchesCreated.plus(BigInt.fromI32(1))
  factory.updatedAt = event.block.timestamp

  // Update global stats
  updateLaunchpadStats(event.block.timestamp)
  updateDayData(event.block.timestamp)

  // Note: Individual fairlaunch contract events would be tracked here if ABIs were available

  fairlaunch.save()
  factory.save()
}

export function handleFeeToUpdated(event: FeeToUpdated): void {
  let factory = FairlaunchFactory.load(event.address.toHexString())
  if (factory != null) {
    factory.feeTo = event.params.newFeeTo
    factory.updatedAt = event.block.timestamp
    factory.save()
  }
}

export function handleFlatFeeUpdated(event: FlatFeeUpdated): void {
  let factory = FairlaunchFactory.load(event.address.toHexString())
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
  
  stats.totalFairlaunchesCreated = stats.totalFairlaunchesCreated.plus(BigInt.fromI32(1))
  stats.activeFairlaunches = stats.activeFairlaunches.plus(BigInt.fromI32(1))
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
  
  dayData.totalFairlaunchesCreated = dayData.totalFairlaunchesCreated.plus(BigInt.fromI32(1))
  dayData.activeFairlaunches = dayData.activeFairlaunches.plus(BigInt.fromI32(1))
  dayData.save()
}
