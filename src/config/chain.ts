/**
 * KalyChain — the ONE chain this backend serves.
 *
 * KalyChain relaunched on chain id 3890 with KMT as its native token (2026-08). It is the
 * same chain and brand — only the id and the native token changed — so there is exactly one
 * entry here, not a "KMT chain" beside an old one. The previous chain id and its contracts are gone.
 * (3890 previously belonged to an abandoned third-party chain; the id was deliberately reused.)
 *
 * Source of truth for every address: kalychain-ops/files/kmt-3890/addresses.json.
 * The RPC/explorer hostnames still say "testnet" until DNS cuts over.
 */
export const KALYCHAIN_CHAIN_ID = 3890;
export const KALYCHAIN_NAME = 'KalyChain';
export const KALYCHAIN_NATIVE_SYMBOL = 'KMT';
export const KALYCHAIN_RPC_URL = process.env.KALYCHAIN_RPC_URL || 'https://mainrpc.kalychain.io/rpc';
export const KALYCHAIN_EXPLORER_URL = process.env.KALYCHAIN_EXPLORER_URL || 'https://testnet.kalyscan.io';

/** Hyperlane domain == chain id on KalyChain. */
export const KALYCHAIN_DOMAIN = KALYCHAIN_CHAIN_ID;

/** Bridged (HypERC20 synthetic) tokens on KalyChain. WKMT is not bridged. */
export const KALYCHAIN_TOKENS = {
  WKMT: { address: '0xf90F0Bd56558Ac12F7FC285571D38181d2feD69b', symbol: 'WKMT', name: 'Wrapped KMT', decimals: 18 },
  USDT: { address: '0x6318EcDbae6B469D39C38949eDC671f4bA8A6172', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
  USDC: { address: '0xf00A4b733093C21b0892eae0578F0a926f9370b3', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  DAI: { address: '0x8fbff791fCcF596DEf2e788549d0275557F95A21', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
  WBTC: { address: '0xE3f1A8Af16d2Dcd0B6F1F813C449375f85C9d97F', symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8 },
  ETH: { address: '0x73b8fBACFF08DafD9a0a6cB8699C64a488d9EA2a', symbol: 'ETH', name: 'Ethereum', decimals: 18 },
} as const;

/**
 * Live warp routes from KalyChain, verified on-chain in both directions with matching decimals
 * (see frontend/src/config/bridge/warpRoutes.ts — keep the two in sync). KLC/BNB/POL routes were
 * dropped: they have no KalyChain leg after the relaunch.
 */
export const KALYCHAIN_WARP_ROUTES = [
  { id: 'usdt-arbitrum', token: 'USDT', destinationChain: 'arbitrum' },
  { id: 'usdt-polygon', token: 'USDT', destinationChain: 'polygon' },
  { id: 'usdc-arbitrum', token: 'USDC', destinationChain: 'arbitrum' },
  { id: 'dai-arbitrum', token: 'DAI', destinationChain: 'arbitrum' },
  { id: 'wbtc-arbitrum', token: 'WBTC', destinationChain: 'arbitrum' },
  { id: 'eth-arbitrum', token: 'ETH', destinationChain: 'arbitrum' },
] as const;

export const KALYCHAIN_CONTRACTS = {
  // Native KMT staking (KalyStaking, deployed 2026-08-25, block 170908)
  STAKING: '0xcd266886e83261219b1b7ba90bd6509820dd16a4',
  // Launchpad (padV3, audited + deployed 2026-08-25, blocks ~175800-175830)
  TOKEN_FACTORY_MANAGER: '0x380C25A239B1Edf8920f8f80364e3cf0E3dF0fA1',
  STANDARD_TOKEN_FACTORY: '0xbcdbe5901E91c8a61ec9F90bC282fbA41a0e7E39',
  REWARDS_TOKEN_FACTORY: '0x07149004fd2973fefA1D1772dE05cf9de1D0df32',
  PRESALE_V3_FACTORY: '0xa458bDf0eF62a1dF382b1Cf483B24339bF946054',
  FAIRLAUNCH_V3_FACTORY: '0xaDFdD46404442B6067A74C23ef72d076d1405E9e',
  // Hyperlane core (deployed 2026-08-21, blocks 1615-1676)
  MAILBOX: '0x069255299Bb729399f3CECaBdc73d15d3D10a2A3',
  MERKLE_TREE_HOOK: '0x3854DDa00aec0161615FEc74E4f7d26bBeA58798',
  VALIDATOR_ANNOUNCE: '0x1A29Eb3d2b87fCD6611E3C203E0065f1B26bF6F3',
} as const;
