# Multichain Swap API Documentation

## Overview

The KalySwap backend now supports multichain swap quotes for mobile applications. This allows mobile developers to get swap quotes and execute swaps on:

- **KalyChain** (Chain ID: 3888)
- **BNB Smart Chain** (Chain ID: 56)
- **Arbitrum One** (Chain ID: 42161)

## GraphQL Endpoint

```
https://app.kalyswap.io/api/graphql
```

## Authentication

All swap quote queries require JWT authentication. Include your JWT token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 1. Get Swap Quote

Get a quote for swapping tokens on any supported chain.

### Query

```graphql
query GetSwapQuote($chainId: Int!, $tokenIn: String!, $tokenOut: String!, $amountIn: String!) {
  swapQuote(
    chainId: $chainId
    tokenIn: $tokenIn
    tokenOut: $tokenOut
    amountIn: $amountIn
  ) {
    amountOut
    amountOutMin
    route
    priceImpact
    executionPrice
    fee
  }
}
```

### Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `chainId` | Int | Chain ID (3888, 56, or 42161) | `56` |
| `tokenIn` | String | Input token address (checksummed or lowercase) | `"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"` |
| `tokenOut` | String | Output token address (checksummed or lowercase) | `"0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56"` |
| `amountIn` | String | Input amount in wei (as string) | `"1000000000000000000"` (1 token with 18 decimals) |

### Response

```json
{
  "data": {
    "swapQuote": {
      "amountOut": "320500000000000000000",
      "amountOutMin": "318897500000000000000",
      "route": [
        "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
        "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56"
      ],
      "priceImpact": "0.15",
      "executionPrice": "320500000000000000000",
      "fee": "3000000000000000"
    }
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `amountOut` | String | Expected output amount in wei |
| `amountOutMin` | String | Minimum output amount with 0.5% slippage |
| `route` | [String] | Token addresses in the swap route |
| `priceImpact` | String | Price impact as percentage (e.g., "0.15" = 0.15%) |
| `executionPrice` | String | Execution price (amountOut per 1 tokenIn) |
| `fee` | String | Trading fee in wei |

### Example (JavaScript/TypeScript)

```typescript
const query = `
  query GetSwapQuote($chainId: Int!, $tokenIn: String!, $tokenOut: String!, $amountIn: String!) {
    swapQuote(
      chainId: $chainId
      tokenIn: $tokenIn
      tokenOut: $tokenOut
      amountIn: $amountIn
    ) {
      amountOut
      amountOutMin
      route
      priceImpact
      executionPrice
      fee
    }
  }
`;

const variables = {
  chainId: 56, // BSC
  tokenIn: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
  tokenOut: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", // BUSD
  amountIn: "1000000000000000000" // 1 BNB
};

const response = await fetch('https://app.kalyswap.io/api/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`
  },
  body: JSON.stringify({ query, variables })
});

const { data } = await response.json();
console.log('Swap quote:', data.swapQuote);
```

---

## 2. Get Router Configuration

Get router and WETH addresses for a specific chain.

### Query

```graphql
query GetRouterConfig($chainId: Int!) {
  swapRouterConfig(chainId: $chainId) {
    chainId
    routerAddress
    wethAddress
    chainName
  }
}
```

### Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `chainId` | Int | Chain ID (3888, 56, or 42161) | `56` |

### Response

```json
{
  "data": {
    "swapRouterConfig": {
      "chainId": 56,
      "routerAddress": "0x10ED43C718714eb63d5aA57B78B54704E256024E",
      "wethAddress": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      "chainName": "BNB Smart Chain"
    }
  }
}
```

---

## 3. Execute Swap

After getting a quote, execute the swap using the `sendContractTransaction` mutation.

### Step 1: Encode Swap Data

Use ethers.js or web3.js to encode the swap transaction:

```typescript
import { ethers } from 'ethers';

// Router ABI (minimal)
const routerABI = [
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

const router = new ethers.Interface(routerABI);

// For token-to-token swap
const data = router.encodeFunctionData('swapExactTokensForTokens', [
  amountIn,
  amountOutMin,
  route, // From swapQuote response
  userAddress,
  Math.floor(Date.now() / 1000) + 60 * 20 // 20 minute deadline
]);

// For ETH/BNB/KLC to token swap
const data = router.encodeFunctionData('swapExactETHForTokens', [
  amountOutMin,
  route,
  userAddress,
  Math.floor(Date.now() / 1000) + 60 * 20
]);
```

### Step 2: Send Transaction

```graphql
mutation ExecuteSwap($input: SendContractTransactionInput!) {
  sendContractTransaction(input: $input) {
    hash
    status
    message
  }
}
```

### Variables

```json
{
  "input": {
    "walletId": "user-wallet-id",
    "toAddress": "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    "value": "0",
    "data": "0x38ed1739...",
    "password": "user-password",
    "chainId": 56,
    "gasLimit": "200000"
  }
}
```

---

## Router Addresses

| Chain | Chain ID | Router Address | WETH Address |
|-------|----------|----------------|--------------|
| KalyChain | 3888 | `0x183F288BF7EEBe1A3f318F4681dF4a70ef32B2f3` | `0x069255299Bb729399f3CECaBdc73d15d3D10a2A3` (WKLC) |
| BSC | 56 | `0x10ED43C718714eb63d5aA57B78B54704E256024E` | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` (WBNB) |
| Arbitrum | 42161 | `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D` | `0x82aF49447D8a07e3bd95BD0d56f35241523fBab1` (WETH) |

---

## Complete Swap Flow

### 1. Get Quote
```typescript
const quote = await getSwapQuote(chainId, tokenIn, tokenOut, amountIn);
```

### 2. Approve Token (if needed)
```typescript
// Check allowance first
const allowance = await tokenContract.allowance(userAddress, routerAddress);

if (allowance < amountIn) {
  // Approve router to spend tokens
  await sendContractTransaction({
    toAddress: tokenIn,
    data: encodeApprove(routerAddress, amountIn),
    value: "0",
    chainId
  });
}
```

### 3. Execute Swap
```typescript
const swapData = encodeSwap(amountIn, quote.amountOutMin, quote.route, userAddress);

const tx = await sendContractTransaction({
  toAddress: routerAddress,
  data: swapData,
  value: isNativeToken ? amountIn : "0",
  chainId
});
```

### 4. Track Transaction
```typescript
await trackSwapTransaction({
  walletId,
  hash: tx.hash,
  fromAddress: tokenIn,
  toAddress: tokenOut,
  amount: amountIn,
  ...
});
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Unsupported chain ID` | Invalid chainId | Use 3888, 56, or 42161 |
| `Invalid tokenIn address` | Malformed address | Use valid Ethereum address format |
| `Insufficient liquidity` | No liquidity pool | Try different token pair |
| `Input amount is too small` | Amount below minimum | Increase input amount |
| `INSUFFICIENT_OUTPUT_AMOUNT` | Slippage too high | Increase slippage tolerance |

### Example Error Response

```json
{
  "errors": [
    {
      "message": "Failed to get swap quote: Insufficient liquidity for this trading pair",
      "extensions": {
        "code": "INTERNAL_SERVER_ERROR"
      }
    }
  ]
}
```

---

## Rate Limiting

- No rate limiting on swap quote queries
- Standard API rate limits apply to transaction mutations

## Support

For questions or issues, contact the KalySwap development team.

