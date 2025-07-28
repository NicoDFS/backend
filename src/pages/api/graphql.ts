import { ApolloServer } from 'apollo-server-micro';
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
import { schema } from '../../graphql/schema';
import { createContext } from '../../graphql/context';
import Cors from 'micro-cors';

const cors = Cors({
  allowCredentials: true,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  origin: [
    'http://localhost:3002',
    'http://localhost:3000',
    'https://app.kalyswap.io',
    'https://kalyswap.io'
  ]
});

const apolloServer = new ApolloServer({
  schema,
  context: createContext,
  plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
});

const startServer = apolloServer.start();

export default cors(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.end();
    return false;
  }
  
  await startServer;
  
  await apolloServer.createHandler({
    path: '/api/graphql',
  })(req, res);
});

export const config = {
  api: {
    bodyParser: false,
  },
};
