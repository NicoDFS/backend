# KalySwap Mobile API Documentation

## Overview

This document provides comprehensive API documentation for mobile developers to integrate with the KalySwap backend. The API uses GraphQL with **JWT authentication** for secure mobile app access.

## Base URL

```
Production: https://app.kalyswap.io/api/graphql
Development: http://localhost:3000/api/graphql
```

## Subgraph Endpoints

For direct subgraph access (without GraphiQL interface):

```
DEX Subgraph: https://app.kalyswap.io/subgraphs/name/kalyswap/dex-subgraph
Farming Subgraph: https://app.kalyswap.io/subgraphs/name/kalyswap/farming-subgraph
```

**Note**: These endpoints accept POST requests with GraphQL queries in the request body.

## Authentication

### 🔐 JWT Authentication (Recommended for Mobile Apps)

Mobile apps should use JWT (JSON Web Token) authentication for secure, user-specific access:

```
Authorization: Bearer <jwt_token>
```

### 🔑 How to Get JWT Tokens

1. **User Registration** (returns JWT token):
```graphql
mutation {
  register(username: "user", email: "user@example.com", password: "password") {
    token    # Use this JWT token for authenticated requests
    user { id username email }
  }
}
```

2. **User Login** (returns JWT token):
```graphql
mutation {
  login(username: "user", password: "password") {
    token    # Use this JWT token for authenticated requests
    user { id username email }
  }
}
```

### 🛡️ Security Best Practices

- **Store JWT tokens securely** (iOS Keychain, Android Keystore)
- **Include JWT in Authorization header** for all authenticated requests
- **Handle token expiration** gracefully (re-authenticate when needed)
- **Never hardcode credentials** in your mobile app

### 📋 Authentication Requirements

| Operation Type | Authentication Required |
|----------------|------------------------|
| User Registration | ❌ **None** (public endpoint) |
| User Login | ❌ **None** (public endpoint) |
| DEX Data (prices, pairs) | ❌ **None** (public endpoint) |
| User Profile | ✅ **JWT Required** |
| Wallet Operations | ✅ **JWT Required** |
| Transaction Tracking | ✅ **JWT Required** |

### 🔧 Alternative: API Key Authentication

API keys are available for server-to-server integrations but **not recommended for mobile apps** due to security concerns. If you need API key access for specific use cases, contact your backend team.

## Core Functionality

### 1. User Authentication

#### Register a New User

```graphql
mutation Register($username: String!, $email: String, $password: String!) {
  register(username: $username, email: $email, password: $password) {
    token
    user {
      id
      username
      email
      createdAt
      updatedAt
    }
  }
}
```

**Variables:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

#### Login User

```graphql
mutation Login($username: String!, $password: String!) {
  login(username: $username, password: $password) {
    token
    user {
      id
      username
      email
      createdAt
      updatedAt
    }
  }
}
```

#### Get Current User

```graphql
query Me {
  me {
    id
    username
    email
    createdAt
    updatedAt
    wallets {
      id
      address
      chainId
      createdAt
      balance {
        klc
        tokens {
          symbol
          balance
        }
      }
    }
  }
}
```

**Headers Required:**
```
Authorization: Bearer <jwt_token>
```

### 2. Wallet Management

#### Create New Wallet

```graphql
mutation CreateWallet($password: String!) {
  createWallet(password: $password) {
    id
    address
    chainId
    createdAt
    updatedAt
  }
}
```

**Headers Required:**
```
Authorization: Bearer <jwt_token>
```

#### Import Existing Wallet

```graphql
mutation ImportWallet($privateKey: String!, $password: String!) {
  importWallet(privateKey: $privateKey, password: $password) {
    id
    address
    chainId
    createdAt
    updatedAt
  }
}
```

**Headers Required:**
```
Authorization: Bearer <jwt_token>
```

#### Export Wallet

```graphql
query ExportWallet($walletId: ID!, $password: String!) {
  exportWallet(walletId: $walletId, password: $password) {
    keystore
    privateKey
  }
}
```

**Headers Required:**
```
Authorization: Bearer <jwt_token>
```

#### Get Wallet Balance

```graphql
query WalletBalance($address: String!) {
  walletBalance(address: $address) {
    klc
    tokens {
      symbol
      balance
    }
  }
}
```

**Headers Required:**
```
Authorization: Bearer <jwt_token>
```

### 3. DEX Data Access

#### Get DEX Overview

```graphql
query DexOverview {
  dexOverview {
    factory {
      totalVolumeUSD
      totalLiquidityUSD
      pairCount
    }
    klcPrice
    topPairs {
      id
      token0 {
        symbol
        name
      }
      token1 {
        symbol
        name
      }
      reserveUSD
      volumeUSD
    }
  }
}
```

**Headers Required:** ❌ **None** (Public endpoint)

#### Get Trading Pairs

```graphql
query Pairs($first: Int, $skip: Int, $orderBy: String, $orderDirection: String) {
  pairs(first: $first, skip: $skip, orderBy: $orderBy, orderDirection: $orderDirection) {
    id
    token0 {
      id
      symbol
      name
      decimals
    }
    token1 {
      id
      symbol
      name
      decimals
    }
    reserve0
    reserve1
    reserveUSD
    volumeUSD
    token0Price
    token1Price
  }
}
```

**Headers Required:** ❌ **None** (Public endpoint)

#### Get Token Information

```graphql
query Tokens($first: Int, $skip: Int) {
  tokens(first: $first, skip: $skip) {
    id
    symbol
    name
    decimals
    tradeVolume
    tradeVolumeUSD
    totalLiquidity
    derivedKLC
  }
}
```

**Headers Required:** ❌ **None** (Public endpoint)

### 4. Transaction Tracking

#### Track Send Transaction

```graphql
mutation TrackSendTransaction(
  $walletId: ID!,
  $hash: String!,
  $toAddress: String!,
  $amount: String!,
  $tokenAddress: String,
  $tokenSymbol: String,
  $tokenDecimals: Int,
  $fee: String
) {
  trackSendTransaction(
    walletId: $walletId,
    hash: $hash,
    toAddress: $toAddress,
    amount: $amount,
    tokenAddress: $tokenAddress,
    tokenSymbol: $tokenSymbol,
    tokenDecimals: $tokenDecimals,
    fee: $fee
  ) {
    id
    type
    status
    hash
    fromAddress
    toAddress
    amount
    tokenSymbol
    fee
    timestamp
  }
}
```

**Headers Required:**
```
Authorization: Bearer <jwt_token>
```

#### Get User Transactions

```graphql
query UserTransactions($limit: Int, $offset: Int) {
  userTransactions(limit: $limit, offset: $offset) {
    id
    type
    status
    hash
    fromAddress
    toAddress
    amount
    tokenSymbol
    fee
    blockNumber
    timestamp
  }
}
```

**Headers Required:**
```
Authorization: Bearer <jwt_token>
```

#### Update Transaction Status

```graphql
mutation UpdateTransactionStatus($hash: String!, $status: String!, $blockNumber: Int) {
  updateTransactionStatus(hash: $hash, status: $status, blockNumber: $blockNumber) {
    id
    status
    blockNumber
  }
}
```

**Headers Required:**
```
Authorization: Bearer <jwt_token>
```

## Error Handling

The API returns standard GraphQL errors. Common error types:

- **Authentication required**: User must be authenticated
- **Insufficient permissions**: API key lacks required permissions
- **Invalid input**: Validation errors for input parameters
- **Not found**: Requested resource doesn't exist

Example error response:
```json
{
  "errors": [
    {
      "message": "Authentication required",
      "locations": [{"line": 2, "column": 3}],
      "path": ["me"]
    }
  ]
}
```

## Rate Limiting

JWT tokens are subject to reasonable rate limiting:
- **Default**: 1000 requests per hour per user
- **Burst**: Up to 100 requests per minute per user

Rate limit headers may be included in responses:
- `X-RateLimit-Limit`: Total requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Time when limit resets

## Best Practices

1. **Store JWT tokens securely** - Use iOS Keychain or Android Keystore
2. **Handle token expiration** - Re-authenticate when tokens expire
3. **Handle errors gracefully** - Implement proper error handling
4. **Use pagination** - For large data sets, use limit/offset parameters
5. **Cache public data** - Cache DEX data to reduce API calls
6. **Never hardcode credentials** - Store user credentials securely

## 🚀 Quick Start Example

Here's a complete example of how to integrate with the API:

```javascript
// 1. User Login
const loginResponse = await fetch('https://app.kalyswap.io/api/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `
      mutation {
        login(username: "myuser", password: "mypassword") {
          token
          user { id username email }
        }
      }
    `
  })
});

const { token, user } = loginResponse.data.login;

// 2. Store token securely (platform-specific)
await SecureStorage.setItem('jwt_token', token);

// 3. Make authenticated requests
const userDataResponse = await fetch('https://app.kalyswap.io/api/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`  // JWT Authentication
  },
  body: JSON.stringify({
    query: `
      query {
        me {
          wallets {
            address
            balance { klc }
          }
        }
      }
    `
  })
});

// 4. Access public data (no authentication required)
const dexDataResponse = await fetch('https://app.kalyswap.io/api/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `
      query {
        dexOverview {
          klcPrice
          factory { totalVolumeUSD }
        }
      }
    `
  })
});
```

## Support

For API support and questions:
- Documentation: This file
- GraphQL Playground: Available at `/api/graphql` in development
- Contact: Your development team
