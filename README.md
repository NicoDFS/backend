# KalySwap V3 Backend

This is the backend for KalySwap V3, a next-generation trading platform that seamlessly integrates limit orders and an orderbook with decentralized exchange (DEX) liquidity sources, bridging services, and a token launchpad into a unified experience.

## Project Structure

```
src/
├── graphql/                # GraphQL API layer
│   ├── resolvers/          # GraphQL resolvers
│   ├── types/              # GraphQL type definitions
│   ├── context/            # GraphQL context
│   └── schema.ts           # GraphQL schema
├── blockchain/             # Blockchain integration
│   ├── contracts/          # Smart contract interfaces
│   ├── abis/               # Contract ABIs
│   └── providers/          # Blockchain providers
├── services/               # Business logic services
│   ├── dex/                # DEX integration service
│   ├── bridge/             # Bridge integration service
│   ├── launchpad/          # Launchpad integration service
│   └── staking/            # Staking integration service
├── utils/                  # Utility functions
└── pages/                  # Next.js pages
    └── api/                # API routes
        └── graphql.ts      # GraphQL API endpoint
```

## Getting Started

### Prerequisites

- Node.js (v16+)
- A running Graph Node instance (for subgraph queries)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file with the following variables:
   ```
   KALYCHAIN_RPC_URL=https://rpc.kalychain.io/rpc
   GRAPH_NODE_URL=http://localhost:8000
   NEXT_PUBLIC_API_URL=http://localhost:3000/api
   ```

### Development

Start the development server:

```bash
npm run dev
```

The GraphQL API will be available at http://localhost:3000/api/graphql

### Importing ABIs

Place your contract ABIs in the appropriate directories:

```
src/blockchain/abis/dex/
src/blockchain/abis/bridge/
src/blockchain/abis/launchpad/
src/blockchain/abis/staking/
```

### Creating Subgraphs

The project uses subgraphs to index blockchain data. We've set up a local Graph Node for development and created a subgraph for the staking contract.

#### Setting up the Graph Node

1. Navigate to the subgraphs directory:
   ```bash
   cd subgraphs
   ```

2. Start the Graph Node using Docker Compose:
   ```bash
   docker-compose up -d
   ```

3. Check the status of the Graph Node:
   ```bash
   docker-compose ps
   ```

4. Check the indexing status:
   ```bash
   curl -X POST http://localhost:8030/graphql -H "Content-Type: application/json" -d '{"query": "{ indexingStatusForCurrentVersion(subgraphName: \"kalyswap/staking-subgraph\") { synced health chains { network latestBlock { number } chainHeadBlock { number } } } }"}'
   ```

#### Staking Subgraph

The staking subgraph indexes data from the KalyStaking contract at `0xF670A2D32a2b25e181B26Abb02614a20eA1eA2D9` starting from block 20992295.

1. Navigate to the staking subgraph directory:
   ```bash
   cd subgraphs/staking
   ```

2. Generate AssemblyScript types:
   ```bash
   npm run codegen
   ```

3. Build the subgraph:
   ```bash
   npm run build
   ```

4. Create the subgraph on the local Graph Node:
   ```bash
   npm run create-local
   ```

5. Deploy the subgraph:
   ```bash
   npm run deploy-local
   ```

6. Query the subgraph:
   ```bash
   curl -X POST http://localhost:8000/subgraphs/name/kalyswap/staking-subgraph -H "Content-Type: application/json" -d '{"query": "{ stakingPools { id address totalStaked rewardRate } }"}'
   ```

### Admin Dashboard

We've created a basic admin dashboard for managing the platform. The dashboard is located in the `/admin` directory at the root of the project.

To start the admin dashboard:

```bash
cd ../admin
npm run dev
```

The admin dashboard will be available at http://localhost:3001 (or another port if 3001 is in use).

### Current Status

- **Backend API**: Basic GraphQL API set up with mock data for staking
- **Staking Subgraph**: Created and deployed, currently indexing
- **Admin Dashboard**: Basic UI implemented with staking management
- **Next Steps**:
  - Complete subgraph indexing
  - Connect backend to subgraph data
  - Implement DEX, Bridge, and Monitoring components

## Technologies

- Next.js
- TypeScript
- GraphQL (Apollo Server)
- ethers.js
- The Graph Protocol
