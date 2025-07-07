import { BigInt, BigDecimal } from '@graphprotocol/graph-ts';

// Constants for farming subgraph
export const ZERO_BI = BigInt.fromI32(0);
export const ONE_BI = BigInt.fromI32(1);
export const ZERO_BD = BigDecimal.fromString('0');
export const ONE_BD = BigDecimal.fromString('1');

// Contract addresses
export const LIQUIDITY_POOL_MANAGER_ADDRESS = '0xe83e7ede1358FA87e5039CF8B1cffF383Bc2896A';

// Whitelisted LP pairs for farming
export const WHITELISTED_POOLS: string[] = [
  '0xf3e034650e1c2597a0af75012c1854247f271ee0', // WKLC-KSWAP
  '0x1a3d8b9fe0a77923a8330ffce485afd2b0b8be7e', // WKLC-DAI
  '0x25fddaf836d12dc5e285823a644bb86e0b79c8e2', // WKLC-USDT
  '0x0e520779287bb711c8e603cc85d532daa7c55372', // KSWAP-USDT
  '0x9fc553a1b7241a24aef20894375c6da706205734', // WKLC-USDC
  '0x85723d1c8c4d1944992eb02532de53037c98a667', // WKLC-ETH
  '0xe2912ecbd06185a6dba68d49b700ad06e98055e4', // WKLC-POL
  '0xa3eb9877968dbe481b8d72797035d39cc9656733', // WKLC-BNB
  '0x3b7c8132b3253b9ebbdf08eb849254effe22664b'  // WKLC-WBTC
];
