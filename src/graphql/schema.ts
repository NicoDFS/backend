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
    tradeVolume: String
    tradeVolumeUSD: String
    totalLiquidity: String
    derivedKLC: String
    pairs: [PairToken]
  }

  type PairToken {
    pair: Pair!
    isToken0: Boolean
  }

  type Pair {
    id: ID!
    token0: Token!
    token1: Token!
    reserve0: String!
    reserve1: String!
    reserveUSD: String
    volumeUSD: String
    token0Price: String
    token1Price: String
    txCount: String
    createdAt: String
    mints: [Mint]
    burns: [Burn]
    swaps: [Swap]
  }

  type Mint {
    id: ID!
    sender: String!
    amount0: String!
    amount1: String!
    amountUSD: String
    timestamp: String!
    transactionHash: String!
  }

  type Burn {
    id: ID!
    sender: String!
    amount0: String!
    amount1: String!
    amountUSD: String
    timestamp: String!
    transactionHash: String!
  }

  type Swap {
    id: ID!
    sender: String!
    amount0In: String!
    amount1In: String!
    amount0Out: String!
    amount1Out: String!
    amountUSD: String
    timestamp: String!
    transactionHash: String!
  }

  type Factory {
    id: ID!
    address: String!
    pairCount: Int!
    totalVolumeUSD: String!
    totalVolumeKLC: String!
    totalLiquidityUSD: String!
    totalLiquidityKLC: String!
    txCount: String!
    feeTo: String
    feeToSetter: String
  }

  type DayData {
    id: ID!
    date: Int!
    volumeUSD: String!
    volumeKLC: String!
    liquidityUSD: String!
    liquidityKLC: String!
    txCount: String!
  }

  type LiquidityPoolManager {
    id: ID!
    address: String!
    wklc: String!
    kswap: String!
    treasuryVester: String!
    klcKswapPair: String!
    klcSplit: String!
    kswapSplit: String!
    splitPools: Boolean!
    unallocatedKswap: String!
    whitelistedPools: [WhitelistedPool]
  }

  type WhitelistedPool {
    id: ID!
    pair: String!
    weight: String!
    manager: LiquidityPoolManager
  }

  type TreasuryVester {
    id: ID!
    address: String!
    recipient: String!
    kswap: String!
    vestingAmount: String!
    vestingBegin: String!
    vestingCliff: String!
    vestingEnd: String!
    lastUpdate: String!
    enabled: Boolean!
  }

  type DexStakingPool {
    id: ID!
    address: String!
    stakingToken: Token!
    rewardsToken: Token!
    totalStaked: String!
    rewardRate: String!
    rewardsDuration: String!
    periodFinish: String!
    lastUpdateTime: String!
    rewardPerTokenStored: String!
  }

  type DexOverview {
    factory: Factory
    dayData: DayData
    topPairs: [Pair]
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
    totalFundsRaised: String!
    totalParticipants: Int!
    totalFeesCollected: String!
    factoryFees: LaunchpadFactoryFees!
    recentProjects: [LaunchpadProject!]!
  }

  type LaunchpadFactoryFees {
    tokenFactory: String!
    presaleFactory: String!
    fairlaunchFactory: String!
  }

  type LaunchpadOverview {
    totalProjects: Int!
    activeProjects: Int!
    totalFundsRaised: String!
    totalParticipants: Int!
    totalFeesCollected: String!
    factoryFees: LaunchpadFactoryFees!
    recentProjects: [LaunchpadProject!]!
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
    address: String!
    totalStaked: String!
    rewardRate: String!
    rewardsDuration: String!
    periodFinish: String!
    lastUpdateTime: String!
    rewardPerTokenStored: String!
    paused: Boolean!
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
    dexOverview: DexOverview
    factory: Factory
    pairs(first: Int, skip: Int, orderBy: String, orderDirection: String): [Pair!]!
    pair(id: ID!): Pair
    tokens(first: Int, skip: Int, orderBy: String, orderDirection: String): [Token!]!
    token(id: ID!): Token
    liquidityPoolManager: LiquidityPoolManager
    whitelistedPools: [WhitelistedPool!]!
    treasuryVester: TreasuryVester
    dexStakingPool: DexStakingPool
    dexDayData(first: Int, skip: Int): [DayData!]!

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
