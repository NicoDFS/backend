# Bridge Subgraph

This subgraph indexes Hyperlane bridge transactions on KalyChain, including message passing, gas payments, and token transfers.

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

Before deploying, make sure to update the contract addresses in `subgraph.yaml` with the correct addresses for your Hyperlane deployment on KalyChain:

- Mailbox: `0x5b6CFf85442B851A8e6eaBd2A4E4507B5135B3B0` (replace with actual address)
- InterchainGasPaymaster: `0x56f52c0A1ddcD557285f7CBc782D3d83096CE1Cc` (replace with actual address)
- ValidatorAnnounce: `0x9A5927F7F8E7AA6D3D5126B64B5A880D536D5E09` (replace with actual address)

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
curl -X POST -H "Content-Type: application/json" --data '{"query": "{_meta{block{number}}}"}'  http://localhost:8000/subgraphs/name/kalyswap/bridge-subgraph
```