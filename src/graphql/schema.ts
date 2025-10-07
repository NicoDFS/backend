import { makeExecutableSchema } from '@graphql-tools/schema';
import { gql } from 'apollo-server-micro';
import { dexResolvers } from './resolvers/dex';
import { bridgeResolvers } from './resolvers/bridge';
import { launchpadResolvers } from './resolvers/launchpad';
import { stakingResolvers } from './resolvers/staking';
import { monitoringResolvers } from './resolvers/monitoring';
import { userResolvers } from './resolvers/user';
import { apiKeyResolvers } from './resolvers/apiKey';
import { projectResolvers } from './resolvers/project';
import { fairlaunchResolvers } from './resolvers/fairlaunch';
import { farmResolvers } from './resolvers/farm';
import { multichainResolvers } from './resolvers/multichain';
import { swapResolvers } from './resolvers/swap';

const typeDefs = gql`
  type Token {
    id: ID!
    symbol: String!
    name: String!
    decimals: String!
    totalSupply: String
    tradeVolume: String
    tradeVolumeUSD: String
    untrackedVolumeUSD: String
    txCount: String
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
    totalSupply: String
    reserveKLC: String
    reserveUSD: String
    trackedReserveKLC: String
    token0Price: String
    token1Price: String
    volumeToken0: String
    volumeToken1: String
    volumeUSD: String
    untrackedVolumeUSD: String
    txCount: String!
    createdAtTimestamp: String!
    createdAtBlockNumber: String!
    liquidityProviderCount: String
    mints: [Mint]
    burns: [Burn]
    swaps: [Swap]
  }

  type Mint {
    id: ID!
    transaction: DexTransaction!
    timestamp: String!
    pair: Pair!
    to: String!
    liquidity: String!
    sender: String
    amount0: String
    amount1: String
    logIndex: String
    amountUSD: String
  }

  type Burn {
    id: ID!
    transaction: DexTransaction!
    timestamp: String!
    pair: Pair!
    liquidity: String!
    sender: String
    amount0: String
    amount1: String
    to: String
    logIndex: String
    amountUSD: String
    needsComplete: Boolean!
    feeTo: String
    feeLiquidity: String
  }

  type Swap {
    id: ID!
    transaction: DexTransaction!
    timestamp: String!
    pair: Pair!
    sender: String!
    from: String!
    amount0In: String!
    amount1In: String!
    amount0Out: String!
    amount1Out: String!
    to: String!
    logIndex: String!
    amountUSD: String!
  }

  type DexTransaction {
    id: ID!
    blockNumber: String!
    timestamp: String!
    mints: [Mint!]!
    burns: [Burn!]!
    swaps: [Swap!]!
  }

  type KalyswapFactory {
    id: ID!
    pairCount: Int!
    totalVolumeKLC: String!
    totalLiquidityKLC: String!
    totalVolumeUSD: String!
    untrackedVolumeUSD: String!
    totalLiquidityUSD: String!
    txCount: String!
  }

  type DayData {
    id: ID!
    date: Int!
    dailyVolumeUSD: String!
    dailyVolumeKLC: String!
    totalVolumeUSD: String!
    totalVolumeKLC: String!
    totalLiquidityUSD: String!
    totalLiquidityKLC: String!
    txCount: String!
  }

  type PairDayData {
    id: ID!
    date: Int!
    pair: Pair!
    volumeUSD: String!
    volumeToken0: String!
    volumeToken1: String!
    txCount: String!
  }

  type Router {
    id: ID!
    address: String!
    factory: String!
    WKLC: String!
    totalSwaps: String!
    totalVolumeUSD: String!
    totalVolumeKLC: String!
    createdAt: String!
    updatedAt: String!
  }

  type RouterSwap {
    id: ID!
    router: Router!
    transactionHash: String!
    sender: String!
    recipient: String!
    path: [String!]!
    amountIn: String!
    amountOut: String!
    amountInUSD: String!
    amountOutUSD: String!
    swapType: String!
    timestamp: String!
    blockNumber: String!
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
    createdAt: String!
    updatedAt: String!
    stakingToken: Token!
    rewardsToken: Token!
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

  type LPStakingData {
    stakingPools: [StakingPool!]!
    stakers: [Staker!]!
    stakeEvents: [StakeEvent!]!
    rewardEvents: [RewardEvent!]!
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
    kswap: String!
    recipient: String!
    vestingAmount: String!
    vestingBegin: String!
    vestingCliff: String!
    vestingEnd: String!
    lastUpdate: String!
    vestingEnabled: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  # Farm-specific types for the farm subgraph
  type FarmingPool {
    id: ID!
    address: String!
    stakingToken: String!
    rewardsToken: String!
    totalStaked: String!
    rewardRate: String!
    rewardsDuration: String!
    periodFinish: String!
    lastUpdateTime: String!
    rewardPerTokenStored: String!
    createdAt: String!
    updatedAt: String!
  }

  type FarmingData {
    farmingPools: [FarmingPool!]!
    whitelistedPools: [WhitelistedPool!]!
    userFarms: [Farmer!]!
  }

  type Farmer {
    id: ID!
    address: String!
    pool: FarmingPool!
    stakedAmount: String!
    rewards: String!
    rewardPerTokenPaid: String!
    lastAction: String!
    lastActionTimestamp: String!
  }

  type TokensVestedEvent {
    id: ID!
    vester: TreasuryVester!
    amount: String!
    recipient: String!
    timestamp: String!
    blockNumber: String!
    transactionHash: String!
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
    factory: KalyswapFactory
    dayData: DayData
    topPairs: [Pair]
    klcPrice: Float
  }

  # 24hr Volume Types
  type PairVolumeData {
    pairAddress: String!
    token0Address: String!
    token1Address: String!
    token0Symbol: String!
    token1Symbol: String!
    volume24hrToken0: String!
    volume24hrToken1: String!
    volume24hrUSD: String!
    swapCount: Int!
  }

  type Total24hrVolume {
    totalVolumeUSD: String!
    totalSwaps: Int!
  }

  input PairInput {
    address: String!
    token0Symbol: String!
    token1Symbol: String!
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

    contractAddress: String!
    transactionHash: String!
    blockNumber: Int!
    deployedAt: String!
    createdAt: String!
    user: User!
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

    contractAddress: String!
    transactionHash: String!
    blockNumber: Int!
    deployedAt: String!
    createdAt: String!
    user: User!
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
    clisha: NodeMonitoring!
  }

  type FullMonitoringData {
    relayer: NodeMonitoring!
    validators: ValidatorsMonitoring!
  }

  # User and Wallet types
  type User {
    id: ID!
    username: String!
    email: String
    createdAt: String!
    updatedAt: String!
    wallets: [Wallet!]!
    transactions(limit: Int, offset: Int): [Transaction!]!
  }

  type Wallet {
    id: ID!
    address: String!
    chainId: Int!
    createdAt: String!
    updatedAt: String!
    balance: WalletBalance
    transactions(limit: Int, offset: Int): [Transaction!]!
  }

  type WalletBalance {
    native: NativeTokenBalance!
    tokens: [TokenBalance!]!
  }

  type NativeTokenBalance {
    symbol: String!
    balance: String!
    formattedBalance: String!
  }

  type TokenBalance {
    symbol: String!
    balance: String!
    address: String!
    formattedBalance: String!
    decimals: Int!
    name: String!
  }

  type ChainInfo {
    chainId: Int!
    name: String!
    symbol: String!
    decimals: Int!
    rpcUrl: String!
    blockExplorer: String!
    isTestnet: Boolean!
  }

  type Transaction {
    id: ID!
    type: TransactionType!
    status: TransactionStatus!
    hash: String
    fromAddress: String!
    toAddress: String
    amount: String!
    tokenAddress: String
    tokenSymbol: String
    tokenDecimals: Int
    fee: String
    blockNumber: Int
    timestamp: String!
  }

  enum TransactionType {
    SEND
    RECEIVE
    SWAP
    STAKE
    UNSTAKE
    CLAIM_REWARD
    PROVIDE_LIQUIDITY
    REMOVE_LIQUIDITY
  }

  enum TransactionStatus {
    PENDING
    CONFIRMED
    FAILED
  }

  type AuthResponse {
    token: String!
    user: User!
  }

  type ExportWalletResponse {
    keystore: String!
    privateKey: String
  }

  # API Key types
  type ApiKey {
    id: ID!
    name: String!
    prefix: String!
    permissions: [String!]!
    isActive: Boolean!
    lastUsedAt: String
    expiresAt: String
    createdAt: String!
    updatedAt: String!
  }

  type CreateApiKeyResponse {
    apiKey: String!
    record: ApiKey!
  }

  enum ApiKeyPermission {
    READ_PUBLIC
    READ_USER
    WRITE_USER
    ADMIN
  }

  # Input type for sending transactions
  input SendTransactionInput {
    walletId: ID!
    toAddress: String!
    amount: String!
    asset: String!
    password: String!
    chainId: Int!
    gasLimit: String
    gasPrice: String
  }

  input SendContractTransactionInput {
    walletId: ID!
    toAddress: String!
    value: String!
    data: String!
    password: String!
    chainId: Int!
    gasLimit: String
    gasPrice: String
  }

  # Response type for transaction operations
  type TransactionResponse {
    id: ID!
    hash: String!
    status: String!
    gasUsed: String
    gasPrice: String
    fee: String
    blockNumber: Int
    timestamp: String
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

    # Required Blockchain Data
    contractAddress: String!
    transactionHash: String!
    blockNumber: Int!
  }

  # Swap Quote Types (Multichain)
  type SwapQuote {
    amountOut: String!
    amountOutMin: String!
    route: [String!]!
    priceImpact: String!
    executionPrice: String!
    fee: String!
  }

  type SwapRouterConfig {
    chainId: Int!
    routerAddress: String!
    wethAddress: String!
    chainName: String!
  }

  type Query {
    # DEX queries
    dexOverview: DexOverview
    kalyswapFactory: KalyswapFactory
    pairs(first: Int, skip: Int, orderBy: String, orderDirection: String): [Pair!]!
    pair(id: ID!): Pair
    tokens(first: Int, skip: Int, orderBy: String, orderDirection: String): [Token!]!
    token(id: ID!): Token
    liquidityPoolManager: LiquidityPoolManager
    whitelistedPools: [WhitelistedPool!]!
    treasuryVester: TreasuryVester
    tokensVestedEvents(first: Int, skip: Int): [TokensVestedEvent!]!
    dexStakingPool: DexStakingPool
    kalyswapDayDatas(first: Int, skip: Int): [DayData!]!
    pairDayDatas(pairAddress: String!, first: Int, skip: Int): [PairDayData!]!
    router: Router
    routerSwaps(first: Int, skip: Int): [RouterSwap!]!
    lpStakingData: LPStakingData!
    swaps(first: Int, skip: Int, userAddress: String): [Swap!]!

    # Swap Quote queries (Multichain)
    swapQuote(chainId: Int!, tokenIn: String!, tokenOut: String!, amountIn: String!): SwapQuote!
    swapRouterConfig(chainId: Int!): SwapRouterConfig

    # 24hr Volume queries
    pair24hrVolume(pairAddress: String!, klcPriceUSD: Float!, token0Symbol: String, token1Symbol: String): PairVolumeData!
    multiplePairs24hrVolume(pairs: [PairInput!]!, klcPriceUSD: Float!): [PairVolumeData!]!
    total24hrVolume(pairs: [PairInput!]!, klcPriceUSD: Float!): Total24hrVolume!

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
    myConfirmedProjects(limit: Int, offset: Int): [Project!]!

    # Unified project lookup (searches both presales and fairlaunches)
    projectByAddress(contractAddress: String!): LaunchpadProject

    # Fairlaunch queries (confirmed blockchain projects only)
    confirmedFairlaunches(limit: Int, offset: Int): [FairlaunchProject!]!
    confirmedFairlaunch(id: ID!): FairlaunchProject
    confirmedFairlaunchByAddress(contractAddress: String!): FairlaunchProject
    myConfirmedFairlaunches(limit: Int, offset: Int): [FairlaunchProject!]!

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

    # Farm queries (from farm subgraph)
    farmingPools: [FarmingPool!]!
    userFarmingData(userAddress: String!): [Farmer!]!
    farmingData(userAddress: String): FarmingData!

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

    # User queries
    me: User
    user(id: ID!): User
    userByUsername(username: String!): User
    wallet(address: String!): Wallet
    walletBalance(address: String!, chainId: Int = 3888): WalletBalance
    exportWallet(walletId: ID!, password: String!): ExportWalletResponse
    userTransactions(limit: Int, offset: Int): [Transaction!]!
    walletTransactions(walletId: ID!, limit: Int, offset: Int): [Transaction!]!

    # Multichain queries
    supportedChains: [ChainInfo!]!
    walletsByChain(chainId: Int!): [Wallet!]!

    # API Key queries
    myApiKeys: [ApiKey!]!
    apiKey(id: ID!): ApiKey

    # Admin queries
    allUsers: [User!]!
    allWallets: [Wallet!]!
  }

  type Mutation {
    # User mutations
    register(username: String!, email: String, password: String!): AuthResponse!
    login(username: String!, password: String!): AuthResponse!
    createWallet(password: String!, chainId: Int = 3888): Wallet!
    importWallet(privateKey: String!, password: String!, chainId: Int = 3888): Wallet!

    # Transaction mutations
    sendTransaction(input: SendTransactionInput!): TransactionResponse!
    sendContractTransaction(input: SendContractTransactionInput!): TransactionResponse!
    trackSendTransaction(
      walletId: ID!,
      hash: String!,
      toAddress: String!,
      amount: String!,
      tokenAddress: String,
      tokenSymbol: String,
      tokenDecimals: Int,
      fee: String
    ): Transaction!

    trackSwapTransaction(
      walletId: ID!,
      hash: String!,
      fromAddress: String!,
      toAddress: String,
      amount: String!,
      tokenAddress: String,
      tokenSymbol: String,
      tokenDecimals: Int,
      fee: String
    ): Transaction!

    updateTransactionStatus(
      hash: String!,
      status: String!,
      blockNumber: Int
    ): Transaction!

    # API Key mutations
    createApiKey(
      name: String!,
      permissions: [ApiKeyPermission!]!,
      expiresAt: String
    ): CreateApiKeyResponse!

    revokeApiKey(id: ID!): ApiKey!
    deleteApiKey(id: ID!): Boolean!

    # Project mutations (blockchain-first only)
    saveProjectAfterDeployment(input: ProjectDeploymentInput!): Project!

    # Fairlaunch mutations (blockchain-first only)
    saveFairlaunchAfterDeployment(input: FairlaunchDeploymentInput!): FairlaunchProject!
  }
`;

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers: [
    dexResolvers,
    bridgeResolvers,
    launchpadResolvers,
    stakingResolvers,
    farmResolvers,
    monitoringResolvers,
    userResolvers,
    apiKeyResolvers,
    projectResolvers,
    fairlaunchResolvers,
    multichainResolvers,
    swapResolvers,
  ],
});
