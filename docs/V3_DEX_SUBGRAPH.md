# KalySwap V3 DEX — Contracts, Subgraph & Stablecoin Pools

**Last Updated**: April 7, 2026

## Overview

KalySwap V3 is a concentrated liquidity DEX (Uniswap V3 fork) deployed on KalyChain mainnet (Chain ID: 3888). This document covers contract addresses, subgraph endpoints, and the process for creating and configuring stablecoin pools.

---

## V3 Contract Addresses (Mainnet — Chain ID: 3888)

Deployed April 6, 2026.

| Contract | Address |
|----------|---------|
| V3 Core Factory | `0x93d72B9f57bed44Ada9712c022ccB3a9B2dA07BE` |
| SwapRouter02 | `0xEAd6d6ea2aBbe807AC728Eb92c77865b62C41893` |
| QuoterV2 | `0xb8764047cCF14A3D939D206CB36E101DEBE986ED` |
| NonfungiblePositionManager | `0xfa25364Ec856E1C0dd6D14568456C842b288E519` |
| V3Migrator | `0x1935DC82D5847eE21c4ce39515D26894b3CCADD7` |
| V3Staker | `0x32d851DB4bcBEC0108bC947a99D7f009C1FE095e` |
| TickLens | `0xf33F090A5a0c07A23e60815e5046132eD6721432` |
| Multicall2 | `0xA5053705CF050EB4BBb2696ae0302d52D436b542` |
| WKLC (Wrapped KLC) | `0x069255299Bb729399f3CECaBdc73d15d3D10a2A3` |

### Testnet Contracts (Chain ID: 3889)

| Contract | Address |
|----------|---------|
| V3 Core Factory | `0x709E8f0C1dd43C81263fEAe6f0847E2d6506e57b` |
| SwapRouter02 | `0x3246523054b0Bb123372ecf204740Cb04f6E713e` |
| QuoterV2 | `0x74BC8eE533ed6520457FC6C81cFC093A491e49AF` |
| NonfungiblePositionManager | `0x8064558662896B2941B2BF88eb51182b4152d61B` |

---

## V3 Subgraph

The V3 subgraph indexes all Factory, Pool, and Staker events on KalyChain mainnet. New pools are **automatically indexed** — no manual registration needed.

### Endpoints

```
Local:       http://127.0.0.1:8000/subgraphs/name/v3-subgraph-kalychain
Production:  <set NEXT_PUBLIC_V3_MAINNET_SUBGRAPH_URL in .env>
```

### Indexed Events

| Data Source | Events |
|-------------|--------|
| Factory | `PoolCreated` |
| Pool (template) | `Initialize`, `Swap`, `Mint`, `Burn`, `Collect` |
| V3Staker | `IncentiveCreated`, `IncentiveEnded`, `TokenStaked`, `TokenUnstaked`, `DepositTransferred`, `RewardClaimed` |

### Key Entities

- **Factory** — Global stats (pool count, total volume, total TVL)
- **Pool** — Per-pool data (token pair, fee tier, liquidity, volume, tick)
- **Token** — Token metadata and derived prices
- **Mint/Burn/Swap/Collect** — Individual transaction records
- **Tick** — Tick-level liquidity data
- **PoolDayData/PoolHourData** — Time-series snapshots
- **Incentive/Stake/StakerDeposit/RewardClaim** — V3 staking data

### Example Queries

**Get all V3 pools:**
```graphql
query {
  pools(first: 20, orderBy: totalValueLockedUSD, orderDirection: desc) {
    id
    token0 { symbol name decimals }
    token1 { symbol name decimals }
    feeTier
    liquidity
    totalValueLockedUSD
    volumeUSD
  }
}
```

**Get recent swaps:**
```graphql
query {
  swaps(first: 10, orderBy: timestamp, orderDirection: desc) {
    id
    pool { token0 { symbol } token1 { symbol } feeTier }
    amount0
    amount1
    amountUSD
    timestamp
  }
}
```

**Get token price data:**
```graphql
query {
  tokens(where: { symbol: "WKLC" }) {
    symbol
    derivedETH
    totalValueLockedUSD
    volumeUSD
  }
}
```

### Build & Deploy the Subgraph

```bash
cd v3-subgraph

# Build for mainnet
npm run build -- --network kalychain --subgraph-type v3

# Create subgraph on local Graph Node
npx graph create --node http://127.0.0.1:8020 v3-subgraph-kalychain

# Deploy
npx graph deploy \
  --node http://127.0.0.1:8020 \
  --ipfs http://127.0.0.1:5001 \
  --version-label v0.0.1 \
  v3-subgraph-kalychain v3-subgraph.yaml
```

---

## Stablecoin Tokens on KalyChain

| Token | Decimals | Address |
|-------|----------|---------|
| USDT | 6 | `0x2CA775C77B922A51FcF3097F52bFFdbc0250D99A` |
| USDC | 6 | `0x9cAb0c396cF0F4325913f2269a0b72BD4d46E3A9` |
| DAI | 18 | `0x6E92CAC380F7A7B86f4163fad0df2F277B16Edc6` |

These are already configured in:
- Subgraph whitelist (`v3-subgraph/config/kalychain-mainnet/chain.ts`)
- Frontend token lists (`frontend/src/config/dex/tokens/kalychain.ts`)
- Frontend stablecoin constants (`frontend/src/config/contracts.ts`)

---

## V3 Fee Tiers

| Tier | Fee | Tick Spacing | Best For |
|------|-----|-------------|----------|
| LOWEST | 0.01% (100 bps) | 1 | Stablecoin-to-stablecoin (USDT/USDC) |
| LOW | 0.05% (500 bps) | 10 | Stable pairs (wKLC/USDT) |
| MEDIUM | 0.3% (3000 bps) | 60 | Most pairs |
| HIGH | 1% (10000 bps) | 200 | Exotic/volatile pairs |

**Recommended for stablecoin pools:**
- USDT/USDC: 0.01% fee tier
- wKLC/USDT: 0.05% fee tier
- wKLC/USDC: 0.05% fee tier

---

## Creating Stablecoin Pools — Step by Step

### Step 1: Create the Pool

Call `Factory.createPool()` on the V3 Core Factory contract:

```solidity
// Example: Create wKLC/USDT pool at 0.05% fee
Factory.createPool(
  "0x069255299Bb729399f3CECaBdc73d15d3D10a2A3", // wKLC
  "0x2CA775C77B922A51FcF3097F52bFFdbc0250D99A", // USDT
  500 // 0.05% fee tier
)
```

### Step 2: Initialize the Pool

Call `Pool.initialize()` with the starting sqrt price:

```solidity
// sqrt(price) * 2^96
// For wKLC at $0.01 with USDT (6 decimals vs 18 decimals):
Pool.initialize(sqrtPriceX96)
```

### Step 3: Add Initial Liquidity

Use the NonfungiblePositionManager to mint a position:

```solidity
NonfungiblePositionManager.mint({
  token0: "0x069255299Bb729399f3CECaBdc73d15d3D10a2A3",
  token1: "0x2CA775C77B922A51FcF3097F52bFFdbc0250D99A",
  fee: 500,
  tickLower: -887220,  // Full range for initial liquidity
  tickUpper: 887220,
  amount0Desired: ...,
  amount1Desired: ...,
  amount0Min: 0,
  amount1Min: 0,
  recipient: deployerAddress,
  deadline: block.timestamp + 3600
})
```

### Step 4: Update Subgraph Config (CRITICAL)

After the first wKLC/stablecoin pool is created, update `STABLE_TOKEN_POOL` in `v3-subgraph/config/kalychain-mainnet/chain.ts`:

```typescript
// BEFORE:
export const STABLE_TOKEN_POOL = '' // Will be set once first KLC/stablecoin V3 pool is created

// AFTER:
export const STABLE_TOKEN_POOL = '0x<YOUR_WKLC_USDT_POOL_ADDRESS>'
```

**This is required for USD price calculations.** Without it, all USD valuations in the subgraph will be zero.

### Step 5: Rebuild & Redeploy Subgraph

```bash
cd v3-subgraph
npm run build -- --network kalychain --subgraph-type v3

npx graph deploy \
  --node http://127.0.0.1:8020 \
  --ipfs http://127.0.0.1:5001 \
  --version-label v0.0.2 \
  v3-subgraph-kalychain v3-subgraph.yaml
```

### Step 6: Set Frontend Environment Variable

```bash
# In frontend/.env or .env.local
NEXT_PUBLIC_V3_MAINNET_SUBGRAPH_URL=http://127.0.0.1:8000/subgraphs/name/v3-subgraph-kalychain
```

### Step 7 (Optional): Add Incentives

If offering farming rewards on stablecoin pools, update `frontend/src/config/dex/v3-incentives.ts`:

```typescript
export const KNOWN_INCENTIVES: IncentiveKey[] = [
  {
    rewardToken: '0xCC93b84cEed74Dc28c746b7697d6fA477ffFf65a', // KSWAP
    pool: '0x<wKLC_USDT_POOL_ADDRESS>',
    startTime: BigInt(1712534400), // Unix timestamp
    endTime: BigInt(1715126400),
    refundee: '0x<TREASURY_ADDRESS>',
  },
];
```

---

## Checklist: After Creating Stablecoin Pools

| # | Task | Required? |
|---|------|-----------|
| 1 | Create pool via Factory.createPool() | Yes |
| 2 | Initialize pool with starting price | Yes |
| 3 | Add initial liquidity | Yes |
| 4 | Set `STABLE_TOKEN_POOL` in subgraph config | **Yes — critical for pricing** |
| 5 | Rebuild & redeploy V3 subgraph | Yes |
| 6 | Set `NEXT_PUBLIC_V3_MAINNET_SUBGRAPH_URL` env var | Yes |
| 7 | Configure incentives in v3-incentives.ts | Optional |
| 8 | Update token whitelist in subgraph | No — already done |
| 9 | Update frontend token lists | No — already done |
| 10 | Register pools in frontend config | No — auto-discovered via subgraph |

---

## Architecture Notes

- **Auto Pool Discovery**: The subgraph listens for `PoolCreated` events from the Factory. New pools are automatically indexed — no manual registration in config files.
- **Price Oracle**: The subgraph uses the `STABLE_TOKEN_POOL` (wKLC/stablecoin) to derive `getEthPriceInUSD()`. This is the foundation for all USD valuations across the platform.
- **Frontend Pool Display**: Pool lists are dynamically fetched from the subgraph. No hardcoded pool lists.
- **V2 and V3 Coexist**: V2 DEX (Factory `0xD42Af909d...`) remains operational alongside V3. Users can migrate V2 positions to V3 using the V3Migrator contract.

---

## Support

For questions about V3 contracts, subgraph, or pool creation:
- V3 config: `frontend/src/config/dex/v3-config.ts`
- Subgraph config: `v3-subgraph/config/kalychain-mainnet/chain.ts`
- Subgraph schema: `v3-subgraph/src/v3/schema.graphql`
- Deploy scripts: `deploy-v3/`
