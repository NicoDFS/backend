# Thirdweb In-App Wallet — Mobile Integration Guide

**Last Updated**: April 7, 2026

## Overview

KalySwap has migrated from an internal password-based wallet system to **Thirdweb in-app wallets**. The internal wallet system (createWallet, importWallet, exportWallet) is **deprecated** and will be removed. All new integrations must use Thirdweb.

This guide covers how to add Thirdweb in-app wallets to a mobile app (React Native, Swift, Kotlin) that connects to KalySwap.

---

## What Changed

| Before (Deprecated) | After (Current) |
|---------------------|-----------------|
| Backend creates/stores encrypted private keys | Thirdweb manages key material |
| Password-based transaction signing | Social auth (email, Google, Apple, etc.) |
| `createWallet` / `importWallet` mutations | Thirdweb SDK handles wallet creation |
| `sendContractTransaction(password)` mutation | Client-side signing via Thirdweb SDK |
| Backend signs transactions | User's device signs transactions |

### Deprecated Mutations (Do Not Use for New Code)
```graphql
# DEPRECATED — will be removed
createWallet(password: String!): Wallet!
importWallet(privateKey: String!, password: String!): Wallet!
exportWallet(walletId: ID!, password: String!): WalletExport!
sendTransaction(input: SendTransactionInput!): TransactionResponse!
sendContractTransaction(input: SendContractTransactionInput!): TransactionResponse!
```

### Wallet Migration Mutations (For Existing Users)
```graphql
# Link Thirdweb wallet to existing account
linkThirdwebWallet(thirdwebAddress: String!): MutationResult!

# Migration flow for moving funds from old internal wallets
startWalletMigration(oldWalletId: ID!, newWalletAddress: String!): WalletMigration!
migrateNativeTokens(password: String!, toAddress: String!, chainId: Int, reserveForTokenTransfers: Int): MigrateTxResult!
migrateTokens(password: String!, toAddress: String!, tokenAddresses: [String!]!, chainId: Int): MigrateTokensResult!
completeWalletMigration: MutationResult!
optOutWalletMigration: MutationResult!

# Check migration status
walletMigrationStatus: WalletMigrationStatusResponse
```

---

## Thirdweb Configuration

### Credentials

```
Client ID:  f4ce05ebc56f222fd4d5f23f9bb1587e
```

> **Note:** The secret key is for server-side use only. Mobile apps use only the **Client ID**.

### Supported Chains

| Chain | Chain ID | RPC URL |
|-------|----------|---------|
| KalyChain (mainnet) | 3888 | `https://rpc.kalychain.io/rpc` |
| KalyChain (testnet) | 3889 | `https://testnetrpc.kalychain.io/rpc` |
| Arbitrum One | 42161 | `https://arb1.arbitrum.io/rpc` |
| BNB Smart Chain | 56 | `https://bsc-dataseed.binance.org` |
| Clisha | 3890 | `https://rpc.clishachain.com/rpc` |

### Supported Auth Methods

- Email (OTP)
- Google
- Apple
- Phone (SMS)
- Passkey
- Discord
- Facebook

---

## Mobile Integration — React Native

### 1. Install the SDK

```bash
npm install thirdweb
# or
yarn add thirdweb
```

### 2. Create Thirdweb Client

```typescript
import { createThirdwebClient } from "thirdweb";

const client = createThirdwebClient({
  clientId: "f4ce05ebc56f222fd4d5f23f9bb1587e",
});
```

### 3. Define KalyChain

```typescript
import { defineChain } from "thirdweb/chains";

const kalychain = defineChain({
  id: 3888,
  rpc: "https://rpc.kalychain.io/rpc",
});

const kalychainTestnet = defineChain({
  id: 3889,
  rpc: "https://testnetrpc.kalychain.io/rpc",
});
```

### 4. Set Up In-App Wallet

```typescript
import { inAppWallet } from "thirdweb/wallets";

const wallet = inAppWallet({
  auth: {
    options: ["email", "google", "apple", "phone", "passkey"],
    mode: "popup",
  },
});
```

### 5. Connect Wallet (User Login)

```typescript
import { connect } from "thirdweb/wallets";

// Connect with email
const account = await wallet.connect({
  client,
  chain: kalychain,
  strategy: "email",
  email: "user@example.com",
  // User receives OTP via email, then verify:
  verificationCode: "123456",
});

// Connect with Google
const account = await wallet.connect({
  client,
  chain: kalychain,
  strategy: "google",
});

// Connect with Apple
const account = await wallet.connect({
  client,
  chain: kalychain,
  strategy: "apple",
});
```

### 6. Get Wallet Address

```typescript
const address = account.address;
console.log("Connected:", address);
```

### 7. Send Transactions

```typescript
import { sendTransaction, prepareContractCall } from "thirdweb";
import { getContract } from "thirdweb";

// Get contract instance
const swapRouter = getContract({
  client,
  chain: kalychain,
  address: "0xEAd6d6ea2aBbe807AC728Eb92c77865b62C41893", // V3 SwapRouter02
});

// Prepare and send transaction
const tx = prepareContractCall({
  contract: swapRouter,
  method: "function exactInputSingle(...)",
  params: [...],
});

const result = await sendTransaction({
  account,
  transaction: tx,
});
```

### 8. Read Contract Data

```typescript
import { readContract } from "thirdweb";

const balance = await readContract({
  contract: tokenContract,
  method: "function balanceOf(address) returns (uint256)",
  params: [account.address],
});
```

---

## Mobile Integration — Native iOS (Swift)

Thirdweb provides a Swift SDK. See: https://portal.thirdweb.com/connect/in-app-wallet/overview

```swift
import ThirdwebSDK

let client = ThirdwebClient(clientId: "f4ce05ebc56f222fd4d5f23f9bb1587e")

let wallet = InAppWallet(client: client, authOptions: [.email, .google, .apple])

// Connect
let account = try await wallet.connect(strategy: .google)
print("Address: \(account.address)")
```

---

## Mobile Integration — Native Android (Kotlin)

Thirdweb provides a Kotlin/Android SDK. See: https://portal.thirdweb.com/connect/in-app-wallet/overview

```kotlin
import com.thirdweb.ThirdwebClient
import com.thirdweb.wallets.InAppWallet

val client = ThirdwebClient(clientId = "f4ce05ebc56f222fd4d5f23f9bb1587e")

val wallet = InAppWallet(
    client = client,
    authOptions = listOf(AuthOption.EMAIL, AuthOption.GOOGLE, AuthOption.APPLE)
)

// Connect
val account = wallet.connect(strategy = AuthStrategy.Google)
println("Address: ${account.address}")
```

---

## Backend Authentication Flow

After connecting with Thirdweb on mobile, authenticate with the KalySwap backend:

### Step 1: Get Wallet Address from Thirdweb

```typescript
const walletAddress = account.address; // From Thirdweb SDK
```

### Step 2: Authenticate with Backend

```graphql
mutation AuthenticateWithWallet($walletAddress: String!) {
  authenticateWithWallet(walletAddress: $walletAddress) {
    token    # JWT token for subsequent requests
    user { id username email }
  }
}
```

### Step 3: Use JWT for All Subsequent Requests

```typescript
const response = await fetch('https://app.kalyswap.io/api/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`
  },
  body: JSON.stringify({ query, variables })
});
```

### Thirdweb Auth Endpoint (Backend)

The backend has a JWT verification endpoint for Thirdweb:

```
POST https://app.kalyswap.io/api/auth/thirdweb
```

This endpoint verifies Thirdweb JWTs and returns user session data. It's used internally by the Thirdweb SDK for authentication handshakes.

---

## Wallet Migration (Existing Users)

If a user previously had an internal wallet, they need to migrate funds to their new Thirdweb wallet:

### Flow:
1. User logs in with Thirdweb (gets new wallet address)
2. Call `linkThirdwebWallet(thirdwebAddress)` to associate with account
3. Check `walletMigrationStatus` to see old wallets
4. Call `startWalletMigration(oldWalletId, newWalletAddress)`
5. Call `migrateNativeTokens(password, toAddress)` — requires old wallet password
6. Call `migrateTokens(password, toAddress, tokenAddresses)` — for ERC20 tokens
7. Call `completeWalletMigration()` when done

### Example:
```graphql
# 1. Link new Thirdweb wallet
mutation { linkThirdwebWallet(thirdwebAddress: "0xabc...") { success message } }

# 2. Check migration status
query { walletMigrationStatus {
  thirdwebWalletAddress
  walletMigrationStatus
  wallets { id address chainId }
}}

# 3. Start migration
mutation { startWalletMigration(oldWalletId: "wallet-id", newWalletAddress: "0xabc...") {
  id oldWalletAddress newWalletAddress
}}

# 4. Migrate funds (requires old wallet password)
mutation { migrateNativeTokens(password: "old-password", toAddress: "0xabc...") {
  success txHash
}}

# 5. Complete
mutation { completeWalletMigration { success message } }
```

---

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `https://app.kalyswap.io/api/graphql` | POST | JWT | Main GraphQL API |
| `https://app.kalyswap.io/api/auth/thirdweb` | POST | Thirdweb JWT | Thirdweb auth verification |
| `https://app.kalyswap.io/subgraphs/name/kalyswap/dex-subgraph` | POST | None | V2 DEX data |
| `https://app.kalyswap.io/subgraphs/name/kalyswap/farming-subgraph` | POST | None | Farming data |

### V3 Subgraph (when deployed to production)
```
https://app.kalyswap.io/subgraphs/name/v3-subgraph-kalychain
```

---

## CORS: Mobile App Access

Native mobile apps (iOS/Android) do not send an `Origin` header. The backend is configured to allow requests without an Origin header, so mobile apps can call all endpoints directly without CORS issues.

If you encounter CORS errors on mobile, ensure:
1. You are **not** setting a custom `Origin` header in your HTTP client
2. You are using `Content-Type: application/json`
3. You include `Authorization: Bearer <token>` for authenticated requests

---

## Quick Reference: Old vs New

| Task | Old Way (Deprecated) | New Way (Thirdweb) |
|------|---------------------|-------------------|
| Create wallet | `createWallet(password)` mutation | `inAppWallet().connect()` via Thirdweb SDK |
| Sign transaction | `sendContractTransaction(password)` mutation | `sendTransaction()` via Thirdweb SDK |
| Auth methods | Username + password | Email, Google, Apple, phone, passkey |
| Key storage | Encrypted in backend DB | Managed by Thirdweb (device + cloud) |
| Login | `login(username, password)` | `authenticateWithWallet(walletAddress)` |

---

## Support

- Thirdweb Docs: https://portal.thirdweb.com
- Thirdweb React Native: https://portal.thirdweb.com/react-native
- KalySwap Backend GraphQL Playground: https://app.kalyswap.io/api/graphql
