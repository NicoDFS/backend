import { GraphQLClient } from 'graphql-request';

// Default to localhost for development
const GRAPH_NODE_URL = process.env.GRAPH_NODE_URL || 'http://localhost:8000';

// Map of service names to subgraph endpoints
const subgraphEndpoints: Record<string, string> = {
  dex: `${GRAPH_NODE_URL}/subgraphs/name/kalyswap/dex-subgraph`,
  bridge: `${GRAPH_NODE_URL}/subgraphs/name/kalyswap/bridge-subgraph`,
  launchpad: `${GRAPH_NODE_URL}/subgraphs/name/kalyswap/launchpad-subgraph`,
  staking: `${GRAPH_NODE_URL}/subgraphs/name/kalyswap/staking-subgraph`,
  farm: `${GRAPH_NODE_URL}/subgraphs/name/kalyswap/farming-subgraph`,
};

// Cache clients to avoid creating new ones for each request
const clients: Record<string, GraphQLClient> = {};

export function getGraphQLClient(service: string): GraphQLClient {
  if (!clients[service]) {
    const endpoint = subgraphEndpoints[service];
    if (!endpoint) {
      throw new Error(`No endpoint configured for service: ${service}`);
    }
    clients[service] = new GraphQLClient(endpoint);
  }
  return clients[service];
}
