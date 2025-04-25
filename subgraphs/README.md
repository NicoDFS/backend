# KalySwap Subgraphs

This directory contains subgraphs for indexing KalySwap contracts on KalyChain.

## Prerequisites

- Docker and Docker Compose
- Node.js and npm

## Setting up the Graph Node

1. Create the data directories:
   ```bash
   mkdir -p data/ipfs data/postgres
   ```

2. Start the Graph Node:
   ```bash
   docker-compose up -d
   ```

3. Check if the Graph Node is running:
   ```bash
   docker-compose ps
   ```

## Deploying the Staking Subgraph

1. Navigate to the staking subgraph directory:
   ```bash
   cd staking
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Generate AssemblyScript types:
   ```bash
   npm run codegen
   ```

4. Build the subgraph:
   ```bash
   npm run build
   ```

5. Create the subgraph on the local Graph Node:
   ```bash
   npm run create-local
   ```

6. Deploy the subgraph:
   ```bash
   npm run deploy-local
   ```

## Accessing the Subgraph

Once deployed, you can access the GraphQL endpoint at:
http://localhost:8000/subgraphs/name/kalyswap/staking-subgraph

You can also use the GraphQL Playground at:
http://localhost:8000/subgraphs/name/kalyswap/staking-subgraph/graphql

## Example Queries

### Get Staking Pool Information

```graphql
{
  stakingPools {
    id
    totalStaked
    rewardRate
    rewardsDuration
    periodFinish
    paused
  }
}
```

### Get User Information

```graphql
{
  users {
    id
    address
    stakedAmount
    rewards
    lastAction
    lastActionTimestamp
  }
}
```

### Get Staking Events

```graphql
{
  stakeEvents(orderBy: timestamp, orderDirection: desc, first: 10) {
    user {
      address
    }
    amount
    timestamp
    transactionHash
  }
}
```
