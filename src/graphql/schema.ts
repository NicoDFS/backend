import { makeExecutableSchema } from '@graphql-tools/schema';
import { gql } from 'apollo-server-micro';
import { dexResolvers } from './resolvers/dex';
import { bridgeResolvers } from './resolvers/bridge';
import { launchpadResolvers } from './resolvers/launchpad';
import { stakingResolvers } from './resolvers/staking';
import { monitoringResolvers } from './resolvers/monitoring';

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
    destinationChain: String!
    sender: String
    recipient: String
    amount: String
    status: String!
    originTxHash: String
    destinationTxHash: String
    timestamp: String!
  }

  type BridgeStats {
    totalMessages: Int!
    totalVolume: String!
    chainStats: [ChainStat!]!
  }

  type ChainStat {
    chain: String!
    messagesIn: Int!
    messagesOut: Int!
    volumeIn: String!
    volumeOut: String!
  }

  type WarpRoute {
    id: ID!
    sourceChain: String!
    destinationChain: String!
    tokenAddress: String!
    status: String!
  }

  type BridgeOverview {
    stats: BridgeStats
    routes: [WarpRoute!]!
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

  type NodeHealth {
    isUp: Boolean!
    uptime: Float!
  }

  type NodeResourceUsage {
    cpu: Float!
    memory: Float!
    diskAvailable: Float!
  }

  type MessageProcessingMetrics {
    messagesProcessed: Float!
  }

  type NodeMonitoring {
    health: NodeHealth!
    resources: NodeResourceUsage!
    metrics: MessageProcessingMetrics!
  }

  type ValidatorsMonitoring {
    kalychain: NodeMonitoring!
    bnb: NodeMonitoring!
    arbitrum: NodeMonitoring!
    polygon: NodeMonitoring!
  }

  type FullMonitoringData {
    relayer: NodeMonitoring!
    validators: ValidatorsMonitoring!
  }

  type Query {
    # DEX queries
    pairs: [Pair!]!
    pair(id: ID!): Pair

    # Bridge queries
    bridges: [Bridge!]!
    bridge(id: ID!): Bridge
    bridgeStats: BridgeStats
    warpRoutes: [WarpRoute!]!
    bridgeOverview: BridgeOverview!

    # Launchpad queries
    launchpadProjects: [LaunchpadProject!]!
    launchpadProject(id: ID!): LaunchpadProject

    # Staking queries
    stakingPools: [StakingPool!]!
    stakingPool(id: ID!): StakingPool

    # Monitoring queries
    relayerHealth: NodeHealth!
    validatorHealth(chain: String!): NodeHealth!
    validatorsHealth: ValidatorsMonitoring
    relayerResourceUsage: NodeResourceUsage!
    validatorResourceUsage(chain: String!): NodeResourceUsage!
    validatorsResourceUsage: ValidatorsMonitoring
    relayerMetrics: MessageProcessingMetrics!
    validatorMetrics(chain: String!): MessageProcessingMetrics!
    validatorsMetrics: ValidatorsMonitoring
    fullMonitoringData: FullMonitoringData!
  }
`;

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers: [
    dexResolvers,
    bridgeResolvers,
    launchpadResolvers,
    stakingResolvers,
    monitoringResolvers,
  ],
});
