import type { NextApiRequest, NextApiResponse } from 'next';
import { userService } from '../../../services/user/userService';

/**
 * Thirdweb Custom Auth Endpoint
 *
 * Thirdweb calls this endpoint to verify a user's identity.
 * The client sends a KalySwap JWT as the payload via:
 *   wallet.connect({ strategy: "auth_endpoint", payload: jwt })
 *
 * Thirdweb POSTs { payload: "<jwt>" } to this endpoint.
 * We verify the JWT and return { userId, email } so Thirdweb
 * can create/retrieve an in-app wallet for this user.
 */

// CORS headers for Thirdweb's servers
const ALLOWED_ORIGINS = [
  'https://embedded-wallet.thirdweb.com',
  'https://in-app-wallet.thirdweb.com',
  'https://auth.thirdweb.com',
];

function setCorsHeaders(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.some(o => origin.startsWith(o)) || origin.includes('thirdweb')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Allow all origins — Thirdweb's server IP isn't guaranteed
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCorsHeaders(req, res);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { payload } = req.body;

    if (!payload || typeof payload !== 'string') {
      return res.status(401).json({ message: 'Missing or invalid payload' });
    }

    // Verify the KalySwap JWT
    const decoded = userService.verifyToken(payload);
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Fetch the user to get email (optional but useful for Thirdweb account linking)
    const user = await userService.getUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Return the user identity to Thirdweb
    // userId: unique identifier — Thirdweb derives the wallet from this
    // email: optional — allows the user to access the same wallet via email login
    return res.status(200).json({
      userId: user.id,
      email: user.email || undefined,
    });
  } catch (error) {
    console.error('Thirdweb auth verification failed:', error);
    return res.status(401).json({
      message: error instanceof Error ? error.message : 'Authentication failed',
    });
  }
}

// Next.js API route config
export const config = {
  api: {
    bodyParser: true,
  },
};
