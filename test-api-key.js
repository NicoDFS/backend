const axios = require('axios');

const GRAPHQL_ENDPOINT = 'http://localhost:3000/api/graphql';

async function testApiKeySystem() {
  console.log('🧪 Testing API Key Authentication System\n');

  try {
    // Step 1: Register a test user
    console.log('1️⃣ Registering test user...');
    const registerMutation = `
      mutation {
        register(username: "testuser", email: "test@example.com", password: "testpassword123") {
          token
          user {
            id
            username
            email
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

    const { token, user } = registerResponse.data.data.register;
    console.log('✅ User registered successfully:', user.username);

    // Step 2: Create an API key using JWT authentication
    console.log('\n2️⃣ Creating API key...');
    const createApiKeyMutation = `
      mutation {
        createApiKey(
          name: "Mobile App Key"
          permissions: [READ_PUBLIC, READ_USER, WRITE_USER]
        ) {
          apiKey
          record {
            id
            name
            permissions
            prefix
            isActive
          }
        }
      }
    `;

    const apiKeyResponse = await axios.post(GRAPHQL_ENDPOINT, {
      query: createApiKeyMutation
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (apiKeyResponse.data.errors) {
      console.log('❌ API key creation failed:', apiKeyResponse.data.errors[0].message);
      return;
    }

    const { apiKey, record } = apiKeyResponse.data.data.createApiKey;
    console.log('✅ API key created successfully:');
    console.log(`   Key: ${apiKey.substring(0, 20)}...`);
    console.log(`   Name: ${record.name}`);
    console.log(`   Permissions: ${record.permissions.join(', ')}`);

    // Step 3: Test API key authentication
    console.log('\n3️⃣ Testing API key authentication...');
    const meQuery = `
      query {
        me {
          id
          username
          email
        }
      }
    `;

    const meResponse = await axios.post(GRAPHQL_ENDPOINT, {
      query: meQuery
    }, {
      headers: {
        'Authorization': `ApiKey ${apiKey}`
      }
    });

    if (meResponse.data.errors) {
      console.log('❌ API key authentication failed:', meResponse.data.errors[0].message);
      return;
    }

    const meData = meResponse.data.data.me;
    console.log('✅ API key authentication successful:');
    console.log(`   User: ${meData.username} (${meData.email})`);

    // Step 4: Test wallet creation with API key
    console.log('\n4️⃣ Testing wallet creation with API key...');
    const createWalletMutation = `
      mutation {
        createWallet(password: "walletpassword123") {
          id
          address
          chainId
        }
      }
    `;

    const walletResponse = await axios.post(GRAPHQL_ENDPOINT, {
      query: createWalletMutation
    }, {
      headers: {
        'Authorization': `ApiKey ${apiKey}`
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

    // Step 5: Test DEX data access (public data)
    console.log('\n5️⃣ Testing DEX data access...');
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
      }
    `;

    const dexResponse = await axios.post(GRAPHQL_ENDPOINT, {
      query: dexQuery
    }, {
      headers: {
        'Authorization': `ApiKey ${apiKey}`
      }
    });

    if (dexResponse.data.errors) {
      console.log('❌ DEX data access failed:', dexResponse.data.errors[0].message);
    } else {
      console.log('✅ DEX data access successful');
      console.log(`   KLC Price: ${dexResponse.data.data.dexOverview?.klcPrice || 'N/A'}`);
    }

    // Step 6: List user's API keys
    console.log('\n6️⃣ Listing user API keys...');
    const apiKeysQuery = `
      query {
        myApiKeys {
          id
          name
          prefix
          permissions
          isActive
          createdAt
        }
      }
    `;

    const apiKeysResponse = await axios.post(GRAPHQL_ENDPOINT, {
      query: apiKeysQuery
    }, {
      headers: {
        'Authorization': `ApiKey ${apiKey}`
      }
    });

    if (apiKeysResponse.data.errors) {
      console.log('❌ API keys listing failed:', apiKeysResponse.data.errors[0].message);
    } else {
      const apiKeys = apiKeysResponse.data.data.myApiKeys;
      console.log('✅ API keys listed successfully:');
      apiKeys.forEach(key => {
        console.log(`   - ${key.name} (${key.prefix}...) - ${key.permissions.join(', ')}`);
      });
    }

    console.log('\n🎉 All tests passed! API key system is working correctly.');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testApiKeySystem();
