import { BigInt, BigDecimal, Address, ethereum, log, Bytes } from '@graphprotocol/graph-ts';
import { 
  KalyswapRouter,
  SwapExactTokensForTokensCall,
  SwapTokensForExactTokensCall,
  SwapExactTokensForKLCCall,
  SwapTokensForExactKLCCall,
  SwapExactTokensForTokensSupportingFeeOnTransferTokensCall,
  SwapExactTokensForKLCSupportingFeeOnTransferTokensCall
} from '../generated/KalyswapRouter/KalyswapRouter';
import { Router, RouterSwap, Pair, Token } from '../generated/schema';
import { KalyswapFactory } from '../generated/KalyswapRouter/KalyswapFactory';
import { KalyswapPair } from '../generated/KalyswapRouter/KalyswapPair';
import { ERC20 } from '../generated/KalyswapRouter/ERC20';
import { ZERO_BD, ZERO_BI, ONE_BI, WKLC_ADDRESS, FACTORY_ADDRESS } from './constants';
import { convertTokenToDecimal } from './helpers';
import { getKlcPriceInUSD } from './pricing';

// Initialize Router entity
function getOrCreateRouter(address: Address, block: ethereum.Block): Router {
  let router = Router.load(address.toHexString());
  
  if (router === null) {
    router = new Router(address.toHexString());
    router.address = address;
    
    // Get factory and WKLC addresses from router contract
    let routerContract = KalyswapRouter.bind(address);
    let factoryResult = routerContract.try_factory();
    let wklcResult = routerContract.try_WKLC();
    
    router.factory = factoryResult.reverted ? Address.fromString(FACTORY_ADDRESS) : factoryResult.value;
    router.WKLC = wklcResult.reverted ? Address.fromString(WKLC_ADDRESS) : wklcResult.value;
    
    router.totalSwaps = ZERO_BI;
    router.totalVolumeUSD = ZERO_BD;
    router.totalVolumeKLC = ZERO_BD;
    router.createdAt = block.timestamp;
    router.updatedAt = block.timestamp;
    
    router.save();
  }
  
  return router as Router;
}

// Helper function to calculate swap volume in USD
function calculateSwapVolumeUSD(
  path: Address[],
  amountIn: BigInt,
  amountOut: BigInt,
  isExactIn: boolean
): BigDecimal {
  if (path.length < 2) {
    return ZERO_BD;
  }
  
  let klcPrice = getKlcPriceInUSD();
  let volumeUSD = ZERO_BD;
  
  // Get token information
  let tokenIn = Token.load(path[0].toHexString());
  let tokenOut = Token.load(path[path.length - 1].toHexString());
  
  if (tokenIn && tokenOut) {
    let amountInDecimal = convertTokenToDecimal(amountIn, tokenIn.decimals);
    let amountOutDecimal = convertTokenToDecimal(amountOut, tokenOut.decimals);
    
    // Calculate volume based on input token if it's WKLC or a stablecoin
    if (path[0].toHexString() == WKLC_ADDRESS) {
      volumeUSD = amountInDecimal.times(klcPrice);
    } else if (tokenIn.symbol == 'USDT' || tokenIn.symbol == 'USDC' || tokenIn.symbol == 'DAI') {
      volumeUSD = amountInDecimal;
    } else if (path[path.length - 1].toHexString() == WKLC_ADDRESS) {
      volumeUSD = amountOutDecimal.times(klcPrice);
    } else if (tokenOut.symbol == 'USDT' || tokenOut.symbol == 'USDC' || tokenOut.symbol == 'DAI') {
      volumeUSD = amountOutDecimal;
    } else {
      // Use derived KLC price for other tokens
      let tokenPrice = tokenIn.derivedKLC.times(klcPrice);
      volumeUSD = amountInDecimal.times(tokenPrice);
    }
  }
  
  return volumeUSD;
}

// Helper function to create RouterSwap entity
function createRouterSwap(
  call: ethereum.Call,
  router: Router,
  path: Address[],
  amountIn: BigInt,
  amountOut: BigInt,
  sender: Address,
  recipient: Address,
  swapType: string
): void {
  let swapId = call.transaction.hash.toHexString() + '-' + call.transaction.index.toString();
  let routerSwap = new RouterSwap(swapId);
  
  routerSwap.router = router.id;
  routerSwap.transactionHash = call.transaction.hash;
  routerSwap.logIndex = BigInt.fromI32(0); // Call handlers don't have log index
  routerSwap.sender = sender;
  routerSwap.recipient = recipient;
  
  // Convert path to bytes array
  let pathBytes = new Array<Bytes>();
  for (let i = 0; i < path.length; i++) {
    pathBytes.push(path[i] as Bytes);
  }
  routerSwap.path = pathBytes;
  
  routerSwap.amountIn = convertTokenToDecimal(amountIn, BigInt.fromI32(18)); // Default to 18 decimals
  routerSwap.amountOut = convertTokenToDecimal(amountOut, BigInt.fromI32(18));
  
  // Calculate USD values
  let volumeUSD = calculateSwapVolumeUSD(path, amountIn, amountOut, true);
  routerSwap.amountInUSD = volumeUSD;
  routerSwap.amountOutUSD = volumeUSD; // Same volume for both sides
  
  routerSwap.swapType = swapType;
  routerSwap.timestamp = call.block.timestamp;
  routerSwap.blockNumber = call.block.number;
  routerSwap.gasUsed = call.transaction.gasLimit; // Use gasLimit instead of gasUsed
  routerSwap.gasPrice = call.transaction.gasPrice;
  
  routerSwap.save();
  
  // Update router totals
  router.totalSwaps = router.totalSwaps.plus(ONE_BI);
  router.totalVolumeUSD = router.totalVolumeUSD.plus(volumeUSD);
  router.totalVolumeKLC = router.totalVolumeKLC.plus(volumeUSD.div(getKlcPriceInUSD()));
  router.updatedAt = call.block.timestamp;
  router.save();
  
  log.info('Router swap created: {} with volume USD: {}', [swapId, volumeUSD.toString()]);
}

export function handleSwapExactTokensForTokens(call: SwapExactTokensForTokensCall): void {
  let router = getOrCreateRouter(call.to, call.block);
  
  createRouterSwap(
    call,
    router,
    call.inputs.path,
    call.inputs.amountIn,
    call.outputs.amounts[call.outputs.amounts.length - 1],
    call.transaction.from,
    call.inputs.to,
    'SwapExactTokensForTokens'
  );
}

export function handleSwapTokensForExactTokens(call: SwapTokensForExactTokensCall): void {
  let router = getOrCreateRouter(call.to, call.block);
  
  createRouterSwap(
    call,
    router,
    call.inputs.path,
    call.outputs.amounts[0],
    call.inputs.amountOut,
    call.transaction.from,
    call.inputs.to,
    'SwapTokensForExactTokens'
  );
}

export function handleSwapExactTokensForKLC(call: SwapExactTokensForKLCCall): void {
  let router = getOrCreateRouter(call.to, call.block);
  
  createRouterSwap(
    call,
    router,
    call.inputs.path,
    call.inputs.amountIn,
    call.outputs.amounts[call.outputs.amounts.length - 1],
    call.transaction.from,
    call.inputs.to,
    'SwapExactTokensForKLC'
  );
}

export function handleSwapTokensForExactKLC(call: SwapTokensForExactKLCCall): void {
  let router = getOrCreateRouter(call.to, call.block);
  
  createRouterSwap(
    call,
    router,
    call.inputs.path,
    call.outputs.amounts[0],
    call.inputs.amountOut,
    call.transaction.from,
    call.inputs.to,
    'SwapTokensForExactKLC'
  );
}

export function handleSwapExactTokensForTokensSupportingFeeOnTransferTokens(
  call: SwapExactTokensForTokensSupportingFeeOnTransferTokensCall
): void {
  let router = getOrCreateRouter(call.to, call.block);
  
  // For fee-on-transfer tokens, we can't get exact output amount from call
  // We'll use the input amount as approximation
  createRouterSwap(
    call,
    router,
    call.inputs.path,
    call.inputs.amountIn,
    call.inputs.amountIn, // Approximation since we can't get exact output
    call.transaction.from,
    call.inputs.to,
    'SwapExactTokensForTokensSupportingFeeOnTransferTokens'
  );
}

export function handleSwapExactTokensForKLCSupportingFeeOnTransferTokens(
  call: SwapExactTokensForKLCSupportingFeeOnTransferTokensCall
): void {
  let router = getOrCreateRouter(call.to, call.block);
  
  // For fee-on-transfer tokens, we can't get exact output amount from call
  // We'll use the input amount as approximation
  createRouterSwap(
    call,
    router,
    call.inputs.path,
    call.inputs.amountIn,
    call.inputs.amountIn, // Approximation since we can't get exact output
    call.transaction.from,
    call.inputs.to,
    'SwapExactTokensForKLCSupportingFeeOnTransferTokens'
  );
}
