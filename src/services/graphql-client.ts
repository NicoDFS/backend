import { GraphQLClient } from 'graphql-request';

// Graph node that indexes KalyChain (chain "kmt" on the kswap graph-node).
const GRAPH_NODE_URL = process.env.GRAPH_NODE_URL || 'http://localhost:8000';

// Subgraphs this backend reads. Names follow the existing kmt deployments
// (v3-subgraph-kmt, vault-subgraph-kmt, kusd-subgraph-kmt). No V2 dex/farm subgraph exists on 3890.
const subgraphEndpoints: Record<string, string> = {
  bridge: `${GRAPH_NODE_URL}/subgraphs/name/bridge-subgraph-kmt`,
  launchpad: `${GRAPH_NODE_URL}/subgraphs/name/launchpad-subgraph-kmt`,
  staking: `${GRAPH_NODE_URL}/subgraphs/name/staking-subgraph-kmt`,
};

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
