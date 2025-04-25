import { gql } from 'graphql-request';
import { getGraphQLClient } from '../graphql-client';
import { HyperlaneApiService } from './hyperlane-api';

// This would be used if we had a subgraph for the bridge
// const bridgeClient = getGraphQLClient('bridge');

export const BridgeService = {
  // Use Hyperlane API for bridge data
  async getBridges() {
    // For now, we'll just return data from Hyperlane API
    // In the future, this could be enhanced to combine data from multiple sources
    const kalyChainMessages = await HyperlaneApiService.getMessagesByOrigin('kalychain', 100);
    return kalyChainMessages;
  },

  async getBridge(id: string) {
    return HyperlaneApiService.getMessageById(id);
  },

  async getBridgeStats() {
    return HyperlaneApiService.getBridgeStats();
  },

  // This method would use contract addresses and warp routes from the contracts/bridge folder
  async getWarpRoutes() {
    // In a real implementation, this would read from the contract addresses and warp routes
    // For now, we'll return a placeholder
    return [
      {
        id: '1',
        sourceChain: 'kalychain',
        destinationChain: 'ethereum',
        tokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'active'
      },
      {
        id: '2',
        sourceChain: 'kalychain',
        destinationChain: 'bsc',
        tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        status: 'active'
      }
    ];
  },

  // Method to get combined bridge data
  async getBridgeOverview() {
    const [stats, routes] = await Promise.all([
      this.getBridgeStats(),
      this.getWarpRoutes()
    ]);

    return {
      stats,
      routes
    };
  }
};
