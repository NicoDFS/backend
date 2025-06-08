/* eslint-disable prefer-const */
import { BigDecimal, BigInt, ethereum, store } from '@graphprotocol/graph-ts'

import {
  Bundle,
  Pair,
  PairDayData,
  Token,
  TokenDayData,
  KalyswapFactory,
  DayData,
} from '../generated/schema'
import { PairHourData } from '../generated/schema'
import { FACTORY_ADDRESS } from './chain'
import { ONE_BI, ZERO_BD, ZERO_BI } from './constants'

export function updateKalyswapDayData(event: ethereum.Event): DayData {
  let kalyswap = KalyswapFactory.load(FACTORY_ADDRESS)!
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let kalyswapDayData = DayData.load(dayID.toString())
  if (!kalyswapDayData) {
    kalyswapDayData = new DayData(dayID.toString())
    kalyswapDayData.date = dayStartTimestamp
    kalyswapDayData.factory = kalyswap.id
    kalyswapDayData.volumeUSD = ZERO_BD
    kalyswapDayData.volumeKLC = ZERO_BD
    kalyswapDayData.untrackedVolume = ZERO_BD
    kalyswapDayData.liquidityKLC = ZERO_BD
    kalyswapDayData.liquidityUSD = ZERO_BD
    kalyswapDayData.txCount = ZERO_BI
  }

  kalyswapDayData.liquidityUSD = kalyswap.totalLiquidityUSD
  kalyswapDayData.liquidityKLC = kalyswap.totalLiquidityKLC
  kalyswapDayData.txCount = kalyswap.txCount
  kalyswapDayData.save()

  return kalyswapDayData as DayData
}

export function updatePairDayData(pair: Pair, event: ethereum.Event): PairDayData {
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let dayPairID = event.address.toHexString().concat('-').concat(BigInt.fromI32(dayID).toString())
  let pairDayData = PairDayData.load(dayPairID)
  if (!pairDayData) {
    pairDayData = new PairDayData(dayPairID)
    pairDayData.date = dayStartTimestamp
    pairDayData.pair = pair.id
    pairDayData.token0 = pair.token0
    pairDayData.token1 = pair.token1
    pairDayData.volumeToken0 = ZERO_BD
    pairDayData.volumeToken1 = ZERO_BD
    pairDayData.volumeUSD = ZERO_BD
    pairDayData.txCount = ZERO_BI
  }

  pairDayData.totalSupply = pair.totalSupply
  pairDayData.reserve0 = pair.reserve0
  pairDayData.reserve1 = pair.reserve1
  pairDayData.reserveUSD = pair.reserveUSD
  pairDayData.txCount = pairDayData.txCount.plus(ONE_BI)
  pairDayData.save()

  return pairDayData as PairDayData
}

export function updatePairHourData(pair: Pair, event: ethereum.Event): PairHourData {
  let timestamp = event.block.timestamp.toI32()
  let hourIndex = timestamp / 3600 // get unique hour within unix history
  let hourStartUnix = hourIndex * 3600 // want the rounded effect
  let hourPairID = event.address.toHexString().concat('-').concat(BigInt.fromI32(hourIndex).toString())
  let pairHourData = PairHourData.load(hourPairID)
  if (!pairHourData) {
    pairHourData = new PairHourData(hourPairID)
    pairHourData.hourStartUnix = hourStartUnix
    pairHourData.pair = event.address.toHexString()
    pairHourData.hourlyVolumeToken0 = ZERO_BD
    pairHourData.hourlyVolumeToken1 = ZERO_BD
    pairHourData.hourlyVolumeUSD = ZERO_BD
    pairHourData.hourlyTxns = ZERO_BI
  }

  pairHourData.totalSupply = pair.totalSupply
  pairHourData.reserve0 = pair.reserve0
  pairHourData.reserve1 = pair.reserve1
  pairHourData.reserveUSD = pair.reserveUSD
  pairHourData.hourlyTxns = pairHourData.hourlyTxns.plus(ONE_BI)
  pairHourData.save()

  return pairHourData as PairHourData
}

export function updateTokenDayData(token: Token, event: ethereum.Event): TokenDayData {
  let bundle = Bundle.load('1')!
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let tokenDayID = token.id.toString().concat('-').concat(BigInt.fromI32(dayID).toString())

  let tokenDayData = TokenDayData.load(tokenDayID)
  if (!tokenDayData) {
    tokenDayData = new TokenDayData(tokenDayID)
    tokenDayData.date = dayStartTimestamp
    tokenDayData.token = token.id
    tokenDayData.priceUSD = token.derivedKLC.times(bundle.klcPrice)
    tokenDayData.volume = ZERO_BD
    tokenDayData.volumeKLC = ZERO_BD
    tokenDayData.volumeUSD = ZERO_BD
    tokenDayData.txCount = ZERO_BI
    tokenDayData.liquidityKLC = ZERO_BD
    tokenDayData.liquidityUSD = ZERO_BD
  }
  tokenDayData.priceUSD = token.derivedKLC.times(bundle.klcPrice)
  tokenDayData.liquidityKLC = token.totalLiquidity.times(token.derivedKLC as BigDecimal)
  tokenDayData.liquidityUSD = tokenDayData.liquidityKLC.times(bundle.klcPrice)
  tokenDayData.txCount = tokenDayData.txCount.plus(ONE_BI)
  tokenDayData.save()

  return tokenDayData as TokenDayData
}
