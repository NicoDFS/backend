/**
 * Token Lists API Route
 * Next.js API route to proxy token lists and avoid CORS issues
 */

import { NextApiRequest, NextApiResponse } from 'next';

// Token list configurations - matches frontend config
const TOKEN_LIST_URLS: Record<string, string> = {
  'kalyswap-default': 'https://raw.githubusercontent.com/KalyCoinProject/tokenlists/refs/heads/main/kalyswap.tokenlist.json',
  'pancakeswap-extended': 'https://tokens.pancakeswap.finance/pancakeswap-extended.json',
  'uniswap-default': 'https://tokens.uniswap.org'
};

// Cache for token lists
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// CORS configuration - matches existing pattern from graphql.ts
const setCorsHeaders = (res: NextApiResponse, origin: string) => {
  const allowedOrigins = [
    'http://localhost:3001', // Admin panel (local)
    'http://localhost:3002', // Frontend (local)
    'http://localhost:3000', // Backend (for testing)
    'https://app.kalyswap.io', // Main app
    'https://kalyswap.io', // Main website
    'https://admin.kalyswap.io' // Admin panel (production)
  ];

  // If origin is provided and allowed, use it
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  // If no origin (server-to-server, same-origin, etc.), allow localhost:3002 by default
  else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3002');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, User-Agent, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin || '';

  // Set CORS headers
  setCorsHeaders(res, origin);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { listId } = req.query;
    
    if (!listId || typeof listId !== 'string') {
      return res.status(400).json({ error: 'Invalid list ID' });
    }

    const url = TOKEN_LIST_URLS[listId];

    if (!url) {
      return res.status(404).json({
        error: 'Token list not found',
        availableLists: Object.keys(TOKEN_LIST_URLS)
      });
    }

    // Check cache first
    const cached = cache.get(listId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`📋 Serving cached token list: ${listId}`);
      return res.json(cached.data);
    }

    console.log(`🔍 Fetching token list: ${listId} from ${url}`);

    // Fetch from URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'KalySwap/1.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const tokenList = await response.json();

    // Validate basic structure
    if (!tokenList || !tokenList.tokens || !Array.isArray(tokenList.tokens)) {
      throw new Error('Invalid token list format');
    }

    // Cache the result
    cache.set(listId, {
      data: tokenList,
      timestamp: Date.now()
    });

    console.log(`✅ Successfully fetched token list: ${tokenList.name} (${tokenList.tokens.length} tokens)`);

    res.json(tokenList);

  } catch (error) {
    console.error(`❌ Error fetching token list ${req.query.listId}:`, error);
    
    res.status(500).json({
      error: 'Failed to fetch token list',
      message: error instanceof Error ? error.message : 'Unknown error',
      listId: req.query.listId
    });
  }
}
