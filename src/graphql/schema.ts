import { makeExecutableSchema } from '@graphql-tools/schema';
import { gql } from 'apollo-server-micro';
import { bridgeResolvers } from './resolvers/bridge';
import { launchpadResolvers } from './resolvers/launchpad';
import { stakingResolvers } from './resolvers/staking';
import { monitoringResolvers } from './resolvers/monitoring';
import { projectResolvers } from './resolvers/project';
import { fairlaunchResolvers } from './resolvers/fairlaunch';

const typeDefs = gql`
  type StakingPool {
    id: ID!
    address: String!
    totalStaked: String!
    rewardRate: String!
    rewardsDuration: String!
    periodFinish: String!
    lastUpdateTime: String!
    rewardPerTokenStored: String!
    createdAt: String!
    updatedAt: String!
    stakingToken: String!
    rewardsToken: String!
  }

  type Staker {
    id: ID!
    address: String!
    stakedAmount: String!
    rewards: String!
    rewardPerTokenPaid: String!
    lastAction: String!
    lastActionTimestamp: String!
    pool: StakingPool!
  }

  type StakeEvent {
    id: ID!
    staker: Staker!
    pool: StakingPool!
    amount: String!
    timestamp: String!
    blockNumber: String!
    transactionHash: String!
  }

  type RewardEvent {
    id: ID!
    staker: Staker!
    pool: StakingPool!
    amount: String!
    timestamp: String!
    blockNumber: String!
    transactionHash: String!
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
    token: BridgeTokenInfo
  }

  type BridgeTokenInfo {
    symbol: String
    name: String
    decimals: Int
  }

  type BridgeStats {
    totalMessages: Int!
    totalVolume: String!
    totalVolumeUSD: String
    totalTokenTransfers: Int
    chainStats: [ChainStat!]!
    tokens: [BridgeToken]
  }

  type BridgeToken {
    id: ID!
    symbol: String!
    name: String!
    totalBridgedIn: String
    totalBridgedOut: String
    totalBridgedInUSD: String
    totalBridgedOutUSD: String
    tokenPrice: Float
  }

  type ChainStat {
    chain: String!
    messagesIn: Int!
    messagesOut: Int!
    volumeIn: String!
    volumeOut: String!
    rawVolumeIn: String
    rawVolumeOut: String
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

  type LaunchpadFactoryFees {
    tokenFactory: String!
    presaleFactory: String!
    fairlaunchFactory: String!
  }

  type LaunchpadOverview {
    totalProjects: Int!
    activeProjects: Int!
    totalTokensCreated: Int!
    totalFundsRaised: String!
    totalParticipants: Int!
    totalFeesCollected: String!
    factoryFees: LaunchpadFactoryFees!
    recentProjects: [LaunchpadProject!]!
    lastUpdated: String
    error: String
  }

  type LaunchpadProject {
    id: ID!
    name: String!
    tokenAddress: String!
    startTime: String
    endTime: String
    hardCap: String
    softCap: String
    status: String!
    type: String!
    creator: String!
    saleToken: LaunchpadToken
    totalRaised: String
    totalParticipants: Int
    createdAt: String!
  }

  type LaunchpadToken {
    id: ID!
    name: String
    symbol: String
    address: String!
  }

  # Project types for confirmed blockchain projects
  type Project {
    id: ID!
    name: String!
    description: String!
    websiteUrl: String
    whitepaperUrl: String
    githubUrl: String
    discordUrl: String
    telegramUrl: String
    twitterUrl: String
    additionalSocialUrl: String

    saleToken: String!
    baseToken: String!
    tokenRate: String!
    liquidityRate: String!
    minContribution: String
    maxContribution: String
    softCap: String!
    hardCap: String!
    liquidityPercent: String!
    presaleStart: String!
    presaleEnd: String!
    lpLockDuration: String!
    lpRecipient: String
    dexVersion: String!

    contractAddress: String!
    transactionHash: String!
    blockNumber: Int!
    deployedAt: String!
    createdAt: String!
    ownerAddress: String!
  }

  # Fairlaunch Project type for confirmed blockchain projects
  type FairlaunchProject {
    id: ID!
    name: String!
    description: String!
    websiteUrl: String
    whitepaperUrl: String
    githubUrl: String
    discordUrl: String
    telegramUrl: String
    twitterUrl: String
    additionalSocialUrl: String

    saleToken: String!
    baseToken: String!
    buybackRate: String!
    sellingAmount: String!
    softCap: String!
    liquidityPercent: String!
    fairlaunchStart: String!
    fairlaunchEnd: String!
    isWhitelist: Boolean!
    referrer: String
    dexVersion: String!

    contractAddress: String!
    transactionHash: String!
    blockNumber: Int!
    deployedAt: String!
    createdAt: String!
    ownerAddress: String!
  }

  type StakingUser {
    id: ID!
    address: String!
    stakedAmount: String!
    rewards: String!
    lastAction: String!
    lastActionTimestamp: String!
  }

  type StakingEvent {
    id: ID!
    user: StakingUser!
    amount: String!
    timestamp: String!
    blockNumber: String!
    transactionHash: String!
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
    arbitrum: NodeMonitoring!
    polygon: NodeMonitoring!
  }

  type FullMonitoringData {
    relayer: NodeMonitoring!
    validators: ValidatorsMonitoring!
  }

  # Input type for saving confirmed projects
  input ProjectDeploymentInput {
    # Project Information
    name: String!
    description: String!
    websiteUrl: String
    whitepaperUrl: String
    githubUrl: String
    discordUrl: String
    telegramUrl: String
    twitterUrl: String
    additionalSocialUrl: String

    # Presale Configuration
    saleToken: String!
    baseToken: String!
    tokenRate: String!
    liquidityRate: String!
    minContribution: String
    maxContribution: String
    softCap: String!
    hardCap: String!
    liquidityPercent: String!
    presaleStart: String!
    presaleEnd: String!
    lpLockDuration: String!
    lpRecipient: String
    dexVersion: String

    # Required Blockchain Data
    contractAddress: String!
    transactionHash: String!
    blockNumber: Int!
  }

  # Input type for saving confirmed fairlaunch projects
  input FairlaunchDeploymentInput {
    # Project Information
    name: String!
    description: String!
    websiteUrl: String
    whitepaperUrl: String
    githubUrl: String
    discordUrl: String
    telegramUrl: String
    twitterUrl: String
    additionalSocialUrl: String

    # Fairlaunch Configuration
    saleToken: String!
    baseToken: String!
    buybackRate: String!
    sellingAmount: String!
    softCap: String!
    liquidityPercent: String!
    fairlaunchStart: String!
    fairlaunchEnd: String!
    isWhitelist: Boolean!
    referrer: String
    dexVersion: String

    # Required Blockchain Data
    contractAddress: String!
    transactionHash: String!
    blockNumber: Int!
  }

  type Query {
    # Bridge queries
    bridges(limit: Int, skip: Int): [Bridge!]!
    bridge(id: ID!): Bridge
    bridgeStats: BridgeStats
    warpRoutes: [WarpRoute!]!
    bridgeOverview: BridgeOverview!

    # Launchpad queries
    launchpadProjects: [LaunchpadProject!]!
    launchpadProject(id: ID!): LaunchpadProject
    launchpadOverview: LaunchpadOverview

    # Project queries (confirmed blockchain projects only)
    confirmedProjects(limit: Int, offset: Int): [Project!]!
    confirmedProject(id: ID!): Project
    confirmedProjectByAddress(contractAddress: String!): Project
    projectsByOwner(ownerAddress: String!, limit: Int, offset: Int): [Project!]!

    # Unified project lookup (searches both presales and fairlaunches)
    projectByAddress(contractAddress: String!): LaunchpadProject

    # Fairlaunch queries (confirmed blockchain projects only)
    confirmedFairlaunches(limit: Int, offset: Int): [FairlaunchProject!]!
    confirmedFairlaunch(id: ID!): FairlaunchProject
    confirmedFairlaunchByAddress(contractAddress: String!): FairlaunchProject
    fairlaunchesByOwner(ownerAddress: String!, limit: Int, offset: Int): [FairlaunchProject!]!

    # Staking queries
    stakingPools: [StakingPool!]!
    stakingPool(id: ID!): StakingPool
    stakingPoolUsers(poolId: ID!, first: Int, skip: Int): [StakingUser!]!
    userStakingInfo(userAddress: String!, poolId: ID!): StakingUser
    stakeEvents(poolId: ID, first: Int, skip: Int): [StakingEvent!]!
    withdrawEvents(poolId: ID, first: Int, skip: Int): [StakingEvent!]!
    rewardEvents(poolId: ID, first: Int, skip: Int): [StakingEvent!]!
    stakingContractData: StakingPool
    userStakingContractData(userAddress: String!): StakingUser


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

  type Mutation {
    # Project mutations (blockchain-first only)
    saveProjectAfterDeployment(input: ProjectDeploymentInput!): Project!

    # Fairlaunch mutations (blockchain-first only)
    saveFairlaunchAfterDeployment(input: FairlaunchDeploymentInput!): FairlaunchProject!

  }

`;

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers: [
    bridgeResolvers,
    launchpadResolvers,
    stakingResolvers,
    monitoringResolvers,
    projectResolvers,
    fairlaunchResolvers,
  ],
});
