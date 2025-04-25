import { GraphQLClient, gql } from 'graphql-request';

const HYPERLANE_API_URL = process.env.HYPERLANE_API_URL || 'https://explorer-v2.hyperlane.xyz/graphql';

const hyperlaneClient = new GraphQLClient(HYPERLANE_API_URL);

export const HyperlaneApiService = {
  async getMessagesByOrigin(originChain: string, limit = 10) {
    const query = gql`
      query GetMessages($originChain: String!, $limit: Int!) {
        messages(
          where: { originChain: { equals: $originChain } }
          take: $limit
          orderBy: { timestamp: desc }
        ) {
          id
          status
          originChain
          destinationChain
          sender
          recipient
          amount
          timestamp
        }
      }
    `;
    
    const variables = { originChain, limit };
    
    try {
      const data = await hyperlaneClient.request(query, variables);
      return data.messages;
    } catch (error) {
      console.error('Error fetching Hyperlane messages:', error);
      return [];
    }
  },
  
  async getBridgeStats() {
    const query = gql`
      query GetBridgeStats {
        messageStats {
          totalMessages
          totalVolume
          chainStats {
            chain
            messagesIn
            messagesOut
            volumeIn
            volumeOut
          }
        }
      }
    `;
    
    try {
      const data = await hyperlaneClient.request(query);
      return data.messageStats;
    } catch (error) {
      console.error('Error fetching Hyperlane stats:', error);
      return null;
    }
  },

  async getMessageById(id: string) {
    const query = gql`
      query GetMessage($id: String!) {
        message(where: { id: { equals: $id } }) {
          id
          status
          originChain
          destinationChain
          sender
          recipient
          amount
          timestamp
          originTxHash
          destinationTxHash
        }
      }
    `;
    
    const variables = { id };
    
    try {
      const data = await hyperlaneClient.request(query, variables);
      return data.message;
    } catch (error) {
      console.error(`Error fetching Hyperlane message ${id}:`, error);
      return null;
    }
  }
};
