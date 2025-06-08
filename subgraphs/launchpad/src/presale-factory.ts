import { ethereum } from "@graphprotocol/graph-ts"
import {
  PresaleFactory,
  Presale,
  Token,
  LaunchpadStats,
  LaunchpadDayData
} from "../generated/schema"
import { BigInt, Address } from "@graphprotocol/graph-ts"

export function handlePresaleCreated(call: ethereum.Call): void {
  // Load or create factory
  let factory = PresaleFactory.load(call.to.toHexString())
  if (factory == null) {
    factory = new PresaleFactory(call.to.toHexString())
    factory.address = call.to
    factory.feeTo = Address.zero()
    factory.flatFee = BigInt.fromI32(0)
    factory.totalPresalesCreated = BigInt.fromI32(0)
    factory.createdAt = call.block.timestamp
  }

  // Since we can't easily extract call parameters, we'll create a placeholder presale
  // In a real implementation, you'd need to parse the transaction logs or use events
  let presaleId = call.transaction.hash.toHexString() + "-" + call.block.number.toString()
  let presale = new Presale(presaleId)
  presale.address = Address.zero() // Placeholder - would need actual presale address
  presale.factory = factory.id
  presale.creator = call.from
  presale.saleToken = Address.zero().toHexString() // Placeholder
  presale.baseToken = Address.zero() // Placeholder
  presale.presaleRate = BigInt.fromI32(0) // Placeholder
  presale.listingRate = BigInt.fromI32(0) // Placeholder
  presale.softCap = BigInt.fromI32(0) // Placeholder
  presale.hardCap = BigInt.fromI32(0) // Placeholder
  presale.liquidityPercent = BigInt.fromI32(0) // Placeholder
  presale.presaleStart = BigInt.fromI32(0) // Placeholder
  presale.presaleEnd = BigInt.fromI32(0) // Placeholder
  presale.status = "Active"
  presale.totalRaised = BigInt.fromI32(0)
  presale.totalParticipants = BigInt.fromI32(0)
  presale.createdAt = call.block.timestamp
  presale.blockNumber = call.block.number
  presale.transactionHash = call.transaction.hash

  // Update factory stats
  factory.totalPresalesCreated = factory.totalPresalesCreated.plus(BigInt.fromI32(1))
  factory.updatedAt = call.block.timestamp

  // Update global stats
  updateLaunchpadStats(call.block.timestamp)
  updateDayData(call.block.timestamp)

  // Note: Individual presale contract events would be tracked here if ABIs were available

  presale.save()
  factory.save()
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
  
  stats.totalPresalesCreated = stats.totalPresalesCreated.plus(BigInt.fromI32(1))
  stats.activePresales = stats.activePresales.plus(BigInt.fromI32(1))
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
  
  dayData.totalPresalesCreated = dayData.totalPresalesCreated.plus(BigInt.fromI32(1))
  dayData.activePresales = dayData.activePresales.plus(BigInt.fromI32(1))
  dayData.save()
}
