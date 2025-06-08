# KalySwap Launchpad Subgraph

This subgraph indexes the KalySwap Launchpad contracts on KalyChain, providing comprehensive data about token creation, presales, and fairlaunches.

## Contracts Indexed

### Core Infrastructure
- **TokenFactoryManager**: `0xd8C7417F6Da77D534586715Cb1187935043C5A8F`
  - Manages allowed token factories
  - Tracks token ownership and creation

### Token Factories
- **StandardTokenFactory**: `0xB9228A684822D557ABd419814bC6b536Fa34E3BD`
  - Creates standard ERC20 tokens
  - Tracks token creation events and fees

- **LiquidityGeneratorTokenFactory**: `0xa13567796eeB7357f48caC8d83b4c1b885B66762`
  - Creates liquidity generator tokens
  - Tracks token creation events and fees

### Launchpad Contracts
- **PresaleFactory**: `0x42CA326c90868e034293C679BD61F5B0e6c88149`
  - Creates presale contracts
  - Manages presale creation and configuration

- **FairlaunchFactory**: `0xcf2A1325b32c3818B24171513cc9F71ae74592B9`
  - Creates fairlaunch contracts
  - Manages fairlaunch creation and configuration

- **Individual Presales**: Dynamic contracts created by PresaleFactory
  - Track user participation, deposits, and withdrawals
  - Monitor presale status and finalization

- **Individual Fairlaunches**: Dynamic contracts created by FairlaunchFactory
  - Track user participation, deposits, and withdrawals
  - Monitor fairlaunch status and finalization

## Key Features

### Token Tracking
- Complete token creation history
- Token metadata (name, symbol, decimals, supply)
- Creator and factory information
- Token type classification

### Presale Management
- Presale configuration and parameters
- Real-time participation tracking
- Deposit and withdrawal history
- Status monitoring (Active, Successful, Failed, Cancelled)

### Fairlaunch Management
- Fairlaunch configuration and parameters
- Real-time participation tracking
- Deposit and withdrawal history
- Status monitoring (Active, Successful, Failed, Cancelled)

### Statistics and Analytics
- Global launchpad statistics
- Daily aggregated data
- Volume and participation metrics
- Active presales/fairlaunches count

## Entities

### Core Entities
- `TokenFactoryManager`: Central manager contract
- `TokenFactory`: Individual token factories
- `Token`: Created tokens with metadata
- `PresaleFactory` / `FairlaunchFactory`: Factory contracts
- `Presale` / `Fairlaunch`: Individual sale contracts

### Participation Entities
- `PresaleParticipant` / `FairlaunchParticipant`: User participation data
- `PresaleDeposit` / `FairlaunchDeposit`: Individual deposits
- `PresaleWithdrawal` / `FairlaunchWithdrawal`: Individual withdrawals

### Analytics Entities
- `LaunchpadStats`: Global statistics
- `LaunchpadDayData`: Daily aggregated data

## Configuration

- **Network**: KalyChain
- **Start Block**: 34399619
- **RPC Endpoint**: https://rpc.kalychain.io/rpc
- **Graph CLI Version**: 0.97.0
- **Graph TS Version**: 0.38.0

## Development Commands

```bash
# Install dependencies
npm install

# Generate types
npm run codegen

# Build subgraph
npm run build

# Create local subgraph
npm run create-local

# Deploy to local Graph Node
npm run deploy-local

# Remove local subgraph
npm run remove-local
```

## Deployment

The subgraph is configured to deploy to a local Graph Node instance:
- Graph Node: http://localhost:8020/
- IPFS: http://localhost:5001
- Subgraph Name: kalyswap/launchpad-subgraph

## Event Handling

### Token Creation Events
- `TokenCreated`: Tracks new token creation from factories
- `FeeToUpdated`: Monitors fee recipient changes
- `FlatFeeUpdated`: Tracks fee amount changes

### Presale/Fairlaunch Events
- `Participated`: User deposits and participation
- `TokensClaimed`: Token withdrawals by users
- `RefundClaimed`: Refund withdrawals
- `PresaleFinalized` / `FairlaunchFinalized`: Successful completion
- `PresaleCancelled` / `FairlaunchCancelled`: Cancellation events

## Data Relationships

The subgraph maintains comprehensive relationships between:
- Factories and their created tokens/sales
- Sales and their participants
- Participants and their deposits/withdrawals
- Global statistics and daily aggregations

## Notes

- Uses dynamic contract templates for individual presales and fairlaunches
- Implements comprehensive error handling and data validation
- Maintains both real-time and historical data
- Supports pagination and filtering through GraphQL queries
