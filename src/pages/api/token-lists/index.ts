/**
 * Token Lists API Index Route
 * Returns available token lists and cache info
 */

import { NextApiRequest, NextApiResponse } from 'next';

// Token list configurations
const TOKEN_LIST_URLS: Record<string, string> = {
  'kalyswap-default': 'https://raw.githubusercontent.com/KalyCoinProject/tokenlists/refs/heads/main/kalyswap.tokenlist.json',
  'pancakeswap-extended': 'https://tokens.pancakeswap.finance/pancakeswap-extended.json',
  'uniswap-default': 'https://tokens.uniswap.org'
};

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

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin || '';

  // Set CORS headers
  setCorsHeaders(res, origin);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.json({
    message: 'Token Lists API is working',
    availableLists: Object.keys(TOKEN_LIST_URLS),
    urls: TOKEN_LIST_URLS,
    endpoints: {
      getList: '/api/token-lists/[listId]',
      examples: [
        '/api/token-lists/kalyswap-default',
        '/api/token-lists/pancakeswap-extended',
        '/api/token-lists/uniswap-default'
      ]
    }
  });
}
