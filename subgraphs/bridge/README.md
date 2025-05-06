# Bridge Subgraph

This subgraph indexes Hyperlane bridge transactions on KalyChain, including message passing and token transfers. It tracks cross-chain messages and token transfers for both ERC20 and native tokens.

## Known Issues and Fixes

- The event signatures in the ABIs differ from the documentation, requiring custom mapping
- InterchainGasPaymaster is not used in Hyperlane v3 deployment
- The SentTransferRemote and ReceivedTransferRemote events in the HypERC20 and HypNative contracts don't include the recipient parameter as expected
- The event is named ValidatorAnnouncement in the ABI, not Announcement as initially expected

## Setup

1. Install dependencies:
```bash
npm install
```

2. Generate types:
```bash
npm run codegen
```

3. Build the subgraph:
```bash
npm run build
```

4. Create the subgraph in your local Graph Node:
```bash
npm run create-local
```

5. Deploy the subgraph to your local Graph Node:
```bash
npm run deploy-local
```

## Contract Addresses

The subgraph is configured to use the following contract addresses from your Hyperlane v3 deployment on KalyChain:

- Mailbox: `0xa87EF115066A311C88A6E5E86B93E4E2b1C33723`
- MerkleTreeHook: `0x6f39af116d86925A046D6C9DC70C02c0435cB64C`
- ValidatorAnnounce: `0xB038dDE315D8833D1208830C8327193d85455B04`

## Entities

- **BridgeMessage**: Tracks cross-chain messages
- **Token**: Information about tokens being bridged
- **TokenTransfer**: Records of token transfers across chains
- **Validator**: Information about bridge validators
- **ChainStats**: Statistics for each chain
- **BridgeStats**: Overall bridge statistics
- **DailyBridgeStats**: Daily aggregated statistics

## Token Contracts

The subgraph will automatically index token transfers for HypERC20 and HypNative tokens. You'll need to manually create data sources for each token contract in your deployment.

## Querying the Subgraph

Once deployed, you can query the subgraph at:
```
http://localhost:8000/subgraphs/name/kalyswap/bridge-subgraph
```

Example query to get recent bridge messages:
```graphql
{
  bridgeMessages(first: 10, orderBy: dispatchTimestamp, orderDirection: desc) {
    id
    messageId
    sender
    recipient
    originDomain
    destinationDomain
    status
    dispatchTimestamp
    deliveryTimestamp
  }
}
```

Example query to get token transfer statistics:
```graphql
{
  tokens {
    id
    symbol
    name
    totalBridgedIn
    totalBridgedOut
  }
  bridgeStats(id: "1") {
    totalMessages
    totalMessagesDelivered
    totalTokenTransfers
    totalTokensIn
    totalTokensOut
  }
}
```

## Checking Sync Status

To check the sync status of your subgraph, run:
```bash
curl -X POST http://localhost:8030/graphql -H "Content-Type: application/json" -d '{"query": "{ indexingStatusForCurrentVersion(subgraphName: \"kalyswap/bridge-subgraph\") { synced health chains { network latestBlock { number } chainHeadBlock { number } } } }"}'
```

Or to check the indexed data:
```bash
curl -X POST -H "Content-Type: application/json" --data '{"query": "{_meta{block{number}}}"}'  http://localhost:8000/subgraphs/name/kalyswap/bridge-subgraph
```

## Testing

Simple tests have been added to verify utility functions. To run the tests:
```bash
npm run test
```

Note: The full test suite requires generated code from `npm run codegen` to be working properly.