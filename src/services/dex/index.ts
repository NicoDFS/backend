import { gql } from 'graphql-request';
import { getGraphQLClient } from '../graphql-client';

const dexClient = getGraphQLClient('dex');

export const DexService = {
  async getPairs() {
    const query = gql`
      query {
        pairs(first: 100, orderBy: createdAtTimestamp, orderDirection: desc) {
          id
          token0 {
            id
            symbol
            name
          }
          token1 {
            id
            symbol
            name
          }
          reserve0
          reserve1
          volumeUSD
        }
      }
    `;
    
    try {
      const { pairs } = await dexClient.request(query);
      return pairs;
    } catch (error) {
      console.error('Error fetching pairs:', error);
      return [];
    }
  },
  
  async getPair(id: string) {
    const query = gql`
      query getPair($id: ID!) {
        pair(id: $id) {
          id
          token0 {
            id
            symbol
            name
          }
          token1 {
            id
            symbol
            name
          }
          reserve0
          reserve1
          volumeUSD
        }
      }
    `;
    
    try {
      const { pair } = await dexClient.request(query, { id });
      return pair;
    } catch (error) {
      console.error(`Error fetching pair ${id}:`, error);
      return null;
    }
  }
};
