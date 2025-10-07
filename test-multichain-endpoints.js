#!/usr/bin/env node

/**
 * Test script for multichain swap endpoints
 * Run with: node test-multichain-endpoints.js
 */

const http = require('http');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

/**
 * Make a GraphQL request
 */
function graphqlRequest(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query, variables });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    };

    const req = http.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

/**
 * Test 1: Router Config for all chains
 */
async function testRouterConfig() {
  log(colors.cyan, '\n🔧 Test 1: Router Configuration');
  log(colors.cyan, '================================\n');

  const query = `
    query GetRouterConfig($chainId: Int!) {
      swapRouterConfig(chainId: $chainId) {
        chainId
        routerAddress
        wethAddress
        chainName
      }
    }
  `;

  const chains = [
    { id: 3888, name: 'KalyChain' },
    { id: 56, name: 'BSC' },
    { id: 42161, name: 'Arbitrum' },
  ];

  let passed = 0;
  let failed = 0;

  for (const chain of chains) {
    try {
      const result = await graphqlRequest(query, { chainId: chain.id });

      if (result.errors) {
        log(colors.red, `❌ ${chain.name}: ${result.errors[0].message}`);
        failed++;
        continue;
      }

      if (result.data && result.data.swapRouterConfig) {
        const config = result.data.swapRouterConfig;
        log(colors.green, `✅ ${config.chainName} (Chain ID: ${config.chainId})`);
        log(colors.blue, `   Router:  ${config.routerAddress}`);
        log(colors.blue, `   WETH:    ${config.wethAddress}`);
        passed++;
      } else {
        log(colors.red, `❌ ${chain.name}: Unexpected response format`);
        failed++;
      }
    } catch (error) {
      log(colors.red, `❌ ${chain.name}: ${error.message}`);
      failed++;
    }
  }

  return { passed, failed };
}

/**
 * Test 2: Swap Quotes for all chains
 */
async function testSwapQuotes() {
  log(colors.cyan, '\n💱 Test 2: Swap Quotes');
  log(colors.cyan, '================================\n');

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

  const testCases = [
    {
      name: 'KalyChain: WKLC → USDT',
      variables: {
        chainId: 3888,
        tokenIn: '0x069255299Bb729399f3CECaBdc73d15d3D10a2A3', // WKLC
        tokenOut: '0x2CA775C77B922A51FcF3097F52bFFdbc0250D99A', // USDT
        amountIn: '1000000000000000000', // 1 WKLC
      },
    },
    {
      name: 'BSC: WBNB → BUSD',
      variables: {
        chainId: 56,
        tokenIn: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
        tokenOut: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', // BUSD
        amountIn: '1000000000000000000', // 1 BNB
      },
    },
    {
      name: 'Arbitrum: WETH → USDC',
      variables: {
        chainId: 42161,
        tokenIn: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
        tokenOut: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        amountIn: '1000000000000000000', // 1 ETH
      },
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    log(colors.yellow, `\n📊 Testing: ${testCase.name}`);
    log(colors.blue, `   Chain ID: ${testCase.variables.chainId}`);
    log(colors.blue, `   Amount:   ${testCase.variables.amountIn} wei`);

    try {
      const result = await graphqlRequest(query, testCase.variables);

      if (result.errors) {
        log(colors.red, `   ❌ Error: ${result.errors[0].message}`);
        failed++;
        continue;
      }

      if (result.data && result.data.swapQuote) {
        const quote = result.data.swapQuote;
        log(colors.green, `   ✅ Quote received successfully!`);
        log(colors.blue, `   Amount Out:     ${quote.amountOut}`);
        log(colors.blue, `   Amount Out Min: ${quote.amountOutMin}`);
        log(colors.blue, `   Route:          ${quote.route.join(' → ')}`);
        log(colors.blue, `   Price Impact:   ${quote.priceImpact}%`);
        log(colors.blue, `   Fee:            ${quote.fee}`);
        passed++;
      } else {
        log(colors.red, `   ❌ Unexpected response format`);
        console.log(JSON.stringify(result, null, 2));
        failed++;
      }
    } catch (error) {
      log(colors.red, `   ❌ Request failed: ${error.message}`);
      failed++;
    }
  }

  return { passed, failed };
}

/**
 * Test 3: Error handling
 */
async function testErrorHandling() {
  log(colors.cyan, '\n⚠️  Test 3: Error Handling');
  log(colors.cyan, '================================\n');

  const query = `
    query GetSwapQuote($chainId: Int!, $tokenIn: String!, $tokenOut: String!, $amountIn: String!) {
      swapQuote(
        chainId: $chainId
        tokenIn: $tokenIn
        tokenOut: $tokenOut
        amountIn: $amountIn
      ) {
        amountOut
      }
    }
  `;

  const errorTests = [
    {
      name: 'Invalid chain ID',
      variables: {
        chainId: 9999,
        tokenIn: '0x069255299Bb729399f3CECaBdc73d15d3D10a2A3',
        tokenOut: '0x2CA775C77B922A51FcF3097F52bFFdbc0250D99A',
        amountIn: '1000000000000000000',
      },
      expectedError: true,
    },
    {
      name: 'Invalid token address',
      variables: {
        chainId: 3888,
        tokenIn: 'invalid-address',
        tokenOut: '0x2CA775C77B922A51FcF3097F52bFFdbc0250D99A',
        amountIn: '1000000000000000000',
      },
      expectedError: true,
    },
    {
      name: 'Invalid amount',
      variables: {
        chainId: 3888,
        tokenIn: '0x069255299Bb729399f3CECaBdc73d15d3D10a2A3',
        tokenOut: '0x2CA775C77B922A51FcF3097F52bFFdbc0250D99A',
        amountIn: '-100',
      },
      expectedError: true,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of errorTests) {
    log(colors.yellow, `\n🧪 Testing: ${test.name}`);

    try {
      const result = await graphqlRequest(query, test.variables);

      if (result.errors && test.expectedError) {
        log(colors.green, `   ✅ Error handled correctly: ${result.errors[0].message}`);
        passed++;
      } else if (!result.errors && !test.expectedError) {
        log(colors.green, `   ✅ Request succeeded as expected`);
        passed++;
      } else {
        log(colors.red, `   ❌ Unexpected result`);
        failed++;
      }
    } catch (error) {
      log(colors.red, `   ❌ Request failed: ${error.message}`);
      failed++;
    }
  }

  return { passed, failed };
}

/**
 * Main test runner
 */
async function runTests() {
  log(colors.cyan, '\n🚀 KalySwap Multichain Swap API Tests');
  log(colors.cyan, '=====================================\n');
  log(colors.blue, 'Testing endpoint: http://localhost:3000/api/graphql\n');

  const results = {
    passed: 0,
    failed: 0,
  };

  try {
    // Test 1: Router Config
    const test1 = await testRouterConfig();
    results.passed += test1.passed;
    results.failed += test1.failed;

    // Test 2: Swap Quotes
    const test2 = await testSwapQuotes();
    results.passed += test2.passed;
    results.failed += test2.failed;

    // Test 3: Error Handling
    const test3 = await testErrorHandling();
    results.passed += test3.passed;
    results.failed += test3.failed;

    // Summary
    log(colors.cyan, '\n=====================================');
    log(colors.cyan, '📊 Test Summary');
    log(colors.cyan, '=====================================\n');
    log(colors.green, `✅ Passed: ${results.passed}`);
    log(colors.red, `❌ Failed: ${results.failed}`);
    log(colors.cyan, `📈 Total:  ${results.passed + results.failed}\n`);

    if (results.failed === 0) {
      log(colors.green, '🎉 All tests passed! The multichain swap API is working correctly.\n');
      process.exit(0);
    } else {
      log(colors.yellow, '⚠️  Some tests failed. Please review the errors above.\n');
      process.exit(1);
    }
  } catch (error) {
    log(colors.red, `\n❌ Fatal error: ${error.message}\n`);
    process.exit(1);
  }
}

// Run the tests
runTests();

