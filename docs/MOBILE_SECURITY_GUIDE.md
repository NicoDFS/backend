# Mobile App Security Guide

## Recommended Authentication Flow for Mobile Apps

### 🔐 **Secure JWT-Based Authentication (Recommended)**

Instead of using API keys, use our existing JWT system with enhanced security:

#### **1. User Registration/Login Flow**
```graphql
# Step 1: User registers/logs in
mutation Login($username: String!, $password: String!) {
  login(username: $username, password: $password) {
    token          # Short-lived JWT (1-7 days)
    user {
      id
      username
      email
    }
  }
}
```

#### **2. Secure Token Storage**
```javascript
// Mobile app should store JWT securely
// iOS: Keychain Services
// Android: Android Keystore or EncryptedSharedPreferences

// Example for React Native with react-native-keychain
import * as Keychain from 'react-native-keychain';

// Store token securely
await Keychain.setInternetCredentials(
  'kalyswap_auth',
  'user_token',
  jwtToken
);

// Retrieve token securely
const credentials = await Keychain.getInternetCredentials('kalyswap_auth');
const token = credentials.password;
```

#### **3. API Requests with JWT**
```javascript
// Use JWT in Authorization header
const response = await fetch('https://api.kalyswap.com/api/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`,  // Much safer than API keys
  },
  body: JSON.stringify({
    query: `
      query {
        me {
          id
          username
          wallets {
            address
            balance { klc }
          }
        }
      }
    `
  })
});
```

### 🔄 **Token Refresh Strategy**

Implement automatic token refresh for better security:

```javascript
// Enhanced token management
class AuthManager {
  constructor() {
    this.token = null;
    this.refreshToken = null; // If implementing refresh tokens
    this.tokenExpiry = null;
  }

  async getValidToken() {
    // Check if token is expired or about to expire
    if (this.isTokenExpired()) {
      await this.refreshAuthToken();
    }
    return this.token;
  }

  isTokenExpired() {
    if (!this.tokenExpiry) return true;
    // Refresh 5 minutes before expiry
    return Date.now() > (this.tokenExpiry - 5 * 60 * 1000);
  }

  async refreshAuthToken() {
    // Re-authenticate user or use refresh token
    // This depends on your refresh strategy
  }
}
```

## 🛡️ **Additional Security Measures**

### **1. Certificate Pinning**
```javascript
// Pin your server's SSL certificate
// Prevents man-in-the-middle attacks
const pinnedCertificate = 'your-server-cert-hash';

// Configure network client with certificate pinning
```

### **2. App Attestation (Advanced)**
```javascript
// Verify app integrity before API calls
// iOS: App Attest API
// Android: Play Integrity API
```

### **3. Request Signing (Advanced)**
```javascript
// Sign critical requests with device-specific keys
const signature = await signRequest(requestBody, deviceKey);
headers['X-Request-Signature'] = signature;
```

## 🔧 **Hybrid Approach: API Keys for Public Data Only**

If you still want to use API keys, limit them to **public data only**:

### **Safe API Key Usage:**
```javascript
// ✅ SAFE: Public data with read-only API key
const publicApiKey = 'kaly_public_readonly_key';

// Get DEX prices, pairs, public statistics
const dexData = await fetch('/api/graphql', {
  headers: {
    'Authorization': `ApiKey ${publicApiKey}`,
  },
  body: JSON.stringify({
    query: `
      query {
        dexOverview {
          klcPrice
          factory { totalVolumeUSD }
        }
        pairs(first: 10) {
          token0 { symbol }
          token1 { symbol }
          reserveUSD
        }
      }
    `
  })
});

// ❌ UNSAFE: User-specific operations should use JWT
// Don't use API keys for:
// - Wallet operations
// - User data
// - Transaction tracking
// - Any write operations
```

## 📋 **Implementation Recommendations**

### **For Your Mobile Developer:**

1. **Use JWT Authentication** for all user-specific operations
2. **Store tokens securely** using platform-specific secure storage
3. **Implement token refresh** to minimize exposure window
4. **Use API keys only** for public, read-only data (if at all)
5. **Add certificate pinning** for production apps
6. **Implement proper error handling** for auth failures

### **Backend Enhancements Needed:**

1. **Shorter JWT expiry** (1-2 hours instead of 7 days)
2. **Refresh token mechanism** for seamless re-authentication
3. **Rate limiting** per user/IP
4. **Request logging** for security monitoring

## 🎯 **Recommended Architecture**

```
Mobile App Security Flow:
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   Our Backend   │    │   Database      │
│                 │    │                  │    │                 │
│ 1. User Login   │───▶│ 2. Validate      │───▶│ 3. Check User   │
│                 │    │    Credentials   │    │                 │
│ 4. Store JWT    │◀───│ 5. Return JWT    │◀───│ 6. Generate JWT │
│    Securely     │    │    (short-lived) │    │                 │
│                 │    │                  │    │                 │
│ 7. API Calls    │───▶│ 8. Validate JWT  │    │                 │
│    with JWT     │    │    + Permissions │    │                 │
│                 │    │                  │    │                 │
│ 9. Auto-refresh │───▶│ 10. New JWT      │    │                 │
│    when needed  │    │     if valid     │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```
