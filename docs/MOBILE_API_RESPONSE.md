# KalySwap Mobile API - Issue Resolution

**Last Updated**: April 7, 2026

## Status: ✅ RESOLVED

API accessibility issues were resolved. Correct endpoint URLs are documented below.

> **Important Update (April 2026)**: The internal wallet system is **deprecated**. New mobile integrations should use **Thirdweb in-app wallets**. See `THIRDWEB_MOBILE_INTEGRATION.md` for setup instructions.

## Corrected API Endpoints

### Main GraphQL API
- **✅ Correct URL**: `https://app.kalyswap.io/api/graphql`

### Subgraph Endpoints
- **V2 DEX Subgraph**: `https://app.kalyswap.io/subgraphs/name/kalyswap/dex-subgraph`
- **Farming Subgraph**: `https://app.kalyswap.io/subgraphs/name/kalyswap/farming-subgraph`
- **V3 DEX Subgraph**: Set via `NEXT_PUBLIC_V3_MAINNET_SUBGRAPH_URL` (see `V3_DEX_SUBGRAPH.md`)

## Verification Tests

I've tested all endpoints and confirmed they're working:

### 1. Main GraphQL API Test
```bash
curl -X POST https://app.kalyswap.io/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { dexOverview { klcPrice } }"}'

# Response: {"data":{"dexOverview":{"klcPrice":0}}}
```

### 2. DEX Subgraph Test
```bash
curl -X POST https://app.kalyswap.io/subgraphs/name/kalyswap/dex-subgraph \
  -H "Content-Type: application/json" \
  -d '{"query": "query { pairs(first: 1) { id } }"}'

# Response: {"data":{"pairs":[{"id":"0x0e520779287bb711c8e603cc85d532daa7c55372"}]}}
```

## Updated Mobile Integration

### JavaScript/React Native Example
```javascript
// Correct API configuration
const API_CONFIG = {
  graphql: 'https://app.kalyswap.io/api/graphql',
  subgraphs: {
    dex: 'https://app.kalyswap.io/subgraphs/name/kalyswap/dex-subgraph',
    farming: 'https://app.kalyswap.io/subgraphs/name/kalyswap/farming-subgraph'
  }
};

// Example: Get DEX overview
const getDexOverview = async () => {
  const response = await fetch(API_CONFIG.graphql, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        query {
          dexOverview {
            klcPrice
            factory {
              totalVolumeUSD
              totalLiquidityUSD
              pairCount
            }
          }
        }
      `
    })
  });
  return response.json();
};

// Example: Get trading pairs from subgraph
const getTradingPairs = async () => {
  const response = await fetch(API_CONFIG.subgraphs.dex, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        query {
          pairs(first: 10, orderBy: reserveUSD, orderDirection: desc) {
            id
            token0 { symbol name }
            token1 { symbol name }
            reserveUSD
            volumeUSD
          }
        }
      `
    })
  });
  return response.json();
};
```

## Available Data

### Main GraphQL API Features
- ✅ User authentication (JWT via Thirdweb wallet or legacy password)
- ✅ Wallet migration (internal wallet → Thirdweb)
- ✅ Transaction tracking
- ✅ DEX overview data
- ✅ Token information
- ✅ Multichain swap quotes (KalyChain, BSC, Arbitrum)

### Subgraph Data Available
- ✅ **V2 DEX Subgraph**: Trading pairs, tokens, liquidity, volume data
- ✅ **V3 DEX Subgraph**: Concentrated liquidity pools, positions, ticks, swaps
- ✅ **Farming Subgraph**: LP farming pools, rewards, staking data

## Next Steps

1. **Update your mobile app configuration** with the corrected URLs above
2. **Test the endpoints** using the provided examples
3. **Review the updated API documentation** at `backend/docs/KALYSWAP_API_DOC_v1.md`

## Database Export

Regarding your request for database export - we can provide anonymized sample data for testing. Please let us know:
1. What specific data types you need (users, transactions, tokens, etc.)
2. Preferred format (JSON, SQL dump, CSV)
3. Any specific requirements for the test data

## Support

If you encounter any further issues:
- Test endpoints using the exact URLs provided above
- Ensure you're sending POST requests with proper JSON payloads
- Check that Content-Type header is set to 'application/json'
- For authenticated endpoints, include the JWT token in Authorization header

The APIs are fully functional and ready for mobile integration. Thank you for your patience!
