# Contract Interfaces

This directory contains TypeScript interfaces for interacting with smart contracts.

## Example Contract Interface

```typescript
import { ethers } from 'ethers';
import { getProvider } from '../providers';
import FactoryABI from '../abis/dex/Factory.json';

export class Factory {
  private contract: ethers.Contract;
  
  constructor(
    private address: string,
    private provider = getProvider()
  ) {
    this.contract = new ethers.Contract(
      address,
      FactoryABI,
      provider
    );
  }
  
  async getAllPairs(): Promise<string[]> {
    const pairCount = await this.contract.allPairsLength();
    const pairs: string[] = [];
    
    for (let i = 0; i < pairCount; i++) {
      const pairAddress = await this.contract.allPairs(i);
      pairs.push(pairAddress);
    }
    
    return pairs;
  }
  
  async getPair(token0: string, token1: string): Promise<string> {
    return this.contract.getPair(token0, token1);
  }
}
```
