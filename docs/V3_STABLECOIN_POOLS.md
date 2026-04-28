# V3 Stablecoin Pool Deployment Plan

**Last Updated**: April 7, 2026  
**Status**: Contracts deployed, pools not yet created

## Executive Summary

KalySwap V3 contracts are deployed to KalyChain mainnet (Chain ID: 3888) as of April 6, 2026. The next step is creating stablecoin liquidity pools. This document outlines what needs to happen, what's already configured, and what requires manual action.

## Current State

- **V3 Contracts**: All 8 core contracts deployed and verified
- **V3 Subgraph**: Configured for mainnet, ready to index
- **Stablecoin Tokens**: USDT, USDC, DAI already exist on KalyChain and are pre-configured in all config files
- **Pools**: None created yet

## Two Ways to Create V3 Pools

There are two options for getting liquidity into V3 pools. Both are valid and can be used together.

### Option A: Create Fresh V3 Pools

Create brand new V3 pools and add fresh liquidity to them. This is the simplest approach — go to the KalySwap app, select V3, pick a token pair and fee tier, set a price range, and deposit tokens.

### Option B: Migrate Existing V2 Liquidity to V3

If there is already liquidity in V2 pools (e.g., V2 wKLC/USDT), that liquidity can be **migrated directly to V3** using the built-in migration tool. This is done through the KalySwap web app — no terminal commands needed.

**How it works for liquidity providers:**
1. Go to the **Pools > Migrate** page on the KalySwap app
2. Select a V2 LP position to migrate
3. Choose the V3 fee tier (e.g., 0.05% for stablecoin pairs)
4. Set a price range for the V3 position
5. Confirm the migration transaction in your wallet

The migration happens in a single transaction: it removes liquidity from the V2 pair and creates a new V3 position with the specified price range. The starting price is automatically set based on the current V2 market price, so there's no manual price calculation needed.

**Key points:**
- Migration is per-user — each LP migrates their own position when they're ready
- V2 pools continue to work alongside V3 — nothing breaks for users who don't migrate
- V3 offers better capital efficiency, so LPs earn more fees with less capital in the right price range
- The migration contract is already deployed at `0x1935DC82D5847eE21c4ce39515D26894b3CCADD7`

### Recommended Approach

For the initial launch, we recommend **combining both options**:

1. **Seed a fresh wKLC/USDT V3 pool** with initial liquidity (Option A) — this is needed first for the price oracle
2. **Encourage existing V2 LPs to migrate** over time using the migration tool (Option B)
3. **Create remaining pools** (wKLC/USDC, USDT/USDC, etc.) either way

---

## Recommended Initial Pools

| Pool | Fee Tier | Why |
|------|----------|-----|
| wKLC/USDT | 0.05% (500 bps) | Primary price oracle pool — **create this first** |
| wKLC/USDC | 0.05% (500 bps) | Secondary stable pair |
| USDT/USDC | 0.01% (100 bps) | Stablecoin-to-stablecoin, minimal impermanent loss |
| wKLC/DAI | 0.05% (500 bps) | DAI pair |

**The wKLC/USDT pool must be created first** — the subgraph uses it as the price oracle to derive USD values for all other tokens.

## What's Already Configured (No Changes Needed)

| Component | Status | Details |
|-----------|--------|---------|
| Stablecoin addresses in subgraph whitelist | Done | USDT, USDC, DAI in `WHITELIST_TOKENS` |
| Stablecoin addresses in `STABLE_COINS` list | Done | Used for price classification |
| Frontend token lists | Done | All stablecoins have logos, decimals, addresses |
| Fee tier constants | Done | 0.01%, 0.05%, 0.3%, 1% all defined |
| Frontend stablecoin price logic | Done | `STABLECOIN_ADDRESSES` in contracts.ts |
| Auto pool discovery | Done | Subgraph indexes `PoolCreated` events automatically |

## What Requires Manual Action After Pool Creation

### 1. Update Subgraph Price Oracle (CRITICAL)

**File**: `v3-subgraph/config/kalychain-mainnet/chain.ts`

After creating the wKLC/USDT pool, get its address from the `PoolCreated` event and update:

```typescript
// Change from:
export const STABLE_TOKEN_POOL = ''

// Change to:
export const STABLE_TOKEN_POOL = '0x<WKLC_USDT_POOL_ADDRESS>'
```

**Impact if not done**: All USD price calculations return $0. Pool TVL, volume, and token prices will show as zero across the entire platform.

### 2. Rebuild & Redeploy V3 Subgraph

```bash
cd v3-subgraph
npm run build -- --network kalychain --subgraph-type v3
npx graph deploy --node http://127.0.0.1:8020 --ipfs http://127.0.0.1:5001 \
  --version-label v0.0.2 v3-subgraph-kalychain v3-subgraph.yaml
```

### 3. Set Frontend Environment Variable

```bash
NEXT_PUBLIC_V3_MAINNET_SUBGRAPH_URL=http://127.0.0.1:8000/subgraphs/name/v3-subgraph-kalychain
```

### 4. (Optional) Configure Farming Incentives

If offering KSWAP rewards on stablecoin pools, update `frontend/src/config/dex/v3-incentives.ts` with incentive parameters (reward token, pool address, start/end times).

## Rollout Steps (Ordered)

| # | Step | Who | How |
|---|------|-----|-----|
| 1 | Create wKLC/USDT V3 pool + add initial liquidity | Team member with tokens | Via KalySwap app (Pools page, select V3, 0.05% fee) |
| 2 | Record the new pool's contract address | Dev team | From the transaction receipt or block explorer |
| 3 | Update subgraph price oracle config | Dev team | One line change in config file (see below) |
| 4 | Rebuild & redeploy V3 subgraph | Dev team | ~30 min |
| 5 | Verify pool shows on frontend with USD prices | QA / Dev | Check the Pools and Swap pages |
| 6 | Create remaining pools (wKLC/USDC, USDT/USDC, wKLC/DAI) | Team | Via KalySwap app |
| 7 | (Optional) Encourage V2 LPs to migrate to V3 | Community / Marketing | Users self-serve via Pools > Migrate page |
| 8 | (Optional) Set up farming incentives on V3 pools | Dev team | Config file update |

## Risk / Gotchas

- **Price depends on first pool**: If wKLC/USDT pool has very low liquidity, price oracle will be inaccurate and susceptible to manipulation. Seed with reasonable liquidity.
- **Decimal mismatch**: USDT and USDC are 6 decimals, wKLC and DAI are 18 decimals. Price initialization must account for this when calculating `sqrtPriceX96`.
- **Subgraph reindex**: After updating `STABLE_TOKEN_POOL`, the subgraph needs to reindex from the start block to recalculate historical USD prices. This takes time depending on how many events have been indexed.

## Timeline Estimate

| Step | Time |
|------|------|
| Create pools + add liquidity | 1-2 hours |
| Update subgraph config + redeploy | 30 min |
| Subgraph sync (from block 47564956) | 1-4 hours (depends on block count) |
| Frontend verification | 30 min |
| **Total** | **~Half day** |

## Contract Addresses Reference

| Contract | Address |
|----------|---------|
| V3 Factory | `0x93d72B9f57bed44Ada9712c022ccB3a9B2dA07BE` |
| NonfungiblePositionManager | `0xfa25364Ec856E1C0dd6D14568456C842b288E519` |
| SwapRouter02 | `0xEAd6d6ea2aBbe807AC728Eb92c77865b62C41893` |
| V3 Migrator (V2 → V3) | `0x1935DC82D5847eE21c4ce39515D26894b3CCADD7` |
| V3 Staker | `0x32d851DB4bcBEC0108bC947a99D7f009C1FE095e` |
| WKLC | `0x069255299Bb729399f3CECaBdc73d15d3D10a2A3` |
| USDT | `0x2CA775C77B922A51FcF3097F52bFFdbc0250D99A` |
| USDC | `0x9cAb0c396cF0F4325913f2269a0b72BD4d46E3A9` |
| DAI | `0x6E92CAC380F7A7B86f4163fad0df2F277B16Edc6` |
