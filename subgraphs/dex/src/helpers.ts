import { BigInt, BigDecimal, Address, log } from '@graphprotocol/graph-ts';
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
export let ROUTER_ADDRESS = '0x183F288BF7EEBe1A3f318F4681dF4a70ef32B2f3';
export let WKLC_KSWAP_PAIR = ''; // Replace with the actual WKLC-KSWAP pair address
export let WKLC_USDT_PAIR = '0x25fddaf836d12dc5e285823a644bb86e0b79c8e2'; // WKLC/USDT pair for price calculation

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
  // Try to get the price from the WKLC/USDT pair
  let pair = Pair.load(WKLC_USDT_PAIR);

  if (pair !== null) {
    // Check which token is WKLC and which is USDT
    let token0 = Token.load(pair.token0);
    let token1 = Token.load(pair.token1);

    if (token0 !== null && token1 !== null) {
      let klcPrice: BigDecimal;
      let token0Decimals = token0.decimals;
      let token1Decimals = token1.decimals;

      // Log token information for debugging
      log.info(
        'WKLC/USDT pair tokens - token0: {}, decimals: {}, token1: {}, decimals: {}',
        [token0.symbol, token0Decimals.toString(), token1.symbol, token1Decimals.toString()]
      );

      if (token0.symbol == 'WKLC' && token1.symbol == 'USDT') {
        // token1Price is the price of token0 in terms of token1
        // So this is WKLC price in USDT
        klcPrice = pair.token1Price;

        // Log raw price for debugging
        log.info('WKLC is token0, raw price: {}', [klcPrice.toString()]);

        // Adjust for decimal difference if needed
        // USDT typically has 6 decimals, WKLC has 18
        if (token0Decimals != token1Decimals) {
          let decimalDifference = token0Decimals - token1Decimals;
          if (decimalDifference > 0) {
            // If WKLC has more decimals than USDT, divide the price
            klcPrice = klcPrice.div(exponentToBigDecimal(BigInt.fromI32(decimalDifference)));
          } else {
            // If USDT has more decimals than WKLC (unlikely), multiply the price
            klcPrice = klcPrice.times(exponentToBigDecimal(BigInt.fromI32(-decimalDifference)));
          }

          // Log adjusted price for debugging
          log.info('Adjusted price after decimal correction: {}', [klcPrice.toString()]);
        }
      } else if (token0.symbol == 'USDT' && token1.symbol == 'WKLC') {
        // token0Price is the price of token1 in terms of token0
        // So this is WKLC price in USDT
        klcPrice = pair.token0Price;

        // Log raw price for debugging
        log.info('WKLC is token1, raw price: {}', [klcPrice.toString()]);

        // Adjust for decimal difference if needed
        // USDT typically has 6 decimals, WKLC has 18
        if (token0Decimals != token1Decimals) {
          let decimalDifference = token1Decimals - token0Decimals;
          if (decimalDifference > 0) {
            // If WKLC has more decimals than USDT, divide the price
            klcPrice = klcPrice.div(exponentToBigDecimal(BigInt.fromI32(decimalDifference)));
          } else {
            // If USDT has more decimals than WKLC (unlikely), multiply the price
            klcPrice = klcPrice.times(exponentToBigDecimal(BigInt.fromI32(-decimalDifference)));
          }

          // Log adjusted price for debugging
          log.info('Adjusted price after decimal correction: {}', [klcPrice.toString()]);
        }
      } else {
        // If neither token is WKLC or USDT, use fallback
        log.warning('Neither token in pair is WKLC or USDT, using fallback price', []);
        return BigDecimal.fromString('0.001221');
      }

      // Sanity check - KLC price should be very small (around $0.001)
      let minReasonablePrice = BigDecimal.fromString('0.0001');
      let maxReasonablePrice = BigDecimal.fromString('0.01');

      if (klcPrice.equals(ZERO_BD) ||
          klcPrice.lt(minReasonablePrice) ||
          klcPrice.gt(maxReasonablePrice)) {
        // Price is outside reasonable range, use fallback
        log.warning(
          'KLC price {} is outside reasonable range ({} to {}), using fallback',
          [klcPrice.toString(), minReasonablePrice.toString(), maxReasonablePrice.toString()]
        );
        return BigDecimal.fromString('0.001221');
      }

      log.info('Final KLC price: {}', [klcPrice.toString()]);
      return klcPrice;
    }
  }

  // Fallback to a reasonable value if the pair doesn't exist or calculation fails
  log.warning('Could not load WKLC/USDT pair, using fallback price', []);
  return BigDecimal.fromString('0.001221'); // Current KLC price
}

export function findKLCPerToken(token: Token): BigDecimal {
  if (token.address.toHexString() == WKLC_ADDRESS) {
    return ONE_BD;
  }

  // Look for pairs with WKLC to calculate the token price in terms of KLC
  // This is a simplified implementation - in a production environment,
  // you would want to use a more sophisticated algorithm that considers
  // liquidity and other factors

  // For now, we'll use the token's existing derivedKLC value if it's set
  if (token.derivedKLC && !token.derivedKLC.equals(ZERO_BD)) {
    return token.derivedKLC;
  }

  // Fallback to a reasonable value
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
