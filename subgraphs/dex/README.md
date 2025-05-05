# KalySwap DEX Subgraph

This subgraph indexes and tracks data from the KalySwap DEX contracts on KalyChain.

## Entities

### Core DEX Entities
- **Factory**: Tracks the KalySwap factory contract and global statistics
- **Token**: Tracks individual tokens traded on KalySwap
- **Pair**: Tracks liquidity pairs and their statistics
- **Swap**: Records individual swap events
- **Mint**: Records liquidity provision events
- **Burn**: Records liquidity removal events
- **DayData**: Aggregates daily statistics for the entire DEX
- **PairDayData**: Aggregates daily statistics for each pair
- **TokenDayData**: Aggregates daily statistics for each token
- **TransferEvent**: Records token transfer events
- **ApprovalEvent**: Records token approval events

### Staking Entities
- **StakingPool**: Tracks staking pools and their statistics
- **Staker**: Tracks users who stake tokens
- **StakeEvent**: Records staking events
- **WithdrawEvent**: Records withdrawal events
- **RewardEvent**: Records reward claim events
- **RewardAddedEvent**: Records when rewards are added to a pool

### Liquidity Pool Manager Entities
- **LiquidityPoolManager**: Tracks the liquidity pool manager contract
- **WhitelistedPool**: Tracks whitelisted pools and their weights

### Treasury Vester Entities
- **TreasuryVester**: Tracks the treasury vester contract
- **TokensVestedEvent**: Records vesting events

## Setup and Deployment

### Prerequisites

- Node.js and Yarn
- Running Graph Node (see docker-compose.yml in parent directory)

### Installation

```bash
# Install dependencies
yarn install
```

### Deployment

```bash
# Generate code from schema
yarn codegen

# Build the subgraph
yarn build

# Deploy to local Graph Node
yarn deploy-local
```

## Querying the Subgraph

Once deployed, you can query the subgraph using GraphQL at:

```
http://localhost:8000/subgraphs/name/kalyswap/dex-subgraph
```

Example query:

```graphql
{
  factory(id: "0xD42Af909d323D88e0E933B6c50D3e91c279004ca") {
    pairCount
    totalVolumeUSD
    totalLiquidityUSD
  }
  pairs(first: 10, orderBy: reserveUSD, orderDirection: desc) {
    id
    token0 {
      symbol
    }
    token1 {
      symbol
    }
    reserveUSD
    volumeUSD
  }
}
```

## Contract Addresses

### Core DEX Contracts
- Factory: 0xD42Af909d323D88e0E933B6c50D3e91c279004ca
- Router: 0x183F288BF7EEBe1A3f318F4681dF4a70ef32B2f3
- WKLC: 0x069255299Bb729399f3CECaBdc73d15d3D10a2A3
- KSWAP: 0xCC93b84cEed74Dc28c746b7697d6fA477ffFf65a

### Additional Contracts
- StakingRewards: 0x2bD4B7f303C1f372689d52A55ec202E0cf831a26
- LiquidityPoolManagerV2: 0xe83e7ede1358FA87e5039CF8B1cffF383Bc2896A
- TreasuryVester: 0x4C4b968232a8603e2D1e53AB26E9a0319fA33ED3
