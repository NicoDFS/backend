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
   KALYCHAIN_RPC_URL=https://rpc.kalychain.io
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

Follow the instructions in the Getting Started guide to create and deploy subgraphs for your contracts.

## Technologies

- Next.js
- TypeScript
- GraphQL (Apollo Server)
- ethers.js
- The Graph Protocol
