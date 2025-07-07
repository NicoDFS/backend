import { BigInt, BigDecimal, Address, ethereum } from '@graphprotocol/graph-ts';
import {
  KalyswapPair,
  Swap as SwapEvent,
  Mint as MintEvent,
  Burn as BurnEvent,
  Sync as SyncEvent,
  Transfer as TransferEvent
} from '../generated/templates/KalyswapPair/KalyswapPair';
import { Factory, Pair, Token, Swap, Mint, Burn, SyncEvent as SyncEventEntity } from '../generated/schema';
import {
  ZERO_BD,
  ZERO_BI,
  ONE_BI,
  convertTokenToDecimal,
  getKLCPriceInUSD,
  findKLCPerToken,
  getTrackedVolumeUSD,
  getTrackedLiquidityUSD,
  createDayData,
  createPairDayData,
  createTokenDayData
} from './helpers';

// Handle Swap event
export function handleSwap(event: SwapEvent): void {
  let pair = Pair.load(event.address.toHexString());
  if (pair === null) return;
  
  let token0 = Token.load(pair.token0);
  let token1 = Token.load(pair.token1);
  if (token0 === null || token1 === null) return;
  
  let factory = Factory.load(pair.factory);
  if (factory === null) return;
  
  // Update pair statistics
  let amount0In = convertTokenToDecimal(event.params.amount0In, token0.decimals);
  let amount1In = convertTokenToDecimal(event.params.amount1In, token1.decimals);
  let amount0Out = convertTokenToDecimal(event.params.amount0Out, token0.decimals);
  let amount1Out = convertTokenToDecimal(event.params.amount1Out, token1.decimals);
  
  // Update token volumes
  token0.tradeVolume = token0.tradeVolume.plus(amount0In.plus(amount0Out));
  token1.tradeVolume = token1.tradeVolume.plus(amount1In.plus(amount1Out));
  
  // Get tracked amounts for volume
  let trackedAmountUSD = getTrackedVolumeUSD(
    amount0In,
    amount1In,
    amount0Out,
    amount1Out,
    token0 as Token,
    token1 as Token
  );
  
  // Update token USD volumes
  token0.tradeVolumeUSD = token0.tradeVolumeUSD.plus(trackedAmountUSD);
  token1.tradeVolumeUSD = token1.tradeVolumeUSD.plus(trackedAmountUSD);
  
  // Update pair volume data
  pair.volumeUSD = pair.volumeUSD.plus(trackedAmountUSD);
  pair.volumeToken0 = pair.volumeToken0.plus(amount0In.plus(amount0Out));
  pair.volumeToken1 = pair.volumeToken1.plus(amount1In.plus(amount1Out));
  pair.txCount = pair.txCount.plus(ONE_BI);
  pair.updatedAt = event.block.timestamp;
  
  // Update factory volume data
  factory.totalVolumeUSD = factory.totalVolumeUSD.plus(trackedAmountUSD);
  factory.txCount = factory.txCount.plus(ONE_BI);
  factory.updatedAt = event.block.timestamp;
  
  // Update token tx counts
  token0.txCount = token0.txCount.plus(ONE_BI);
  token1.txCount = token1.txCount.plus(ONE_BI);
  token0.updatedAt = event.block.timestamp;
  token1.updatedAt = event.block.timestamp;
  
  // Save entities
  token0.save();
  token1.save();
  pair.save();
  factory.save();
  
  // Create and save the swap event
  let swap = new Swap(event.transaction.hash.toHexString() + '-' + event.logIndex.toString());
  swap.pair = pair.id;
  swap.sender = event.params.sender;
  swap.amount0In = amount0In;
  swap.amount1In = amount1In;
  swap.amount0Out = amount0Out;
  swap.amount1Out = amount1Out;
  swap.to = event.params.to;
  swap.logIndex = event.logIndex;
  swap.amountUSD = trackedAmountUSD;
  swap.timestamp = event.block.timestamp;
  swap.blockNumber = event.block.number;
  swap.transactionHash = event.transaction.hash;
  swap.save();
  
  // Update day data
  let dayData = createDayData(event.block.timestamp, factory as Factory);
  let pairDayData = createPairDayData(event.block.timestamp, pair as Pair);
  let token0DayData = createTokenDayData(event.block.timestamp, token0 as Token);
  let token1DayData = createTokenDayData(event.block.timestamp, token1 as Token);
  
  // Update day data entities
  dayData.volumeUSD = dayData.volumeUSD.plus(trackedAmountUSD);
  dayData.txCount = dayData.txCount.plus(ONE_BI);
  dayData.save();
  
  pairDayData.volumeUSD = pairDayData.volumeUSD.plus(trackedAmountUSD);
  pairDayData.volumeToken0 = pairDayData.volumeToken0.plus(amount0In.plus(amount0Out));
  pairDayData.volumeToken1 = pairDayData.volumeToken1.plus(amount1In.plus(amount1Out));
  pairDayData.txCount = pairDayData.txCount.plus(ONE_BI);
  pairDayData.save();
  
  token0DayData.volume = token0DayData.volume.plus(amount0In.plus(amount0Out));
  token0DayData.volumeUSD = token0DayData.volumeUSD.plus(trackedAmountUSD);
  token0DayData.txCount = token0DayData.txCount.plus(ONE_BI);
  token0DayData.save();
  
  token1DayData.volume = token1DayData.volume.plus(amount1In.plus(amount1Out));
  token1DayData.volumeUSD = token1DayData.volumeUSD.plus(trackedAmountUSD);
  token1DayData.txCount = token1DayData.txCount.plus(ONE_BI);
  token1DayData.save();
}

// Handle Mint event
export function handleMint(event: MintEvent): void {
  let pair = Pair.load(event.address.toHexString());
  if (pair === null) return;
  
  let token0 = Token.load(pair.token0);
  let token1 = Token.load(pair.token1);
  if (token0 === null || token1 === null) return;
  
  let factory = Factory.load(pair.factory);
  if (factory === null) return;
  
  // Convert amounts to decimals
  let amount0 = convertTokenToDecimal(event.params.amount0, token0.decimals);
  let amount1 = convertTokenToDecimal(event.params.amount1, token1.decimals);
  
  // Get tracked liquidity
  let trackedLiquidityUSD = getTrackedLiquidityUSD(
    amount0,
    token0 as Token,
    amount1,
    token1 as Token
  );
  
  // Update pair statistics
  pair.txCount = pair.txCount.plus(ONE_BI);
  pair.updatedAt = event.block.timestamp;
  
  // Update factory statistics
  factory.txCount = factory.txCount.plus(ONE_BI);
  factory.updatedAt = event.block.timestamp;
  
  // Update token statistics
  token0.txCount = token0.txCount.plus(ONE_BI);
  token1.txCount = token1.txCount.plus(ONE_BI);
  token0.updatedAt = event.block.timestamp;
  token1.updatedAt = event.block.timestamp;
  
  // Save entities
  token0.save();
  token1.save();
  pair.save();
  factory.save();
  
  // Create and save the mint event
  let mint = new Mint(event.transaction.hash.toHexString() + '-' + event.logIndex.toString());
  mint.pair = pair.id;
  mint.sender = event.params.sender;
  mint.owner = event.transaction.from;
  mint.amount0 = amount0;
  mint.amount1 = amount1;
  mint.amountUSD = trackedLiquidityUSD;
  mint.logIndex = event.logIndex;
  mint.timestamp = event.block.timestamp;
  mint.blockNumber = event.block.number;
  mint.transactionHash = event.transaction.hash;
  mint.save();
  
  // Update day data
  let dayData = createDayData(event.block.timestamp, factory as Factory);
  let pairDayData = createPairDayData(event.block.timestamp, pair as Pair);
  let token0DayData = createTokenDayData(event.block.timestamp, token0 as Token);
  let token1DayData = createTokenDayData(event.block.timestamp, token1 as Token);
  
  // Update day data entities
  dayData.txCount = dayData.txCount.plus(ONE_BI);
  dayData.save();
  
  pairDayData.txCount = pairDayData.txCount.plus(ONE_BI);
  pairDayData.save();
  
  token0DayData.txCount = token0DayData.txCount.plus(ONE_BI);
  token0DayData.save();
  
  token1DayData.txCount = token1DayData.txCount.plus(ONE_BI);
  token1DayData.save();
}

// Handle Burn event
export function handleBurn(event: BurnEvent): void {
  let pair = Pair.load(event.address.toHexString());
  if (pair === null) return;
  
  let token0 = Token.load(pair.token0);
  let token1 = Token.load(pair.token1);
  if (token0 === null || token1 === null) return;
  
  let factory = Factory.load(pair.factory);
  if (factory === null) return;
  
  // Convert amounts to decimals
  let amount0 = convertTokenToDecimal(event.params.amount0, token0.decimals);
  let amount1 = convertTokenToDecimal(event.params.amount1, token1.decimals);
  
  // Get tracked liquidity
  let trackedLiquidityUSD = getTrackedLiquidityUSD(
    amount0,
    token0 as Token,
    amount1,
    token1 as Token
  );
  
  // Update pair statistics
  pair.txCount = pair.txCount.plus(ONE_BI);
  pair.updatedAt = event.block.timestamp;
  
  // Update factory statistics
  factory.txCount = factory.txCount.plus(ONE_BI);
  factory.updatedAt = event.block.timestamp;
  
  // Update token statistics
  token0.txCount = token0.txCount.plus(ONE_BI);
  token1.txCount = token1.txCount.plus(ONE_BI);
  token0.updatedAt = event.block.timestamp;
  token1.updatedAt = event.block.timestamp;
  
  // Save entities
  token0.save();
  token1.save();
  pair.save();
  factory.save();
  
  // Create and save the burn event
  let burn = new Burn(event.transaction.hash.toHexString() + '-' + event.logIndex.toString());
  burn.pair = pair.id;
  burn.sender = event.params.sender;
  burn.owner = event.params.to;
  burn.amount0 = amount0;
  burn.amount1 = amount1;
  burn.amountUSD = trackedLiquidityUSD;
  burn.logIndex = event.logIndex;
  burn.timestamp = event.block.timestamp;
  burn.blockNumber = event.block.number;
  burn.transactionHash = event.transaction.hash;
  burn.save();
  
  // Update day data
  let dayData = createDayData(event.block.timestamp, factory as Factory);
  let pairDayData = createPairDayData(event.block.timestamp, pair as Pair);
  let token0DayData = createTokenDayData(event.block.timestamp, token0 as Token);
  let token1DayData = createTokenDayData(event.block.timestamp, token1 as Token);
  
  // Update day data entities
  dayData.txCount = dayData.txCount.plus(ONE_BI);
  dayData.save();
  
  pairDayData.txCount = pairDayData.txCount.plus(ONE_BI);
  pairDayData.save();
  
  token0DayData.txCount = token0DayData.txCount.plus(ONE_BI);
  token0DayData.save();
  
  token1DayData.txCount = token1DayData.txCount.plus(ONE_BI);
  token1DayData.save();
}

// Handle Sync event
export function handleSync(event: SyncEvent): void {
  let pair = Pair.load(event.address.toHexString());
  if (pair === null) return;
  
  let token0 = Token.load(pair.token0);
  let token1 = Token.load(pair.token1);
  if (token0 === null || token1 === null) return;
  
  let factory = Factory.load(pair.factory);
  if (factory === null) return;
  
  // Convert reserves to decimals
  let reserve0 = convertTokenToDecimal(event.params.reserve0, token0.decimals);
  let reserve1 = convertTokenToDecimal(event.params.reserve1, token1.decimals);
  
  // Update pair reserves
  pair.reserve0 = reserve0;
  pair.reserve1 = reserve1;
  
  // Calculate prices
  if (reserve0.notEqual(ZERO_BD) && reserve1.notEqual(ZERO_BD)) {
    pair.token0Price = reserve1.div(reserve0);
    pair.token1Price = reserve0.div(reserve1);
  } else {
    pair.token0Price = ZERO_BD;
    pair.token1Price = ZERO_BD;
  }
  
  // Update derived KLC values
  token0.derivedKLC = findKLCPerToken(token0 as Token);
  token1.derivedKLC = findKLCPerToken(token1 as Token);
  
  // Get KLC price in USD
  let klcPrice = getKLCPriceInUSD();
  
  // Calculate reserves in KLC and USD
  pair.reserveKLC = reserve0
    .times(token0.derivedKLC)
    .plus(reserve1.times(token1.derivedKLC));
  pair.reserveUSD = pair.reserveKLC.times(klcPrice);
  
  // Calculate tracked liquidity
  pair.trackedReserveKLC = getTrackedLiquidityUSD(
    reserve0,
    token0 as Token,
    reserve1,
    token1 as Token
  ).div(klcPrice);
  
  // Update token liquidity
  token0.totalLiquidity = token0.totalLiquidity
    .plus(reserve0)
    .minus(pair.reserve0);
  token1.totalLiquidity = token1.totalLiquidity
    .plus(reserve1)
    .minus(pair.reserve1);
  
  // Update timestamps
  pair.updatedAt = event.block.timestamp;
  token0.updatedAt = event.block.timestamp;
  token1.updatedAt = event.block.timestamp;
  factory.updatedAt = event.block.timestamp;
  
  // Save entities
  token0.save();
  token1.save();
  pair.save();
  factory.save();
  
  // Create and save the sync event
  let syncEvent = new SyncEventEntity(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  syncEvent.pair = pair.id;
  syncEvent.reserve0 = event.params.reserve0;
  syncEvent.reserve1 = event.params.reserve1;
  syncEvent.timestamp = event.block.timestamp;
  syncEvent.blockNumber = event.block.number;
  syncEvent.transactionHash = event.transaction.hash;
  syncEvent.save();
  
  // Update day data
  let dayData = createDayData(event.block.timestamp, factory as Factory);
  let pairDayData = createPairDayData(event.block.timestamp, pair as Pair);
  let token0DayData = createTokenDayData(event.block.timestamp, token0 as Token);
  let token1DayData = createTokenDayData(event.block.timestamp, token1 as Token);
  
  // Update day data entities with liquidity
  dayData.liquidityKLC = factory.totalLiquidityKLC;
  dayData.liquidityUSD = factory.totalLiquidityUSD;
  dayData.save();
  
  pairDayData.reserve0 = pair.reserve0;
  pairDayData.reserve1 = pair.reserve1;
  pairDayData.reserveUSD = pair.reserveUSD;
  pairDayData.save();
  
  token0DayData.liquidityKLC = token0.totalLiquidity.times(token0.derivedKLC);
  token0DayData.liquidityUSD = token0DayData.liquidityKLC.times(klcPrice);
  token0DayData.priceUSD = token0.derivedKLC.times(klcPrice);
  token0DayData.save();
  
  token1DayData.liquidityKLC = token1.totalLiquidity.times(token1.derivedKLC);
  token1DayData.liquidityUSD = token1DayData.liquidityKLC.times(klcPrice);
  token1DayData.priceUSD = token1.derivedKLC.times(klcPrice);
  token1DayData.save();
}

// Handle Transfer event
export function handleTransfer(event: TransferEvent): void {
  // Transfers are used to detect mints and burns
  // We don't need to handle them directly as they're covered by Mint and Burn events
}