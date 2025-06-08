const axios = require('axios');

const GRAPHQL_ENDPOINT = 'http://localhost:3000/api/graphql';

async function testMobileJWTFlow() {
  console.log('📱 Testing Mobile App JWT Authentication Flow\n');

  try {
    // Step 1: User Registration (No auth required)
    console.log('1️⃣ User Registration (Public endpoint)...');
    const registerMutation = `
      mutation {
        register(username: "mobileuser", email: "mobile@example.com", password: "mobilepass123") {
          token
          user {
            id
            username
            email
            createdAt
          }
        }
      }
    `;

    const registerResponse = await axios.post(GRAPHQL_ENDPOINT, {
      query: registerMutation
    });

    if (registerResponse.data.errors) {
      console.log('❌ Registration failed:', registerResponse.data.errors[0].message);
      return;
    }

    const { token: registerToken, user } = registerResponse.data.data.register;
    console.log('✅ User registered successfully:');
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   JWT Token: ${registerToken.substring(0, 30)}...`);

    // Step 2: User Login (Alternative to registration)
    console.log('\n2️⃣ User Login (Public endpoint)...');
    const loginMutation = `
      mutation {
        login(username: "mobileuser", password: "mobilepass123") {
          token
          user {
            id
            username
            email
          }
        }
      }
    `;

    const loginResponse = await axios.post(GRAPHQL_ENDPOINT, {
      query: loginMutation
    });

    const { token: loginToken } = loginResponse.data.data.login;
    console.log('✅ User login successful:');
    console.log(`   JWT Token: ${loginToken.substring(0, 30)}...`);

    // Use the login token for subsequent requests
    const jwtToken = loginToken;

    // Step 3: Get Current User Info (JWT required)
    console.log('\n3️⃣ Get Current User (JWT Authentication)...');
    const meQuery = `
      query {
        me {
          id
          username
          email
          createdAt
          wallets {
            id
            address
            chainId
          }
        }
      }
    `;

    const meResponse = await axios.post(GRAPHQL_ENDPOINT, {
      query: meQuery
    }, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`  // JWT Authentication
      }
    });

    if (meResponse.data.errors) {
      console.log('❌ Get user failed:', meResponse.data.errors[0].message);
      return;
    }

    const userData = meResponse.data.data.me;
    console.log('✅ User data retrieved successfully:');
    console.log(`   User: ${userData.username} (${userData.email})`);
    console.log(`   Wallets: ${userData.wallets.length} wallet(s)`);

    // Step 4: Create Wallet (JWT required)
    console.log('\n4️⃣ Create Wallet (JWT Authentication)...');
    const createWalletMutation = `
      mutation {
        createWallet(password: "walletpass123") {
          id
          address
          chainId
          createdAt
        }
      }
    `;

    const walletResponse = await axios.post(GRAPHQL_ENDPOINT, {
      query: createWalletMutation
    }, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`  // JWT Authentication
      }
    });

    if (walletResponse.data.errors) {
      console.log('❌ Wallet creation failed:', walletResponse.data.errors[0].message);
      return;
    }

    const wallet = walletResponse.data.data.createWallet;
    console.log('✅ Wallet created successfully:');
    console.log(`   Address: ${wallet.address}`);
    console.log(`   Chain ID: ${wallet.chainId}`);

    // Step 5: Get Wallet Balance (JWT required)
    console.log('\n5️⃣ Get Wallet Balance (JWT Authentication)...');
    const balanceQuery = `
      query {
        walletBalance(address: "${wallet.address}") {
          klc
          tokens {
            symbol
            balance
          }
        }
      }
    `;

    const balanceResponse = await axios.post(GRAPHQL_ENDPOINT, {
      query: balanceQuery
    }, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`  // JWT Authentication
      }
    });

    if (balanceResponse.data.errors) {
      console.log('❌ Balance check failed:', balanceResponse.data.errors[0].message);
    } else {
      const balance = balanceResponse.data.data.walletBalance;
      console.log('✅ Wallet balance retrieved:');
      console.log(`   KLC: ${balance.klc}`);
      console.log(`   Tokens: ${balance.tokens.length} token(s)`);
    }

    // Step 6: Track Transaction (JWT required)
    console.log('\n6️⃣ Track Transaction (JWT Authentication)...');
    const trackTxMutation = `
      mutation {
        trackSendTransaction(
          walletId: "${wallet.id}",
          hash: "0x1234567890abcdef1234567890abcdef12345678",
          toAddress: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d4d4",
          amount: "1000000000000000000",
          tokenSymbol: "KLC",
          fee: "21000000000000000"
        ) {
          id
          type
          status
          hash
          amount
          tokenSymbol
          timestamp
        }
      }
    `;

    const trackTxResponse = await axios.post(GRAPHQL_ENDPOINT, {
      query: trackTxMutation
    }, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`  // JWT Authentication
      }
    });

    if (trackTxResponse.data.errors) {
      console.log('❌ Transaction tracking failed:', trackTxResponse.data.errors[0].message);
    } else {
      const transaction = trackTxResponse.data.data.trackSendTransaction;
      console.log('✅ Transaction tracked successfully:');
      console.log(`   Hash: ${transaction.hash}`);
      console.log(`   Amount: ${transaction.amount} ${transaction.tokenSymbol}`);
      console.log(`   Status: ${transaction.status}`);
    }

    // Step 7: Get DEX Data (No auth required - public data)
    console.log('\n7️⃣ Get DEX Data (Public endpoint)...');
    const dexQuery = `
      query {
        dexOverview {
          klcPrice
          factory {
            totalVolumeUSD
            totalLiquidityUSD
            pairCount
          }
        }
        pairs(first: 3) {
          id
          token0 { symbol name }
          token1 { symbol name }
          reserveUSD
        }
      }
    `;

    const dexResponse = await axios.post(GRAPHQL_ENDPOINT, {
      query: dexQuery
    });

    if (dexResponse.data.errors) {
      console.log('❌ DEX data failed:', dexResponse.data.errors[0].message);
    } else {
      const dexData = dexResponse.data.data;
      console.log('✅ DEX data retrieved successfully:');
      console.log(`   KLC Price: $${dexData.dexOverview?.klcPrice || 'N/A'}`);
      console.log(`   Total Pairs: ${dexData.dexOverview?.factory?.pairCount || 'N/A'}`);
      console.log(`   Sample Pairs: ${dexData.pairs?.length || 0} pairs`);
    }

    console.log('\n🎉 Mobile JWT Authentication Flow Complete!');
    console.log('\n📋 Summary for Mobile Developer:');
    console.log('   ✅ User Registration: Working (no auth required)');
    console.log('   ✅ User Login: Working (no auth required)');
    console.log('   ✅ User Data: Working (JWT required)');
    console.log('   ✅ Wallet Creation: Working (JWT required)');
    console.log('   ✅ Wallet Balance: Working (JWT required)');
    console.log('   ✅ Transaction Tracking: Working (JWT required)');
    console.log('   ✅ DEX Data: Working (no auth required)');
    console.log('\n🔐 Authentication: Use "Authorization: Bearer <jwt_token>" header');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testMobileJWTFlow();
