import { BigDecimal, BigInt } from '@graphprotocol/graph-ts'

// Factory address
export const FACTORY_ADDRESS = '0xd42af909d323d88e0e933b6c50d3e91c279004ca'

// Reference token (WKLC) - equivalent to WETH in Uniswap
export const REFERENCE_TOKEN = '0x069255299Bb729399f3CECaBdc73d15d3D10a2A3'

// Whitelist of tokens for volume and liquidity tracking
export const WHITELIST: string[] = [
  '0x069255299Bb729399f3CECaBdc73d15d3D10a2A3', // WKLC
  '0xCC93b84cEed74Dc28c746b7697d6fA477ffFf65a', // KSWAP
  '0x2ca775c77b922a51fcf3097f52bffdbc0250d99a', // USDT
  '0x9cAb0c396cF0F4325913f2269a0b72BD4d46E3A9', // USDC
  '0x6E92CAC380F7A7B86f4163fad0df2F277B16Edc6', // DAI 
  // Add other major tokens as needed
]

// Stablecoins for price calculations
export const STABLECOINS: string[] = [
  '0x2ca775c77b922a51fcf3097f52bffdbc0250d99a', // USDT
  '0x9cAb0c396cF0F4325913f2269a0b72BD4d46E3A9', // USDC
  '0x6E92CAC380F7A7B86f4163fad0df2F277B16Edc6', // DAI 
  // Add other stablecoins as they become available
]

// Stable token pairs for KLC price calculation (WKLC/USDT)
export const STABLE_TOKEN_PAIRS: string[] = [
  '0x25fddaf836d12dc5e285823a644bb86e0b79c8e2', // WKLC/USDT pair
]

// Minimum liquidity threshold in KLC for price calculations
export const MINIMUM_LIQUIDITY_THRESHOLD_KLC = BigDecimal.fromString('2')

// Minimum USD threshold for new pairs
export const MINIMUM_USD_THRESHOLD_NEW_PAIRS = BigDecimal.fromString('400')

// Skip total supply for problematic tokens
export const SKIP_TOTAL_SUPPLY: string[] = []

// Token definitions for tokens with non-standard implementations
export class TokenDefinition {
  address: string
  symbol: string
  name: string
  decimals: BigInt

  constructor(address: string, symbol: string, name: string, decimals: BigInt) {
    this.address = address
    this.symbol = symbol
    this.name = name
    this.decimals = decimals
  }
}

// Static token definitions
export const STATIC_TOKEN_DEFINITIONS: TokenDefinition[] = [
  new TokenDefinition(
    '0x069255299Bb729399f3CECaBdc73d15d3D10a2A3',
    'WKLC',
    'Wrapped KLC',
    BigInt.fromI32(18)
  ),
  new TokenDefinition(
    '0xCC93b84cEed74Dc28c746b7697d6fA477ffFf65a',
    'KSWAP',
    'KalySwap Token',
    BigInt.fromI32(18)
  ),
  new TokenDefinition(
    '0x2ca775c77b922a51fcf3097f52bffdbc0250d99a',
    'USDT',
    'Tether USD',
    BigInt.fromI32(18)
  ),
]
