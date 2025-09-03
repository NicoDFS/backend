import { ApolloServer } from 'apollo-server-micro';
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
import { schema } from '../../graphql/schema';
import { createContext } from '../../graphql/context';

const apolloServer = new ApolloServer({
  schema,
  context: createContext,
  plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
  cors: false, // Disable Apollo Server's built-in CORS
});

const startServer = apolloServer.start();

// Manual CORS handling to avoid conflicts
const setCorsHeaders = (res: any, origin: string) => {
  const allowedOrigins = [
    'http://localhost:3001', // Admin panel
    'http://localhost:3002', // Frontend
    'http://localhost:3000', // Backend (for testing)
    'https://app.kalyswap.io',
    'https://kalyswap.io'
  ];

  // If origin is provided and allowed, use it
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  // If no origin (server-to-server, same-origin, etc.), allow localhost:3001 by default
  else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3001');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
};

export default async (req: any, res: any) => {
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

export const config = {
  api: {
    bodyParser: false,
  },
};
