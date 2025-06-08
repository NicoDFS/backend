/* eslint-disable prefer-const */
import { BigDecimal, BigInt, store } from '@graphprotocol/graph-ts'

import {
  Bundle,
  Burn as BurnEvent,
  Mint as MintEvent,
  Pair,
  Swap as SwapEvent,
  Token,
  Transaction,
  KalyswapFactory,
} from '../generated/schema'
import { Burn, Mint, Swap, Sync, Transfer } from '../generated/templates/Pair/Pair'
import { FACTORY_ADDRESS } from './chain'
import { ADDRESS_ZERO, BI_18, ONE_BI, ZERO_BD } from './constants'
import { convertTokenToDecimal, createUser } from './helpers'
import { findKlcPerToken, getKlcPriceInUSD, getTrackedLiquidityUSD, getTrackedVolumeUSD } from './pricing'
import { updatePairDayData, updatePairHourData, updateKalyswapDayData, updateTokenDayData } from './hourDayUpdates'

function isCompleteMint(mintId: string): boolean {
  return MintEvent.load(mintId)!.sender !== null // sufficient checks
}

export function handleTransfer(event: Transfer): void {
  // ignore initial transfers for first adds
  if (event.params.to.toHexString() == ADDRESS_ZERO && event.params.value.equals(BigInt.fromI32(1000))) {
    return
  }

  let factory = KalyswapFactory.load(FACTORY_ADDRESS)!
  let transactionHash = event.transaction.hash.toHexString()

  // user stats
  let from = event.params.from
  createUser(from)
  let to = event.params.to
  createUser(to)

  // get pair and load contract
  let pair = Pair.load(event.address.toHexString())!

  // liquidity token amount being transfered
  let value = convertTokenToDecimal(event.params.value, BI_18)

  // get or create transaction
  let transaction = Transaction.load(transactionHash)
  if (transaction === null) {
    transaction = new Transaction(transactionHash)
    transaction.blockNumber = event.block.number
    transaction.timestamp = event.block.timestamp
    transaction.mints = []
    transaction.burns = []
    transaction.swaps = []
  }

  // mints
  let mints = transaction.mints
  if (from.toHexString() == ADDRESS_ZERO) {
    // update total supply
    pair.totalSupply = pair.totalSupply.plus(value)
    pair.save()

    // create new mint if no mints so far or if last one is done already
    if (mints.length === 0 || isCompleteMint(mints[mints.length - 1])) {
      let mint = new MintEvent(
        event.transaction.hash.toHexString().concat('-').concat(BigInt.fromI32(mints.length).toString())
      )
      mint.transaction = transaction.id
      mint.pair = pair.id
      mint.to = to
      mint.liquidity = value
      mint.timestamp = transaction.timestamp
      mint.transaction = transaction.id
      mint.save()

      // update mints in transaction
      transaction.mints = mints.concat([mint.id])

      // save entities
      transaction.save()
      factory.save()
    }
  }

  // case where direct send first on KLC withdrawls
  if (event.params.to.toHexString() == pair.id) {
    let burns = transaction.burns
    let burn = new BurnEvent(
      event.transaction.hash.toHexString().concat('-').concat(BigInt.fromI32(burns.length).toString())
    )
    burn.transaction = transaction.id
    burn.pair = pair.id
    burn.liquidity = value
    burn.timestamp = transaction.timestamp
    burn.to = event.params.to
    burn.sender = event.params.from
    burn.needsComplete = true
    burn.transaction = transaction.id
    burn.save()

    burns.push(burn.id)
    transaction.burns = burns
    transaction.save()
  }

  // burn
  if (event.params.to.toHexString() == ADDRESS_ZERO && event.params.from.toHexString() == pair.id) {
    pair.totalSupply = pair.totalSupply.minus(value)
    pair.save()

    // this is a new instance of a logical burn
    let burns = transaction.burns
    let burn: BurnEvent
    if (burns.length > 0) {
      let currentBurn = BurnEvent.load(burns[burns.length - 1])!
      if (currentBurn.needsComplete) {
        burn = currentBurn as BurnEvent
      } else {
        burn = new BurnEvent(
          event.transaction.hash.toHexString().concat('-').concat(BigInt.fromI32(burns.length).toString())
        )
        burn.transaction = transaction.id
        burn.needsComplete = false
        burn.pair = pair.id
        burn.liquidity = value
        burn.transaction = transaction.id
        burn.timestamp = transaction.timestamp
      }
    } else {
      burn = new BurnEvent(
        event.transaction.hash.toHexString().concat('-').concat(BigInt.fromI32(burns.length).toString())
      )
      burn.transaction = transaction.id
      burn.needsComplete = false
      burn.pair = pair.id
      burn.liquidity = value
      burn.transaction = transaction.id
      burn.timestamp = transaction.timestamp
    }

    // if this logical burn included a fee mint, account for this
    if (mints.length !== 0 && !isCompleteMint(mints[mints.length - 1])) {
      let mint = MintEvent.load(mints[mints.length - 1])!
      burn.feeTo = mint.to
      burn.feeLiquidity = mint.liquidity
      // remove the logical mint
      store.remove('Mint', mints[mints.length - 1])
      mints.pop()
      transaction.mints = mints
      transaction.save()
    }
    burn.save()
    // if accessing last one, replace it
    if (burn.needsComplete) {
      burns[burns.length - 1] = burn.id
    }
    // else add new one
    else {
      burns.push(burn.id)
    }
    transaction.burns = burns
    transaction.save()
  }

  transaction.save()
}

export function handleSync(event: Sync): void {
  let pair = Pair.load(event.address.toHex())!
  let token0 = Token.load(pair.token0)
  let token1 = Token.load(pair.token1)
  if (token0 === null || token1 === null) {
    return
  }
  let kalyswap = KalyswapFactory.load(FACTORY_ADDRESS)!

  // reset factory liquidity by subtracting only tracked liquidity
  kalyswap.totalLiquidityKLC = kalyswap.totalLiquidityKLC.minus(pair.trackedReserveKLC as BigDecimal)

  // reset token total liquidity amounts
  token0.totalLiquidity = token0.totalLiquidity.minus(pair.reserve0)
  token1.totalLiquidity = token1.totalLiquidity.minus(pair.reserve1)

  pair.reserve0 = convertTokenToDecimal(event.params.reserve0, token0.decimals)
  pair.reserve1 = convertTokenToDecimal(event.params.reserve1, token1.decimals)

  if (pair.reserve1.notEqual(ZERO_BD)) pair.token0Price = pair.reserve0.div(pair.reserve1)
  else pair.token0Price = ZERO_BD
  if (pair.reserve0.notEqual(ZERO_BD)) pair.token1Price = pair.reserve1.div(pair.reserve0)
  else pair.token1Price = ZERO_BD

  pair.save()

  // update KLC price now that reserves could have changed
  let bundle = Bundle.load('1')!
  bundle.klcPrice = getKlcPriceInUSD()
  bundle.save()

  token0.derivedKLC = findKlcPerToken(token0 as Token)
  token1.derivedKLC = findKlcPerToken(token1 as Token)
  token0.save()
  token1.save()

  // get tracked liquidity - will be 0 if neither is in whitelist
  let trackedLiquidityKLC: BigDecimal
  if (bundle.klcPrice.notEqual(ZERO_BD)) {
    trackedLiquidityKLC = getTrackedLiquidityUSD(pair.reserve0, token0 as Token, pair.reserve1, token1 as Token).div(
      bundle.klcPrice
    )
  } else {
    trackedLiquidityKLC = ZERO_BD
  }

  // use derived amounts within pair
  pair.trackedReserveKLC = trackedLiquidityKLC
  pair.reserveKLC = pair.reserve0
    .times(token0.derivedKLC as BigDecimal)
    .plus(pair.reserve1.times(token1.derivedKLC as BigDecimal))
  pair.reserveUSD = pair.reserveKLC.times(bundle.klcPrice)

  // use tracked amounts globally
  kalyswap.totalLiquidityKLC = kalyswap.totalLiquidityKLC.plus(trackedLiquidityKLC)
  kalyswap.totalLiquidityUSD = kalyswap.totalLiquidityKLC.times(bundle.klcPrice)

  // now correctly set liquidity amounts for each token
  token0.totalLiquidity = token0.totalLiquidity.plus(pair.reserve0)
  token1.totalLiquidity = token1.totalLiquidity.plus(pair.reserve1)

  // save entities
  pair.save()
  kalyswap.save()
  token0.save()
  token1.save()
}

export function handleMint(event: Mint): void {
  let transaction = Transaction.load(event.transaction.hash.toHexString())
  if (transaction === null) {
    return
  }

  let mints = transaction.mints
  let mint = MintEvent.load(mints[mints.length - 1])

  if (mint === null) {
    return
  }

  let pair = Pair.load(event.address.toHex())!
  let kalyswap = KalyswapFactory.load(FACTORY_ADDRESS)!

  let token0 = Token.load(pair.token0)
  let token1 = Token.load(pair.token1)
  if (token0 === null || token1 === null) {
    return
  }

  // update exchange info (except balances, sync will cover that)
  let token0Amount = convertTokenToDecimal(event.params.amount0, token0.decimals)
  let token1Amount = convertTokenToDecimal(event.params.amount1, token1.decimals)

  // update txn counts
  token0.txCount = token0.txCount.plus(ONE_BI)
  token1.txCount = token1.txCount.plus(ONE_BI)

  // get new amounts of USD and KLC for tracking
  let bundle = Bundle.load('1')!
  let amountTotalUSD = token1.derivedKLC
    .times(token1Amount)
    .plus(token0.derivedKLC.times(token0Amount))
    .times(bundle.klcPrice)

  // update txn counts
  pair.txCount = pair.txCount.plus(ONE_BI)
  kalyswap.txCount = kalyswap.txCount.plus(ONE_BI)

  // save entities
  token0.save()
  token1.save()
  pair.save()
  kalyswap.save()

  mint.sender = event.params.sender
  mint.amount0 = token0Amount as BigDecimal
  mint.amount1 = token1Amount as BigDecimal
  mint.logIndex = event.logIndex
  mint.amountUSD = amountTotalUSD as BigDecimal
  mint.save()

  // update day entities
  updatePairDayData(pair, event)
  updatePairHourData(pair, event)
  updateKalyswapDayData(event)
  updateTokenDayData(token0 as Token, event)
  updateTokenDayData(token1 as Token, event)
}

export function handleBurn(event: Burn): void {
  let transaction = Transaction.load(event.transaction.hash.toHexString())

  // safety check
  if (transaction === null) {
    return
  }

  let burns = transaction.burns
  let burn = BurnEvent.load(burns[burns.length - 1])

  if (burn === null) {
    return
  }

  let pair = Pair.load(event.address.toHex())!
  let kalyswap = KalyswapFactory.load(FACTORY_ADDRESS)!

  //update token info
  let token0 = Token.load(pair.token0)
  let token1 = Token.load(pair.token1)
  if (token0 === null || token1 === null) {
    return
  }

  let token0Amount = convertTokenToDecimal(event.params.amount0, token0.decimals)
  let token1Amount = convertTokenToDecimal(event.params.amount1, token1.decimals)

  // update txn counts
  token0.txCount = token0.txCount.plus(ONE_BI)
  token1.txCount = token1.txCount.plus(ONE_BI)

  // get new amounts of USD and KLC for tracking
  let bundle = Bundle.load('1')!
  let amountTotalUSD = token1.derivedKLC
    .times(token1Amount)
    .plus(token0.derivedKLC.times(token0Amount))
    .times(bundle.klcPrice)

  // update txn counts
  kalyswap.txCount = kalyswap.txCount.plus(ONE_BI)
  pair.txCount = pair.txCount.plus(ONE_BI)

  // update global counter and save
  token0.save()
  token1.save()
  pair.save()
  kalyswap.save()

  // update burn
  burn.amount0 = token0Amount as BigDecimal
  burn.amount1 = token1Amount as BigDecimal
  burn.logIndex = event.logIndex
  burn.amountUSD = amountTotalUSD as BigDecimal
  burn.save()

  // update day entities
  updatePairDayData(pair, event)
  updatePairHourData(pair, event)
  updateKalyswapDayData(event)
  updateTokenDayData(token0 as Token, event)
  updateTokenDayData(token1 as Token, event)
}

export function handleSwap(event: Swap): void {
  let pair = Pair.load(event.address.toHexString())!
  let token0 = Token.load(pair.token0)
  let token1 = Token.load(pair.token1)
  if (token0 === null || token1 === null) {
    return
  }
  let amount0In = convertTokenToDecimal(event.params.amount0In, token0.decimals)
  let amount1In = convertTokenToDecimal(event.params.amount1In, token1.decimals)
  let amount0Out = convertTokenToDecimal(event.params.amount0Out, token0.decimals)
  let amount1Out = convertTokenToDecimal(event.params.amount1Out, token1.decimals)

  // totals for volume updates
  let amount0Total = amount0Out.plus(amount0In)
  let amount1Total = amount1Out.plus(amount1In)

  // KLC/USD prices
  let bundle = Bundle.load('1')!

  // get total amounts of derived USD and KLC for tracking
  let derivedAmountKLC = token1.derivedKLC
    .times(amount1Total)
    .plus(token0.derivedKLC.times(amount0Total))
    .div(BigDecimal.fromString('2'))
  let derivedAmountUSD = derivedAmountKLC.times(bundle.klcPrice)

  // only accounts for volume through white listed tokens
  let trackedAmountUSD = getTrackedVolumeUSD(amount0Total, token0 as Token, amount1Total, token1 as Token, pair as Pair)

  let trackedAmountKLC: BigDecimal
  if (bundle.klcPrice.equals(ZERO_BD)) {
    trackedAmountKLC = ZERO_BD
  } else {
    trackedAmountKLC = trackedAmountUSD.div(bundle.klcPrice)
  }

  // update token0 global volume and token liquidity stats
  token0.tradeVolume = token0.tradeVolume.plus(amount0In.plus(amount0Out))
  token0.tradeVolumeUSD = token0.tradeVolumeUSD.plus(trackedAmountUSD)
  token0.untrackedVolumeUSD = token0.untrackedVolumeUSD.plus(derivedAmountUSD)

  // update token1 global volume and token liquidity stats
  token1.tradeVolume = token1.tradeVolume.plus(amount1In.plus(amount1Out))
  token1.tradeVolumeUSD = token1.tradeVolumeUSD.plus(trackedAmountUSD)
  token1.untrackedVolumeUSD = token1.untrackedVolumeUSD.plus(derivedAmountUSD)

  // update txn counts
  token0.txCount = token0.txCount.plus(ONE_BI)
  token1.txCount = token1.txCount.plus(ONE_BI)

  // update pair volume data, use tracked amount if we have it as its probably more accurate
  pair.volumeUSD = pair.volumeUSD.plus(trackedAmountUSD)
  pair.volumeToken0 = pair.volumeToken0.plus(amount0Total)
  pair.volumeToken1 = pair.volumeToken1.plus(amount1Total)
  pair.untrackedVolumeUSD = pair.untrackedVolumeUSD.plus(derivedAmountUSD)
  pair.txCount = pair.txCount.plus(ONE_BI)
  pair.save()

  // update global values, only used tracked amounts for volume
  let kalyswap = KalyswapFactory.load(FACTORY_ADDRESS)!
  kalyswap.totalVolumeUSD = kalyswap.totalVolumeUSD.plus(trackedAmountUSD)
  kalyswap.totalVolumeKLC = kalyswap.totalVolumeKLC.plus(trackedAmountKLC)
  kalyswap.untrackedVolumeUSD = kalyswap.untrackedVolumeUSD.plus(derivedAmountUSD)
  kalyswap.txCount = kalyswap.txCount.plus(ONE_BI)

  // save entities
  pair.save()
  token0.save()
  token1.save()
  kalyswap.save()

  let transaction = Transaction.load(event.transaction.hash.toHexString())
  if (transaction === null) {
    transaction = new Transaction(event.transaction.hash.toHexString())
    transaction.blockNumber = event.block.number
    transaction.timestamp = event.block.timestamp
    transaction.mints = []
    transaction.swaps = []
    transaction.burns = []
  }
  let swaps = transaction.swaps
  let swap = new SwapEvent(
    event.transaction.hash.toHexString().concat('-').concat(BigInt.fromI32(swaps.length).toString())
  )

  // update swap event
  swap.transaction = transaction.id
  swap.pair = pair.id
  swap.timestamp = transaction.timestamp
  swap.transaction = transaction.id
  swap.sender = event.params.sender
  swap.amount0In = amount0In
  swap.amount1In = amount1In
  swap.amount0Out = amount0Out
  swap.amount1Out = amount1Out
  swap.to = event.params.to
  swap.from = event.transaction.from
  swap.logIndex = event.logIndex
  // use the tracked amount if we have it
  swap.amountUSD = trackedAmountUSD === ZERO_BD ? derivedAmountUSD : trackedAmountUSD
  swap.save()

  // update the transaction
  transaction.swaps = swaps.concat([swap.id])
  transaction.save()

  // update day entities
  updatePairDayData(pair, event)
  updatePairHourData(pair, event)
  updateKalyswapDayData(event)
  updateTokenDayData(token0 as Token, event)
  updateTokenDayData(token1 as Token, event)
}
