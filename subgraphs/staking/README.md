# KalySwap Staking Subgraph

This subgraph indexes events from the KalyStaking contract on KalyChain.

## Contract Details

- **Contract Address**: `0xF670A2D32a2b25e181B26Abb02614a20eA1eA2D9`
- **Start Block**: `20992295`

## Entities

- **StakingPool**: Information about the staking pool
- **User**: Information about users who have interacted with the staking pool
- **StakeEvent**: Records of staking events
- **WithdrawEvent**: Records of withdrawal events
- **RewardEvent**: Records of reward claim events
- **RewardAddedEvent**: Records of rewards being added to the pool
- **RewardsDurationUpdatedEvent**: Records of rewards duration updates
- **PauseEvent**: Records of pause/unpause events

## Deployment Instructions

### Prerequisites

- A running Graph Node instance
- Node.js and npm installed

### Steps

1. Install dependencies:
   ```bash
   npm install
   ```

2. Generate AssemblyScript types from the subgraph schema and ABIs:
   ```bash
   npm run codegen
   ```

3. Build the subgraph:
   ```bash
   npm run build
   ```

4. Create the subgraph on your local Graph Node:
   ```bash
   npm run create-local
   ```

5. Deploy the subgraph to your local Graph Node:
   ```bash
   npm run deploy-local
   ```

## Querying the Subgraph

Once deployed, you can query the subgraph using GraphQL. Here are some example queries:

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

### Get Reward Events

```graphql
{
  rewardEvents(orderBy: timestamp, orderDirection: desc, first: 10) {
    user {
      address
    }
    amount
    timestamp
    transactionHash
  }
}
```
