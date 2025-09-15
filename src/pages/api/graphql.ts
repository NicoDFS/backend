import { ApolloServer } from 'apollo-server-micro';
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
import { schema } from '../../graphql/schema';
import { createContext } from '../../graphql/context';

const apolloServer = new ApolloServer({
  schema,
  context: createContext,
  plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
  cors: false, // Disable Apollo Server's built-in CORS
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
  // Enhanced error response handling
  formatResponse: (response, requestContext) => {
    // Ensure we always return valid JSON
    if (response.errors) {
      // Log authentication errors specifically
      const authErrors = response.errors.filter(error =>
        error.message.includes('Authentication required') ||
        error.message.includes('Invalid token') ||
        error.message.includes('Token expired')
      );

      if (authErrors.length > 0) {
        console.warn('Authentication error detected:', authErrors.map(e => e.message));
      }
    }

    return response;
  },
});

const startServer = apolloServer.start();

// Manual CORS handling to avoid conflicts
const setCorsHeaders = (res: any, origin: string) => {
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
