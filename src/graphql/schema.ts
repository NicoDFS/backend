import { makeExecutableSchema } from '@graphql-tools/schema';
import { gql } from 'apollo-server-micro';
import { dexResolvers } from './resolvers/dex';
import { bridgeResolvers } from './resolvers/bridge';
import { launchpadResolvers } from './resolvers/launchpad';
import { stakingResolvers } from './resolvers/staking';

const typeDefs = gql`
  type Token {
    id: ID!
    symbol: String!
    name: String!
    decimals: Int!
  }
  
  type Pair {
    id: ID!
    token0: Token!
    token1: Token!
    reserve0: String!
    reserve1: String!
    volumeUSD: String
  }
  
  type Bridge {
    id: ID!
    sourceChain: String!
    targetChain: String!
    tokenAddress: String!
    amount: String!
    status: String!
    txHash: String!
    timestamp: String!
  }
  
  type LaunchpadProject {
    id: ID!
    name: String!
    description: String!
    tokenAddress: String!
    startTime: String!
    endTime: String!
    hardCap: String!
    softCap: String!
    status: String!
  }
  
  type StakingPool {
    id: ID!
    tokenAddress: String!
    rewardTokenAddress: String!
    totalStaked: String!
    rewardRate: String!
    startTime: String!
    endTime: String!
  }
  
  type Query {
    # DEX queries
    pairs: [Pair!]!
    pair(id: ID!): Pair
    
    # Bridge queries
    bridges: [Bridge!]!
    bridge(id: ID!): Bridge
    
    # Launchpad queries
    launchpadProjects: [LaunchpadProject!]!
    launchpadProject(id: ID!): LaunchpadProject
    
    # Staking queries
    stakingPools: [StakingPool!]!
    stakingPool(id: ID!): StakingPool
  }
`;

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers: [
    dexResolvers,
    bridgeResolvers,
    launchpadResolvers,
    stakingResolvers,
  ],
});
