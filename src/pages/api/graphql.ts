import { ApolloServer } from 'apollo-server-micro';
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
import { schema } from '../../graphql/schema';
import { createContext } from '../../graphql/context';
import type { NextApiRequest, NextApiResponse } from 'next';

const apolloServer = new ApolloServer({
  schema,
  context: createContext,
  plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
  // Enhanced error formatting to ensure proper JSON responses
  formatError: (error) => {
    // Log the error for debugging
    console.error('GraphQL Error:', {
      message: error.message,
      path: error.path,
      locations: error.locations,
      extensions: error.extensions,
    });

    // Return a properly formatted GraphQL error
    return {
      message: error.message,
      locations: error.locations,
      path: error.path,
      extensions: {
        code: error.extensions?.code || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
      },
    };
  },
});

const startServer = apolloServer.start();

// Manual CORS handling to avoid conflicts
const setCorsHeaders = (res: NextApiResponse, origin: string) => {
  const allowedOrigins = [
    'http://localhost:3001', // Admin panel (local, raw port)
    'http://localhost:3002', // Frontend (local, raw port)
    'http://localhost:3000', // Backend (for testing)
    'https://kalyswap.localhost', // Frontend (local, via portless)
    'https://admin.kalyswap.localhost', // Admin panel (local, via portless)
    'https://app.kalyswap.io', // Main app
    'https://kalyswap.io', // Main website
    'https://admin.kalyswap.io' // Admin panel (production)
  ];

  if (origin && allowedOrigins.includes(origin)) {
    // Known web origin — reflect it back
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (!origin) {
    // No origin: native mobile apps, server-to-server, curl, etc.
    // Use wildcard — these clients don't need credentials via CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    // Unknown web origin — allow but without credentials
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

const graphqlHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  const origin = req.headers.origin || '';

  // Set CORS headers
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  await startServer;

  await apolloServer.createHandler({
    path: '/api/graphql',
  })(req, res);
};

export default graphqlHandler;

export const config = {
  api: {
    bodyParser: false,
  },
};
