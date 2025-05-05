import { BigInt, BigDecimal, Address } from '@graphprotocol/graph-ts';
import { ERC20 } from '../generated/KalyswapFactory/ERC20';
import { Factory, Token, Pair, DayData, PairDayData, TokenDayData } from '../generated/schema';

export let ZERO_BI = BigInt.fromI32(0);
export let ONE_BI = BigInt.fromI32(1);
export let ZERO_BD = BigDecimal.fromString('0');
export let ONE_BD = BigDecimal.fromString('1');
export let BI_18 = BigInt.fromI32(18);

export let WKLC_ADDRESS = '0x069255299Bb729399f3CECaBdc73d15d3D10a2A3';
export let KSWAP_ADDRESS = '0xCC93b84cEed74Dc28c746b7697d6fA477ffFf65a';
export let FACTORY_ADDRESS = '0xD42Af909d323D88e0E933B6c50D3e91c279004ca';
export let WKLC_KSWAP_PAIR = ''; // Replace with the actual WKLC-KSWAP pair address

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let bd = BigDecimal.fromString('1');
  for (let i = ZERO_BI; i.lt(decimals as BigInt); i = i.plus(ONE_BI)) {
    bd = bd.times(BigDecimal.fromString('10'));
  }
  return bd;
}

export function convertTokenToDecimal(tokenAmount: BigInt, exchangeDecimals: i32): BigDecimal {
  if (exchangeDecimals == 0) {
    return tokenAmount.toBigDecimal();
  }
  return tokenAmount.toBigDecimal().div(exponentToBigDecimal(BigInt.fromI32(exchangeDecimals)));
}

export function fetchTokenSymbol(tokenAddress: Address): string {
  // For known tokens, return hardcoded symbols
  if (tokenAddress.toHexString() == WKLC_ADDRESS) {
    return 'WKLC';
  } else if (tokenAddress.toHexString() == KSWAP_ADDRESS) {
    return 'KSWAP';
  }

  // For other tokens, try to call the contract
  let contract = ERC20.bind(tokenAddress);
  let symbolValue = 'TOKEN';

  // Try to call the symbol method
  let symbolResult = contract.try_symbol();
  if (!symbolResult.reverted) {
    symbolValue = symbolResult.value;
  }

  return symbolValue;
}

export function fetchTokenName(tokenAddress: Address): string {
  // For known tokens, return hardcoded names
  if (tokenAddress.toHexString() == WKLC_ADDRESS) {
    return 'Wrapped KLC';
  } else if (tokenAddress.toHexString() == KSWAP_ADDRESS) {
    return 'KalySwap Token';
  }

  // For other tokens, try to call the contract
  let contract = ERC20.bind(tokenAddress);
  let nameValue = 'Unknown Token';

  // Try to call the name method
  let nameResult = contract.try_name();
  if (!nameResult.reverted) {
    nameValue = nameResult.value;
  }

  return nameValue;
}

export function fetchTokenDecimals(tokenAddress: Address): i32 {
  // For known tokens, return hardcoded decimals
  if (tokenAddress.toHexString() == WKLC_ADDRESS) {
    return 18;
  } else if (tokenAddress.toHexString() == KSWAP_ADDRESS) {
    return 18;
  }

  // For other tokens, try to call the contract
  let contract = ERC20.bind(tokenAddress);
  let decimals = 18; // Default to 18 decimals

  // Try to call the decimals method
  let decimalsResult = contract.try_decimals();
  if (!decimalsResult.reverted) {
    decimals = decimalsResult.value;
  }

  return decimals;
}

export function fetchTokenTotalSupply(tokenAddress: Address): BigInt {
  // For known tokens, return hardcoded total supply
  if (tokenAddress.toHexString() == WKLC_ADDRESS || tokenAddress.toHexString() == KSWAP_ADDRESS) {
    return BigInt.fromString('1000000000000000000000000');
  }

  // For other tokens, try to call the contract
  let contract = ERC20.bind(tokenAddress);
  let totalSupply = BigInt.fromString('0');

  // Try to call the totalSupply method
  let totalSupplyResult = contract.try_totalSupply();
  if (!totalSupplyResult.reverted) {
    totalSupply = totalSupplyResult.value;
  }

  return totalSupply;
}

export function getKLCPriceInUSD(): BigDecimal {
  // For simplicity, we'll use a fixed price initially
  // In a real implementation, you would calculate this from a stable pair
  return BigDecimal.fromString('1.0');
}

export function findKLCPerToken(token: Token): BigDecimal {
  if (token.address.toHexString() == WKLC_ADDRESS) {
    return ONE_BD;
  }

  // For simplicity, we'll use a fixed value initially
  // In a real implementation, you would calculate this from pairs
  return BigDecimal.fromString('0.01');
}

export function getTrackedVolumeUSD(
  amount0In: BigDecimal,
  amount1In: BigDecimal,
  amount0Out: BigDecimal,
  amount1Out: BigDecimal,
  token0: Token,
  token1: Token
): BigDecimal {
  let price0 = token0.derivedKLC.times(getKLCPriceInUSD());
  let price1 = token1.derivedKLC.times(getKLCPriceInUSD());

  let volume = ZERO_BD;
  if (amount0In.gt(ZERO_BD)) {
    volume = volume.plus(amount0In.times(price0));
  }
  if (amount1In.gt(ZERO_BD)) {
    volume = volume.plus(amount1In.times(price1));
  }
  if (amount0Out.gt(ZERO_BD)) {
    volume = volume.plus(amount0Out.times(price0));
  }
  if (amount1Out.gt(ZERO_BD)) {
    volume = volume.plus(amount1Out.times(price1));
  }

  return volume.div(BigDecimal.fromString('2'));
}

export function getTrackedLiquidityUSD(
  amount0: BigDecimal,
  token0: Token,
  amount1: BigDecimal,
  token1: Token
): BigDecimal {
  let price0 = token0.derivedKLC.times(getKLCPriceInUSD());
  let price1 = token1.derivedKLC.times(getKLCPriceInUSD());

  return amount0.times(price0).plus(amount1.times(price1));
}

export function createDayData(timestamp: BigInt, factory: Factory): DayData {
  let dayID = timestamp.toI32() / 86400;
  let dayStartTimestamp = dayID * 86400;
  let dayData = DayData.load(dayID.toString());

  if (dayData === null) {
    dayData = new DayData(dayID.toString());
    dayData.date = dayID;
    dayData.factory = factory.id;
    dayData.volumeKLC = ZERO_BD;
    dayData.volumeUSD = ZERO_BD;
    dayData.untrackedVolume = ZERO_BD;
    dayData.liquidityKLC = ZERO_BD;
    dayData.liquidityUSD = ZERO_BD;
    dayData.txCount = ZERO_BI;
  }

  return dayData as DayData;
}

export function createPairDayData(timestamp: BigInt, pair: Pair): PairDayData {
  let dayID = timestamp.toI32() / 86400;
  let dayStartTimestamp = dayID * 86400;
  let dayPairID = pair.id.concat('-').concat(dayID.toString());
  let dayPairData = PairDayData.load(dayPairID);

  if (dayPairData === null) {
    dayPairData = new PairDayData(dayPairID);
    dayPairData.date = dayID;
    dayPairData.pair = pair.id;
    dayPairData.token0 = pair.token0;
    dayPairData.token1 = pair.token1;
    dayPairData.reserve0 = ZERO_BD;
    dayPairData.reserve1 = ZERO_BD;
    dayPairData.totalSupply = ZERO_BD;
    dayPairData.reserveUSD = ZERO_BD;
    dayPairData.volumeToken0 = ZERO_BD;
    dayPairData.volumeToken1 = ZERO_BD;
    dayPairData.volumeUSD = ZERO_BD;
    dayPairData.txCount = ZERO_BI;
  }

  return dayPairData as PairDayData;
}

export function createTokenDayData(timestamp: BigInt, token: Token): TokenDayData {
  let dayID = timestamp.toI32() / 86400;
  let dayStartTimestamp = dayID * 86400;
  let tokenDayID = token.id.concat('-').concat(dayID.toString());
  let tokenDayData = TokenDayData.load(tokenDayID);

  if (tokenDayData === null) {
    tokenDayData = new TokenDayData(tokenDayID);
    tokenDayData.date = dayID;
    tokenDayData.token = token.id;
    tokenDayData.volume = ZERO_BD;
    tokenDayData.volumeKLC = ZERO_BD;
    tokenDayData.volumeUSD = ZERO_BD;
    tokenDayData.liquidityKLC = ZERO_BD;
    tokenDayData.liquidityUSD = ZERO_BD;
    tokenDayData.priceUSD = ZERO_BD;
    tokenDayData.txCount = ZERO_BI;
  }

  return tokenDayData as TokenDayData;
}
