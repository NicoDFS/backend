# KalySwap Backend - Local Development Setup

⚠️ **IMPORTANT**: This backend is under **active development**. Expect frequent changes, potential breaking updates, and incomplete features. Use for development purposes only.

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** (v18+ recommended)
- **npm** (comes with Node.js)
- **yarn** (for v2-subgraph): `npm install -g yarn`
- **Docker** and **Docker Compose**
- **Git**
- **Graph CLI**: `npm install -g @graphprotocol/graph-cli@0.97.0`

## Quick Setup Overview

1. Clone repository and install dependencies
2. Set up environment variables
3. Start database and Redis services
4. Set up and run Prisma database
5. Start Graph Node for subgraphs
6. Deploy subgraphs (⚠️ **2-day sync time**)
7. Start backend server

## Detailed Setup Instructions

### 1. Clone Repository and Install Dependencies

```bash
# Clone the repository (replace with actual repository URL)
git clone https://github.com/NicoDFS/backend.git
cd backend

# Install backend dependencies
npm install
```

### 2. Environment Configuration

Create a `.env.local` file in the backend directory:

```bash
# Database Configuration
DATABASE_URL="postgresql://kalyswap:kalyswap_password@localhost:5433/kalyswap_db"

# Blockchain Configuration
KALYCHAIN_RPC_URL="https://rpc.kalychain.io/rpc"

# Graph Node Configuration
GRAPH_NODE_URL="http://localhost:8000"

# API Configuration
NEXT_PUBLIC_API_URL="http://localhost:3000/api"

# JWT Secret (generate a secure random string)
JWT_SECRET="your-super-secure-jwt-secret-here"

# Optional: SMTP Configuration for alerts
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="alerts@example.com"
SMTP_PASS="password"
```

### 3. Start Database and Redis Services

```bash
# Start PostgreSQL and Redis containers
docker-compose up -d

# Verify services are running
docker-compose ps

# Wait for PostgreSQL to be ready (about 10-15 seconds)
sleep 15
```

### 4. Set Up Prisma Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Optional: Open Prisma Studio to view database
npm run prisma:studio
```

### 5. Set Up Graph Node for Subgraphs

```bash
# Navigate to subgraphs directory
cd subgraphs

# Create data directories (if they don't exist)
mkdir -p data/ipfs data/postgres

# Start Graph Node services
docker-compose up -d

# Verify Graph Node is running
docker-compose ps

# Wait for Graph Node to be ready (about 30 seconds)
sleep 30

# Check Graph Node status
curl http://localhost:8000/
```

### 6. Deploy Subgraphs

⚠️ **WARNING**: Full blockchain sync will take **2+ days** with high-speed internet. The subgraphs need to index all historical data from KalyChain since contract deployment.

#### Deploy DEX Subgraph (v2-subgraph)
```bash
cd v2-subgraph

# Install dependencies (uses yarn)
yarn install

# Generate types
yarn codegen

# Build subgraph
yarn build

# Create subgraph on local node
npm run create-local

# Deploy subgraph (starts 2-day sync process)
npm run deploy-local
```

#### Deploy Farming Subgraph
```bash
cd ../farm

# Install dependencies (uses npm)
npm install

# Generate types and build
npm run codegen
npm run build

# Create and deploy
npm run create-local
npm run deploy-local
```

#### Deploy Other Subgraphs (Optional)
```bash
# Staking Subgraph
cd ../staking
npm install && npm run codegen && npm run build
npm run create-local && npm run deploy-local

# Bridge Subgraph
cd ../bridge
npm install && npm run codegen && npm run build
npm run create-local && npm run deploy-local

# Launchpad Subgraph
cd ../launchpad
npm install && npm run codegen && npm run build
npm run create-local && npm run deploy-local
```

### 7. Start Backend Server

```bash
# Return to backend directory
cd ../../

# Start the development server
npm run dev
```

The backend will be available at:
- **GraphQL API**: http://localhost:3000/api/graphql
- **GraphQL Playground**: http://localhost:3000/api/graphql (in browser)

## Verification

### Test Backend API
```bash
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { dexOverview { klcPrice } }"}'
```

### Test Subgraph Endpoints
```bash
# DEX Subgraph
curl -X POST http://localhost:8000/subgraphs/name/kalyswap/dex-subgraph \
  -H "Content-Type: application/json" \
  -d '{"query": "query { pairs(first: 1) { id } }"}'

# Farming Subgraph
curl -X POST http://localhost:8000/subgraphs/name/kalyswap/farming-subgraph \
  -H "Content-Type: application/json" \
  -d '{"query": "query { liquidityPoolManagers(first: 1) { id } }"}'
```

## Important Notes

### Port Usage
- **Backend**: 3000
- **PostgreSQL (Backend)**: 5433
- **Redis**: 6379
- **Graph Node**: 8000, 8001, 8020, 8030, 8040
- **PostgreSQL (Graph Node)**: 5432
- **IPFS**: 5001
- **Adminer**: 8080

### Subgraph Sync Status
Monitor sync progress:
```bash
# Check sync status
curl http://localhost:8000/subgraphs/name/kalyswap/dex-subgraph

# View Graph Node logs
cd subgraphs && docker-compose logs -f graph-node
```

### Package Managers by Subgraph
- **v2-subgraph**: yarn
- **farm**: npm
- **staking**: npm
- **bridge**: npm
- **launchpad**: npm

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3000, 5432, 5433, 6379, 8000-8040 are available
2. **Docker issues**: Run `docker-compose down && docker-compose up -d` to restart services
3. **Subgraph sync stuck**: Check Graph Node logs and restart if necessary
4. **Database connection errors**: Verify PostgreSQL is running and credentials match

### Reset Everything
```bash
# Stop all services
docker-compose down
cd subgraphs && docker-compose down

# Remove data (WARNING: This deletes all data)
rm -rf subgraphs/data/*
docker volume prune -f

# Start fresh
docker-compose up -d
cd subgraphs && docker-compose up -d
```

## Development Status

🚧 **Active Development Areas**:
- DEX functionality and pricing
- LP farming integration
- Bridge implementation
- Mobile API optimization
- Database schema changes

📋 **Known Issues**:
- Subgraph sync is very slow (2+ days)
- Some API endpoints may return placeholder data
- Database migrations may change frequently

## Support

For development issues:
1. Check Docker container logs: `docker-compose logs [service-name]`
2. Verify all services are running: `docker-compose ps`
3. Check Graph Node status: `curl http://localhost:8000/`
4. Review backend logs in the terminal where `npm run dev` is running

---

**Last Updated**: July 31, 2025
**Backend Version**: 0.1.0 (Development)
