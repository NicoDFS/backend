/**
 * Test script for swap quote endpoint
 * Run with: node test-swap-quote.js
 */

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

// Test cases for different chains
const testCases = [
  {
    name: 'KalyChain: WKLC to USDT',
    variables: {
      chainId: 3888,
      tokenIn: '0x069255299Bb729399f3CECaBdc73d15d3D10a2A3', // WKLC
      tokenOut: '0x2CA775C77B922A51FcF3097F52bFFdbc0250D99A', // USDT
      amountIn: '1000000000000000000' // 1 WKLC
    }
  },
  {
    name: 'BSC: WBNB to BUSD',
    variables: {
      chainId: 56,
      tokenIn: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
      tokenOut: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', // BUSD
      amountIn: '1000000000000000000' // 1 BNB
    }
  },
  {
    name: 'Arbitrum: WETH to USDC',
    variables: {
      chainId: 42161,
      tokenIn: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
      tokenOut: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
      amountIn: '1000000000000000000' // 1 ETH
    }
  }
];

async function testSwapQuote(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`   Chain ID: ${testCase.variables.chainId}`);
  console.log(`   Amount In: ${testCase.variables.amountIn}`);

  try {
    const response = await fetch('http://localhost:3000/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: testCase.variables
      })
    });

    const result = await response.json();

    if (result.errors) {
      console.log(`   ❌ Error: ${result.errors[0].message}`);
      return false;
    }

    if (result.data && result.data.swapQuote) {
      const quote = result.data.swapQuote;
      console.log(`   ✅ Success!`);
      console.log(`   Amount Out: ${quote.amountOut}`);
      console.log(`   Amount Out Min: ${quote.amountOutMin}`);
      console.log(`   Route: ${quote.route.join(' → ')}`);
      console.log(`   Price Impact: ${quote.priceImpact}%`);
      console.log(`   Fee: ${quote.fee}`);
      return true;
    }

    console.log(`   ❌ Unexpected response format`);
    return false;
  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}`);
    return false;
  }
}

async function testRouterConfig() {
  console.log(`\n🔧 Testing Router Config Query`);

  const configQuery = `
    query GetRouterConfig($chainId: Int!) {
      swapRouterConfig(chainId: $chainId) {
        chainId
        routerAddress
        wethAddress
        chainName
      }
    }
  `;

  for (const chainId of [3888, 56, 42161]) {
    try {
      const response = await fetch('http://localhost:3000/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: configQuery,
          variables: { chainId }
        })
      });

      const result = await response.json();

      if (result.errors) {
        console.log(`   ❌ Chain ${chainId}: ${result.errors[0].message}`);
        continue;
      }

      if (result.data && result.data.swapRouterConfig) {
        const config = result.data.swapRouterConfig;
        console.log(`   ✅ ${config.chainName} (${config.chainId})`);
        console.log(`      Router: ${config.routerAddress}`);
        console.log(`      WETH: ${config.wethAddress}`);
      }
    } catch (error) {
      console.log(`   ❌ Chain ${chainId}: ${error.message}`);
    }
  }
}

async function runTests() {
  console.log('🚀 Starting Swap Quote API Tests');
  console.log('================================\n');

  // Test router config first
  await testRouterConfig();

  // Test swap quotes
  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const success = await testSwapQuote(testCase);
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log('\n================================');
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('================================\n');

  if (failed === 0) {
    console.log('✅ All tests passed! Swap quote endpoint is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.');
  }
}

// Run tests
runTests().catch(console.error);

