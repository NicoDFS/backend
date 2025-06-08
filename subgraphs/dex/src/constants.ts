import { BigDecimal, BigInt } from '@graphprotocol/graph-ts'

export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'

export const ZERO_BD = BigDecimal.fromString('0')
export const ONE_BD = BigDecimal.fromString('1')
export const ZERO_BI = BigInt.fromI32(0)
export const ONE_BI = BigInt.fromI32(1)
export const BI_18 = BigInt.fromI32(18)

// Factory address
export const FACTORY_ADDRESS = '0xd42af909d323d88e0e933b6c50d3e91c279004ca'

// WKLC address (reference token for KalyChain)
export const WKLC_ADDRESS = '0x069255299Bb729399f3CECaBdc73d15d3D10a2A3'

// KSWAP address
export const KSWAP_ADDRESS = '0xCC93b84cEed74Dc28c746b7697d6fA477ffFf65a'

// USDT address (main stablecoin)
export const USDT_ADDRESS = '0x2ca775c77b922a51fcf3097f52bffdbc0250d99a'
