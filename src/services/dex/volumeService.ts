import { ethers } from 'ethers';
import { getProvider } from '../../blockchain/providers';

// Pair contract ABI - only the events and functions we need
const PAIR_ABI = [
  // Swap event
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "sender", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount0In", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "amount1In", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "amount0Out", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "amount1Out", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "to", "type": "address" }
    ],
    "name": "Swap",
    "type": "event"
  },
  // View functions
  {
    "constant": true,
    "inputs": [],
    "name": "token0",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "token1", 
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
];

// Token addresses for price calculation (all lowercase for subgraph compatibility)
const TOKEN_ADDRESSES = {
  WKLC: '0x069255299bb729399f3cecabdc73d15d3d10a2a3',
  USDT: '0x2ca775c77b922a51fcf3097f52bffdbc0250d99a',
  DAI: '0x6e92cac380f7a7b86f4163fad0df2f277b16edc6',
  USDC: '0x9cab0c396cf0f4325913f2269a0b72bd4d46e3a9'
};

interface SwapEvent {
  blockNumber: number;
  transactionHash: string;
  amount0In: ethers.BigNumber;
  amount1In: ethers.BigNumber;
  amount0Out: ethers.BigNumber;
  amount1Out: ethers.BigNumber;
  sender: string;
  to: string;
}

interface PairVolumeData {
  pairAddress: string;
  token0Address: string;
  token1Address: string;
  token0Symbol: string;
  token1Symbol: string;
  volume24hrToken0: string;
  volume24hrToken1: string;
  volume24hrUSD: string;
  swapCount: number;
}

export class VolumeService {
  private provider: ethers.providers.Provider;

  constructor() {
    this.provider = getProvider();
  }

  /**
   * Get 24hr volume for a specific pair
   */
  async getPair24hrVolume(
    pairAddress: string,
    klcPriceUSD: number,
    token0Symbol?: string,
    token1Symbol?: string
  ): Promise<PairVolumeData> {
    // Normalize pair address to lowercase for consistency
    const normalizedPairAddress = pairAddress.toLowerCase();
    console.log(`\n=== Processing pair ${normalizedPairAddress} ===`);
    console.log(`Symbols: ${token0Symbol}/${token1Symbol}, KLC Price: $${klcPriceUSD}`);

    try {
      const pairContract = new ethers.Contract(normalizedPairAddress, PAIR_ABI, this.provider);

      // Get token addresses if symbols not provided
      let token0Address: string, token1Address: string;
      if (!token0Symbol || !token1Symbol) {
        [token0Address, token1Address] = await Promise.all([
          pairContract.token0(),
          pairContract.token1()
        ]);
      } else {
        token0Address = this.getTokenAddress(token0Symbol);
        token1Address = this.getTokenAddress(token1Symbol);
      }

      // Calculate 24 hours ago block range
      const currentBlock = await this.provider.getBlockNumber();
      const blocksIn24Hours = Math.floor(24 * 60 * 60 / 2); // KalyChain has 2 second block time
      const fromBlock = Math.max(0, currentBlock - blocksIn24Hours);

      console.log(`Block range: ${fromBlock} to ${currentBlock} (${blocksIn24Hours} blocks)`);

      // Query Swap events from last 24 hours
      const swapEvents = await this.getSwapEvents(pairContract, fromBlock, currentBlock);

      // Calculate total volume
      const { volume0, volume1 } = this.calculateVolumeFromEvents(swapEvents);

      // Convert to USD
      const volume24hrUSD = this.calculateVolumeUSD(
        volume0,
        volume1,
        token0Symbol || this.getTokenSymbol(token0Address),
        token1Symbol || this.getTokenSymbol(token1Address),
        klcPriceUSD
      );

      return {
        pairAddress: normalizedPairAddress,
        token0Address,
        token1Address,
        token0Symbol: token0Symbol || this.getTokenSymbol(token0Address),
        token1Symbol: token1Symbol || this.getTokenSymbol(token1Address),
        volume24hrToken0: volume0.toString(),
        volume24hrToken1: volume1.toString(),
        volume24hrUSD: volume24hrUSD.toFixed(2),
        swapCount: swapEvents.length
      };

    } catch (error) {
      console.error(`Error getting 24hr volume for pair ${pairAddress}:`, error);
      return {
        pairAddress: normalizedPairAddress,
        token0Address: '',
        token1Address: '',
        token0Symbol: token0Symbol || '',
        token1Symbol: token1Symbol || '',
        volume24hrToken0: '0',
        volume24hrToken1: '0',
        volume24hrUSD: '0.00',
        swapCount: 0
      };
    }
  }

  /**
   * Get 24hr volume for multiple pairs
   */
  async getMultiplePairs24hrVolume(
    pairs: Array<{ address: string; token0Symbol: string; token1Symbol: string }>,
    klcPriceUSD: number
  ): Promise<PairVolumeData[]> {
    const promises = pairs.map(pair => 
      this.getPair24hrVolume(pair.address, klcPriceUSD, pair.token0Symbol, pair.token1Symbol)
    );

    return Promise.all(promises);
  }

  /**
   * Get total 24hr volume across all pairs
   */
  async getTotal24hrVolume(
    pairs: Array<{ address: string; token0Symbol: string; token1Symbol: string }>,
    klcPriceUSD: number
  ): Promise<{ totalVolumeUSD: string; totalSwaps: number }> {
    const pairVolumes = await this.getMultiplePairs24hrVolume(pairs, klcPriceUSD);
    
    const totalVolumeUSD = pairVolumes.reduce((sum, pair) => {
      return sum + parseFloat(pair.volume24hrUSD);
    }, 0);

    const totalSwaps = pairVolumes.reduce((sum, pair) => {
      return sum + pair.swapCount;
    }, 0);

    return {
      totalVolumeUSD: totalVolumeUSD.toFixed(2),
      totalSwaps
    };
  }

  /**
   * Query Swap events from a pair contract
   */
  private async getSwapEvents(
    pairContract: ethers.Contract,
    fromBlock: number,
    toBlock: number
  ): Promise<SwapEvent[]> {
    try {
      const filter = pairContract.filters.Swap();
      const events = await pairContract.queryFilter(filter, fromBlock, toBlock);

      return events.map(event => ({
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        amount0In: event.args!.amount0In,
        amount1In: event.args!.amount1In,
        amount0Out: event.args!.amount0Out,
        amount1Out: event.args!.amount1Out,
        sender: event.args!.sender,
        to: event.args!.to
      }));
    } catch (error) {
      console.error('Error querying swap events:', error);
      return [];
    }
  }

  /**
   * Calculate total volume from swap events
   */
  private calculateVolumeFromEvents(events: SwapEvent[]): { volume0: ethers.BigNumber; volume1: ethers.BigNumber } {
    let volume0 = ethers.BigNumber.from(0);
    let volume1 = ethers.BigNumber.from(0);

    console.log(`Processing ${events.length} swap events...`);

    for (const event of events) {
      // For each swap, count both in and out amounts to get total volume
      // This represents the total amount of each token that flowed through the pair
      const token0Volume = event.amount0In.add(event.amount0Out);
      const token1Volume = event.amount1In.add(event.amount1Out);

      volume0 = volume0.add(token0Volume);
      volume1 = volume1.add(token1Volume);

      // Debug first few events
      if (events.indexOf(event) < 3) {
        console.log(`Event ${events.indexOf(event)}:`, {
          amount0In: event.amount0In.toString(),
          amount1In: event.amount1In.toString(),
          amount0Out: event.amount0Out.toString(),
          amount1Out: event.amount1Out.toString(),
          token0Volume: token0Volume.toString(),
          token1Volume: token1Volume.toString()
        });
      }
    }

    // Divide by 2 to avoid double counting (we added both in and out amounts)
    const finalVolume0 = volume0.div(2);
    const finalVolume1 = volume1.div(2);

    console.log('Volume calculation results:', {
      rawVolume0: volume0.toString(),
      rawVolume1: volume1.toString(),
      finalVolume0: finalVolume0.toString(),
      finalVolume1: finalVolume1.toString(),
      eventsProcessed: events.length
    });

    return {
      volume0: finalVolume0,
      volume1: finalVolume1
    };
  }

  /**
   * Convert token volumes to USD using the same logic as the admin panel
   */
  private calculateVolumeUSD(
    volume0: ethers.BigNumber,
    volume1: ethers.BigNumber,
    token0Symbol: string,
    token1Symbol: string,
    klcPriceUSD: number
  ): number {
    const volume0Formatted = parseFloat(ethers.utils.formatUnits(volume0, this.getTokenDecimals(token0Symbol)));
    const volume1Formatted = parseFloat(ethers.utils.formatUnits(volume1, this.getTokenDecimals(token1Symbol)));

    console.log('USD Conversion Debug:', {
      token0Symbol,
      token1Symbol,
      volume0Raw: volume0.toString(),
      volume1Raw: volume1.toString(),
      volume0Formatted,
      volume1Formatted,
      klcPriceUSD,
      token0Decimals: this.getTokenDecimals(token0Symbol),
      token1Decimals: this.getTokenDecimals(token1Symbol)
    });

    let usdValue = 0;

    // For pairs with stablecoins, ALWAYS use the stablecoin volume (not the other token)
    if (token0Symbol === 'USDT') {
      usdValue = volume0Formatted;
      console.log(`Using USDT (token0): ${volume0Formatted} = ${usdValue}`);
    } else if (token1Symbol === 'USDT') {
      usdValue = volume1Formatted;
      console.log(`Using USDT (token1): ${volume1Formatted} = ${usdValue}`);
    } else if (token0Symbol === 'DAI') {
      usdValue = volume0Formatted;
      console.log(`Using DAI (token0): ${volume0Formatted} = ${usdValue}`);
    } else if (token1Symbol === 'DAI') {
      usdValue = volume1Formatted;
      console.log(`Using DAI (token1): ${volume1Formatted} = ${usdValue}`);
    } else if (token0Symbol === 'USDC') {
      usdValue = volume0Formatted;
      console.log(`Using USDC (token0): ${volume0Formatted} = ${usdValue}`);
    } else if (token1Symbol === 'USDC') {
      usdValue = volume1Formatted;
      console.log(`Using USDC (token1): ${volume1Formatted} = ${usdValue}`);
    } else if (token0Symbol === 'WKLC') {
      usdValue = volume0Formatted * klcPriceUSD;
      console.log(`Using WKLC (token0): ${volume0Formatted} * ${klcPriceUSD} = ${usdValue}`);
    } else if (token1Symbol === 'WKLC') {
      usdValue = volume1Formatted * klcPriceUSD;
      console.log(`Using WKLC (token1): ${volume1Formatted} * ${klcPriceUSD} = ${usdValue}`);
    } else {
      console.log(`No pricing logic for ${token0Symbol}/${token1Symbol} pair`);
    }

    return usdValue;
  }

  /**
   * Get token address by symbol
   */
  private getTokenAddress(symbol: string): string {
    return TOKEN_ADDRESSES[symbol as keyof typeof TOKEN_ADDRESSES] || '';
  }

  /**
   * Get token symbol by address
   */
  private getTokenSymbol(address: string): string {
    const entries = Object.entries(TOKEN_ADDRESSES);
    const found = entries.find(([_, addr]) => addr.toLowerCase() === address.toLowerCase());
    return found ? found[0] : 'UNKNOWN';
  }

  /**
   * Get token decimals by symbol
   */
  private getTokenDecimals(symbol: string): number {
    switch (symbol) {
      case 'USDT':
      case 'USDC':
        return 6;
      case 'WBTC':
        return 8;
      case 'WKLC':
      case 'KLC':
      case 'DAI':
      case 'KSWAP':
      case 'CLISHA':
      case 'ETH':
      case 'BNB':
      case 'POL':
      default:
        return 18;
    }
  }
}

export const volumeService = new VolumeService();
