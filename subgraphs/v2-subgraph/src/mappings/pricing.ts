/* eslint-disable prefer-const */
import { Address, BigDecimal, BigInt } from '@graphprotocol/graph-ts/index'

import { Bundle, Pair, Token } from '../types/schema'
import { ADDRESS_ZERO, factoryContract, ONE_BD, UNTRACKED_PAIRS, ZERO_BD } from './helpers'

const WKLC_ADDRESS = '0x069255299Bb729399f3CECaBdc73d15d3D10a2A3'
const USDC_WKLC_PAIR = '0x4D7f05b00D6BF67C1062BCcc26E1CA1FC24Ac0f0' // created 25046511
const DAI_WKLC_PAIR = '0x1a3d8b9fe0a77923a8330ffce485afd2b0b8be7e' // created block 24697758
const USDT_WKLC_PAIR = '0x25FDDaF836d12dC5e285823a644bb86E0b79c8e2' // created block 24695885

export function getKlcPriceInUSD(): BigDecimal {
  // fetch klc prices for each stablecoin
  let daiPair = Pair.load(DAI_WKLC_PAIR) // dai is token0
  let usdcPair = Pair.load(USDC_WKLC_PAIR) // usdc is token0
  let usdtPair = Pair.load(USDT_WKLC_PAIR) // usdt is token1

  // all 3 have been created
  if (daiPair !== null && usdcPair !== null && usdtPair !== null) {
    let totalLiquidityKLC = daiPair.reserve1.plus(usdcPair.reserve1).plus(usdtPair.reserve0)
    let daiWeight = daiPair.reserve1.div(totalLiquidityKLC)
    let usdcWeight = usdcPair.reserve1.div(totalLiquidityKLC)
    let usdtWeight = usdtPair.reserve0.div(totalLiquidityKLC)
    return daiPair.token0Price
      .times(daiWeight)
      .plus(usdcPair.token0Price.times(usdcWeight))
      .plus(usdtPair.token1Price.times(usdtWeight))
    // dai and USDC have been created
  } else if (daiPair !== null && usdcPair !== null) {
    let totalLiquidityKLC = daiPair.reserve1.plus(usdcPair.reserve1)
    let daiWeight = daiPair.reserve1.div(totalLiquidityKLC)
    let usdcWeight = usdcPair.reserve1.div(totalLiquidityKLC)
    return daiPair.token0Price.times(daiWeight).plus(usdcPair.token0Price.times(usdcWeight))
    // USDC is the only pair so far
  } else if (usdcPair !== null) {
    return usdcPair.token0Price
  } else {
    return ZERO_BD
  }
}

// token where amounts should contribute to tracked volume and liquidity
let WHITELIST: string[] = [
  '0x069255299Bb729399f3CECaBdc73d15d3D10a2A3', // WKLC
  '0x6E92CAC380F7A7B86f4163fad0df2F277B16Edc6', // DAI
  '0x9cAb0c396cF0F4325913f2269a0b72BD4d46E3A9', // USDC
  '0x2CA775C77B922A51FcF3097F52bFFdbc0250D99A', // USDT
  '0xaA77D4a26d432B82DB07F8a47B7f7F623fd92455', // WBTC
  '0xfdbB253753dDE60b11211B169dC872AaE672879b', // ETH
  '0x0e2318b62a096AC68ad2D7F37592CBf0cA9c4Ddb', // BNB
  '0x706C9a63d7c8b7Aaf85DDCca52654645f470E8Ac', // POL
  '0x376E0ac0B55aA79F9B30aAc8842e5E84fF06360C', // CLISHA
  '0xCC93b84cEed74Dc28c746b7697d6fA477ffFf65a', // KSWAP
]

// minimum liquidity required to count towards tracked volume for pairs with small # of Lps
let MINIMUM_USD_THRESHOLD_NEW_PAIRS = BigDecimal.fromString('400000')

// minimum liquidity for price to get tracked
let MINIMUM_LIQUIDITY_THRESHOLD_KLC = BigDecimal.fromString('2')

/**
 * Search through graph to find derived Klc per token.
 * @todo update to be derived KLC (add stablecoin estimates)
 **/
export function findKlcPerToken(token: Token): BigDecimal {
  if (token.id == WKLC_ADDRESS) {
    return ONE_BD
  }
  // loop through whitelist and check if paired with any
  for (let i = 0; i < WHITELIST.length; ++i) {
    let pairAddress = factoryContract.getPair(Address.fromString(token.id), Address.fromString(WHITELIST[i]))
    if (pairAddress.toHexString() != ADDRESS_ZERO) {
      let pair = Pair.load(pairAddress.toHexString())
      if (pair === null) {
        continue
      }
      if (pair.token0 == token.id && pair.reserveKLC.gt(MINIMUM_LIQUIDITY_THRESHOLD_KLC)) {
        let token1 = Token.load(pair.token1)
        if (token1 === null) {
          continue
        }
        return pair.token1Price.times(token1.derivedKLC as BigDecimal) // return token1 per our token * Klc per token 1
      }
      if (pair.token1 == token.id && pair.reserveKLC.gt(MINIMUM_LIQUIDITY_THRESHOLD_KLC)) {
        let token0 = Token.load(pair.token0)
        if (token0 === null) {
          continue
        }
        return pair.token0Price.times(token0.derivedKLC as BigDecimal) // return token0 per our token * KLC per token 0
      }
    }
  }
  return ZERO_BD // nothing was found return 0
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD.
 * If both are, return average of two amounts
 * If neither is, return 0
 */
export function getTrackedVolumeUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token,
  pair: Pair,
): BigDecimal {
  let bundle = Bundle.load('1')!
  let price0 = token0.derivedKLC.times(bundle.klcPrice)
  let price1 = token1.derivedKLC.times(bundle.klcPrice)

  // dont count tracked volume on these pairs - usually rebass tokens
  if (UNTRACKED_PAIRS.includes(pair.id)) {
    return ZERO_BD
  }

  // if less than 5 LPs, require high minimum reserve amount amount or return 0
  if (pair.liquidityProviderCount.lt(BigInt.fromI32(5))) {
    let reserve0USD = pair.reserve0.times(price0)
    let reserve1USD = pair.reserve1.times(price1)
    if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
      if (reserve0USD.plus(reserve1USD).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return ZERO_BD
      }
    }
    if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
      if (reserve0USD.times(BigDecimal.fromString('2')).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return ZERO_BD
      }
    }
    if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
      if (reserve1USD.times(BigDecimal.fromString('2')).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return ZERO_BD
      }
    }
  }

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).plus(tokenAmount1.times(price1)).div(BigDecimal.fromString('2'))
  }

  // take full value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0)
  }

  // take full value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1)
  }

  // neither token is on white list, tracked volume is 0
  return ZERO_BD
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD * 2.
 * If both are, return sum of two amounts
 * If neither is, return 0
 */
export function getTrackedLiquidityUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token,
): BigDecimal {
  let bundle = Bundle.load('1')!
  let price0 = token0.derivedKLC.times(bundle.klcPrice)
  let price1 = token1.derivedKLC.times(bundle.klcPrice)

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).plus(tokenAmount1.times(price1))
  }

  // take double value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).times(BigDecimal.fromString('2'))
  }

  // take double value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1).times(BigDecimal.fromString('2'))
  }

  // neither token is on white list, tracked volume is 0
  return ZERO_BD
}
