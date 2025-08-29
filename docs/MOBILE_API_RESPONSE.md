# KalySwap Mobile API - Issue Resolution

## Status: ✅ RESOLVED

Thank you for reporting the API accessibility issues. I've identified and resolved the problems. The APIs are working correctly, but there were incorrect URLs in the documentation.

## Corrected API Endpoints

### Main GraphQL API
- **❌ Incorrect URL**: `https://kalyswap.io/api/graphql` (returns 404)
- **✅ Correct URL**: `https://app.kalyswap.io/api/graphql`

### Subgraph Endpoints
- **❌ Incorrect URLs**: 
  - `https://app.kalyswap.io/subgraphs/name/kalyswap/dex-subgraph/graphql` (GraphiQL interface)
  - `https://app.kalyswap.io/subgraphs/name/kalyswap/farming-subgraph/graphql` (GraphiQL interface)

- **✅ Correct URLs**:
  - DEX Subgraph: `https://app.kalyswap.io/subgraphs/name/kalyswap/dex-subgraph`
  - Farming Subgraph: `https://app.kalyswap.io/subgraphs/name/kalyswap/farming-subgraph`

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
- ✅ User authentication (JWT)
- ✅ Wallet management
- ✅ Transaction tracking
- ✅ DEX overview data
- ✅ Token information

### Subgraph Data Available
- ✅ **DEX Subgraph**: Trading pairs, tokens, liquidity, volume data
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
