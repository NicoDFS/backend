import { BigInt, BigDecimal, Address, ethereum } from '@graphprotocol/graph-ts';
import { KalyswapFactory, PairCreated } from '../generated/KalyswapFactory/KalyswapFactory';
import { KalyswapPair as PairTemplate } from '../generated/templates';
import { Factory, Pair, Token, PairCreatedEvent, PairToken } from '../generated/schema';
import { KalyswapPair } from '../generated/templates/KalyswapPair/KalyswapPair';
import { ERC20 } from '../generated/KalyswapFactory/ERC20';
import { fetchTokenSymbol, fetchTokenName, fetchTokenDecimals, fetchTokenTotalSupply, ZERO_BD, ZERO_BI, ONE_BI } from './helpers';

// Initialize a Factory entity
function getOrCreateFactory(address: Address, block: ethereum.Block): Factory {
  let factory = Factory.load(address.toHexString());

  if (factory === null) {
    factory = new Factory(address.toHexString());
    factory.address = address;
    factory.pairCount = 0;
    factory.totalVolumeUSD = ZERO_BD;
    factory.totalVolumeKLC = ZERO_BD;
    factory.totalLiquidityUSD = ZERO_BD;
    factory.totalLiquidityKLC = ZERO_BD;
    factory.txCount = ZERO_BI;
    factory.createdAt = block.timestamp;
    factory.updatedAt = block.timestamp;

    // For now, we'll use default values instead of trying to call contract methods
    // This will be replaced with actual contract calls once the subgraph is working

    factory.save();
  }

  return factory as Factory;
}

// Initialize a Token entity
function getOrCreateToken(address: Address, factory: Factory, block: ethereum.Block): Token {
  let token = Token.load(address.toHexString());

  if (token === null) {
    token = new Token(address.toHexString());
    token.factory = factory.id;
    token.address = address;
    token.symbol = fetchTokenSymbol(address);
    token.name = fetchTokenName(address);
    token.decimals = fetchTokenDecimals(address);
    token.totalSupply = fetchTokenTotalSupply(address);
    token.tradeVolume = ZERO_BD;
    token.tradeVolumeUSD = ZERO_BD;
    token.untrackedVolumeUSD = ZERO_BD;
    token.txCount = ZERO_BI;
    token.totalLiquidity = ZERO_BD;
    token.derivedKLC = ZERO_BD;
    token.createdAt = block.timestamp;
    token.updatedAt = block.timestamp;
    token.save();
  }

  return token as Token;
}

// Handle PairCreated event
export function handlePairCreated(event: PairCreated): void {
  // Load the factory
  let factory = getOrCreateFactory(event.address, event.block);

  // Load tokens
  let token0 = getOrCreateToken(event.params.token0, factory, event.block);
  let token1 = getOrCreateToken(event.params.token1, factory, event.block);

  // Create the pair
  let pair = new Pair(event.params.pair.toHexString());
  pair.factory = factory.id;
  pair.address = event.params.pair;
  pair.token0 = token0.id;
  pair.token1 = token1.id;
  pair.reserve0 = ZERO_BD;
  pair.reserve1 = ZERO_BD;
  pair.totalSupply = ZERO_BD;
  pair.reserveKLC = ZERO_BD;
  pair.reserveUSD = ZERO_BD;
  pair.trackedReserveKLC = ZERO_BD;
  pair.token0Price = ZERO_BD;
  pair.token1Price = ZERO_BD;
  pair.volumeToken0 = ZERO_BD;
  pair.volumeToken1 = ZERO_BD;
  pair.volumeUSD = ZERO_BD;
  pair.untrackedVolumeUSD = ZERO_BD;
  pair.txCount = ZERO_BI;
  pair.createdAt = event.block.timestamp;
  pair.updatedAt = event.block.timestamp;
  pair.save();

  // Create PairToken entities to track the relationship
  let pairToken0 = new PairToken(pair.id + '-' + token0.id);
  pairToken0.pair = pair.id;
  pairToken0.token = token0.id;
  pairToken0.isToken0 = true;
  pairToken0.save();

  let pairToken1 = new PairToken(pair.id + '-' + token1.id);
  pairToken1.pair = pair.id;
  pairToken1.token = token1.id;
  pairToken1.isToken0 = false;
  pairToken1.save();

  // Update factory
  factory.pairCount = factory.pairCount + 1;
  factory.updatedAt = event.block.timestamp;
  factory.save();

  // Create PairCreated event
  let pairCreatedEvent = new PairCreatedEvent(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  pairCreatedEvent.factory = factory.id;
  pairCreatedEvent.token0 = token0.id;
  pairCreatedEvent.token1 = token1.id;
  pairCreatedEvent.pair = pair.id;
  pairCreatedEvent.timestamp = event.block.timestamp;
  pairCreatedEvent.blockNumber = event.block.number;
  pairCreatedEvent.transactionHash = event.transaction.hash;
  pairCreatedEvent.save();

  // Create a template to track the pair contract
  PairTemplate.create(event.params.pair);
}