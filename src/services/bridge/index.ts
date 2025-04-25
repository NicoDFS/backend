import { gql } from 'graphql-request';
import { getGraphQLClient } from '../graphql-client';

const bridgeClient = getGraphQLClient('bridge');

export const BridgeService = {
  async getBridges() {
    const query = gql`
      query {
        bridges(first: 100, orderBy: timestamp, orderDirection: desc) {
          id
          sourceChain
          targetChain
          tokenAddress
          amount
          status
          txHash
          timestamp
        }
      }
    `;
    
    try {
      const { bridges } = await bridgeClient.request(query);
      return bridges;
    } catch (error) {
      console.error('Error fetching bridges:', error);
      return [];
    }
  },
  
  async getBridge(id: string) {
    const query = gql`
      query getBridge($id: ID!) {
        bridge(id: $id) {
          id
          sourceChain
          targetChain
          tokenAddress
          amount
          status
          txHash
          timestamp
        }
      }
    `;
    
    try {
      const { bridge } = await bridgeClient.request(query, { id });
      return bridge;
    } catch (error) {
      console.error(`Error fetching bridge ${id}:`, error);
      return null;
    }
  }
};
